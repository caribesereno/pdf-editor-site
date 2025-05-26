
const uploadInput = document.getElementById('upload');
const dropZone = document.getElementById('drop-zone');
const fileQueue = document.getElementById('file-queue');
const mergeBtn = document.getElementById('merge-btn');

let files = [];

uploadInput.addEventListener('change', (e) => {
  for (const file of e.target.files) {
    files.push(file);
    displayFile(file);
  }
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.style.backgroundColor = '#e0e0e0';
});

dropZone.addEventListener('dragleave', () => {
  dropZone.style.backgroundColor = '#f9f9f9';
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.style.backgroundColor = '#f9f9f9';
  for (const file of e.dataTransfer.files) {
    if (file.type === 'application/pdf') {
      files.push(file);
      displayFile(file);
    }
  }
});

function displayFile(file) {
  const div = document.createElement('div');
  div.className = 'file-entry';
  div.draggable = true;
  div.textContent = file.name;
  fileQueue.appendChild(div);
}

mergeBtn.addEventListener('click', async () => {
  const { PDFDocument } = PDFLib;
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedPdfBytes = await mergedPdf.save();
  downloadBlob(mergedPdfBytes, 'merged.pdf', 'application/pdf');
});

function downloadBlob(data, filename, type) {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
