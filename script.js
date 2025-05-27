const uploadInput = document.getElementById('upload');
const dropZone = document.getElementById('drop-zone');
const fileList = document.getElementById('file-list');
const mergeBtn = document.getElementById('merge-btn');
const canvas = document.getElementById('pdf-canvas');
const ctx = canvas.getContext('2d');

const previewContainer = document.getElementById('preview-container');
const pageCountSpan = document.getElementById('page-count');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const goToPageInput = document.getElementById('go-to-page');
const deleteCurrentBtn = document.getElementById('delete-current-page');
const thumbnailsContainer = document.getElementById('thumbnails');
const downloadEditedBtn = document.getElementById('download-edited');

let pdfFiles = [];
let selectedFiles = new Set();
let pdfDoc = null;
let currentPage = 1;
let pageOrder = [];

uploadInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file && file.type === 'application/pdf') {
    addFile(file);
  }
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.style.backgroundColor = '#e0e0e0';
});

dropZone.addEventListener('dragleave', () => {
  dropZone.style.backgroundColor = '#fff';
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.style.backgroundColor = '#fff';
  const file = e.dataTransfer.files[0];
  if (file && file.type === 'application/pdf') {
    addFile(file);
  }
});

function addFile(file) {
  pdfFiles.push(file);
  renderFileList();
}

function renderFileList() {
  fileList.innerHTML = '';
  pdfFiles.forEach((file, index) => {
    const li = document.createElement('li');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'file-checkbox';
    checkbox.checked = selectedFiles.has(file);
    checkbox.onchange = () => {
      if (checkbox.checked) {
        selectedFiles.add(file);
      } else {
        selectedFiles.delete(file);
      }
    };

    const fileName = document.createElement('span');
    fileName.className = 'file-name';
    fileName.textContent = file.name;
    fileName.onclick = () => previewPDF(file);

    const actions = document.createElement('div');
    actions.className = 'action-buttons';

    const upBtn = document.createElement('button');
    upBtn.textContent = '↑';
    upBtn.onclick = () => moveFile(index, -1);

    const downBtn = document.createElement('button');
    downBtn.textContent = '↓';
    downBtn.onclick = () => moveFile(index, 1);

    actions.appendChild(upBtn);
    actions.appendChild(downBtn);

    li.appendChild(checkbox);
    li.appendChild(fileName);
    li.appendChild(actions);
    fileList.appendChild(li);
  });
}

function moveFile(currentIndex, direction) {
  const newIndex = currentIndex + direction;
  if (newIndex >= 0 && newIndex < pdfFiles.length) {
    const temp = pdfFiles[currentIndex];
    pdfFiles[currentIndex] = pdfFiles[newIndex];
    pdfFiles[newIndex] = temp;
    renderFileList();
  }
}

Sortable.create(fileList, {
  animation: 150,
  onEnd: (evt) => {
    const movedItem = pdfFiles.splice(evt.oldIndex, 1)[0];
    pdfFiles.splice(evt.newIndex, 0, movedItem);
    renderFileList();
  }
});

async function previewPDF(file) {
  const fileReader = new FileReader();
  fileReader.onload = async function () {
    const typedarray = new Uint8Array(this.result);
    pdfDoc = await pdfjsLib.getDocument({ data: typedarray }).promise;
    pageOrder = Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1);
    currentPage = 1;
    previewContainer.style.display = 'block';
    pageCountSpan.textContent = pageOrder.length;
    goToPageInput.max = pageOrder.length;
    renderPage(currentPage);
    renderThumbnails();
  };
  fileReader.readAsArrayBuffer(file);
}

async function renderPage(pageNum) {
  if (pageOrder.length === 0) return;
  const logicalPage = pageOrder[pageNum - 1];
  const page = await pdfDoc.getPage(logicalPage);
  const viewport = page.getViewport({ scale: 1.5 });

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({ canvasContext: ctx, viewport }).promise;

  goToPageInput.value = pageNum;
  document.querySelectorAll('.thumbnail-canvas').forEach((thumb, i) => {
    thumb.classList.toggle('active', i === pageNum - 1);
  });
}

prevPageBtn.onclick = () => {
  if (currentPage > 1) {
    currentPage--;
    renderPage(currentPage);
  }
};

nextPageBtn.onclick = () => {
  if (currentPage < pageOrder.length) {
    currentPage++;
    renderPage(currentPage);
  }
};

goToPageInput.onchange = () => {
  const page = parseInt(goToPageInput.value);
  if (page >= 1 && page <= pageOrder.length) {
    currentPage = page;
    renderPage(currentPage);
  }
};

deleteCurrentBtn.onclick = () => {
  if (pageOrder.length === 1) return alert("Can't delete last page.");
  pageOrder.splice(currentPage - 1, 1);
  currentPage = Math.min(currentPage, pageOrder.length);
  pageCountSpan.textContent = pageOrder.length;
  goToPageInput.max = pageOrder.length;
  renderThumbnails();
  renderPage(currentPage);
};

async function renderThumbnails() {
  thumbnailsContainer.innerHTML = '';

  for (let i = 0; i < pageOrder.length; i++) {
    const pageIndex = pageOrder[i];
    const page = await pdfDoc.getPage(pageIndex);
    const viewport = page.getViewport({ scale: 0.2 });

    const wrapper = document.createElement('div');
    wrapper.className = 'thumbnail-wrapper';

    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = viewport.width;
    thumbCanvas.height = viewport.height;
    thumbCanvas.className = 'thumbnail-canvas';

    const thumbCtx = thumbCanvas.getContext('2d');
    await page.render({ canvasContext: thumbCtx, viewport }).promise;

    thumbCanvas.onclick = () => {
      currentPage = i + 1;
      renderPage(currentPage);
    };

    const positionInput = document.createElement('input');
    positionInput.className = 'thumbnail-position';
    positionInput.type = 'number';
    positionInput.min = 1;
    positionInput.max = pageOrder.length;
    positionInput.value = i + 1;

    positionInput.onchange = () => {
      const newPos = parseInt(positionInput.value) - 1;
      if (newPos >= 0 && newPos < pageOrder.length && newPos !== i) {
        const moved = pageOrder.splice(i, 1)[0];
        pageOrder.splice(newPos, 0, moved);
        currentPage = newPos + 1;
        renderThumbnails();
        renderPage(currentPage);
      }
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';
    deleteBtn.className = 'delete-thumb';
    deleteBtn.onclick = () => {
      if (pageOrder.length === 1) return alert("Can't delete last page.");
      pageOrder.splice(i, 1);
      currentPage = Math.min(currentPage, pageOrder.length);
      pageCountSpan.textContent = pageOrder.length;
      goToPageInput.max = pageOrder.length;
      renderThumbnails();
      renderPage(currentPage);
    };

    wrapper.appendChild(thumbCanvas);
    wrapper.appendChild(positionInput);
    wrapper.appendChild(deleteBtn);
    thumbnailsContainer.appendChild(wrapper);
  }

  Sortable.create(thumbnailsContainer, {
    animation: 150,
    onEnd: (evt) => {
      const [moved] = pageOrder.splice(evt.oldIndex, 1);
      pageOrder.splice(evt.newIndex, 0, moved);
      currentPage = evt.newIndex + 1;
      renderThumbnails();
      renderPage(currentPage);
    }
  });
}

mergeBtn.onclick = async () => {
  if (selectedFiles.size < 2) {
    alert('Please select at least two PDF files to merge.');
    return;
  }

  const { PDFDocument } = PDFLib;
  const mergedPdf = await PDFDocument.create();

  for (const file of selectedFiles) {
    const arrayBuffer = await file.arrayBuffer();
    const tempPdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(tempPdf, tempPdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const blob = new Blob([await mergedPdf.save()], { type: 'application/pdf' });
  loadMergedPdf(blob);
};

async function loadMergedPdf(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  pageOrder = Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1);
  currentPage = 1;
  previewContainer.style.display = 'block';
  pageCountSpan.textContent = pageOrder.length;
  goToPageInput.max = pageOrder.length;
  renderPage(currentPage);
  renderThumbnails();
}

downloadEditedBtn.onclick = async () => {
  if (!pdfDoc || pageOrder.length === 0) return;

  const { PDFDocument } = PDFLib;
  const editedPdf = await PDFDocument.create();
  const originalBytes = await pdfDoc.getData();
  const originalPdf = await PDFDocument.load(originalBytes);

  for (let i = 0; i < pageOrder.length; i++) {
    const pageIndex = pageOrder[i] - 1;
    const [copied] = await editedPdf.copyPages(originalPdf, [pageIndex]);
    editedPdf.addPage(copied);
  }

  const blob = new Blob([await editedPdf.save()], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'edited.pdf';
  a.click();
  URL.revokeObjectURL(url);
};
