let pdfDoc = null;
let pageOrder = [];
let selectedPages = new Set();
const thumbnailContainer = document.getElementById('thumbnailContainer');

const fileInput = document.getElementById('pdfUpload');
const dropzone = document.getElementById('dropzone');

fileInput.addEventListener('change', async (e) => {
  await handlePDF(e.target.files[0]);
});

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', async (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  await handlePDF(e.dataTransfer.files[0]);
});

async function handlePDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  pdfDoc = pdf;
  pageOrder = Array.from({ length: pdf.numPages }, (_, i) => i);
  renderThumbnails();
}

async function renderThumbnails() {
  thumbnailContainer.innerHTML = '';
  for (let i = 0; i < pageOrder.length; i++) {
    const pageIndex = pageOrder[i];
    const page = await pdfDoc.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: 0.2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d');
    await page.render({ canvasContext: context, viewport: viewport }).promise;

    canvas.classList.add('thumbnail');
    canvas.setAttribute('draggable', true);
    canvas.dataset.index = pageIndex;

    canvas.addEventListener('click', () => {
      if (selectedPages.has(pageIndex)) {
        selectedPages.delete(pageIndex);
        canvas.classList.remove('selected');
      } else {
        selectedPages.add(pageIndex);
        canvas.classList.add('selected');
      }
    });

    canvas.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', i.toString());
    });

    canvas.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    canvas.addEventListener('drop', (e) => {
      e.preventDefault();
      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
      const toIndex = i;
      const [moved] = pageOrder.splice(fromIndex, 1);
      pageOrder.splice(toIndex, 0, moved);
      renderThumbnails();
    });

    thumbnailContainer.appendChild(canvas);
  }
}

window.exportReordered = async () => {
  const pdfLib = window.pdfLib;
  const newPdf = await pdfLib.PDFDocument.create();

  for (let index of pageOrder) {
    const page = await pdfDoc.getPage(index + 1);
    const originalBytes = await pdfDoc.getData();
    const tempDoc = await pdfLib.PDFDocument.load(originalBytes);
    const [copied] = await newPdf.copyPages(tempDoc, [index]);
    newPdf.addPage(copied);
  }

  const newBytes = await newPdf.save();
  const blob = new Blob([newBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'reordered.pdf';
  a.click();
  URL.revokeObjectURL(url);
};

window.deleteSelectedPages = () => {
  pageOrder = pageOrder.filter(index => !selectedPages.has(index));
  selectedPages.clear();
  renderThumbnails();
};
