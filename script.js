// ✅ FULL UPDATED script.js including Phase 7 (PDF Splitting)

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
let originalBytes = null;

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

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';
    deleteBtn.onclick = () => {
      selectedFiles.delete(file);
      pdfFiles.splice(index, 1);
      renderFileList();
    };

    actions.appendChild(upBtn);
    actions.appendChild(downBtn);
    actions.appendChild(deleteBtn);

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
    originalBytes = typedarray;
    pdfDoc = await pdfjsLib.getDocument({ data: typedarray }).promise;
    pageOrder = Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1);
    currentPage = 1;
    previewContainer.style.display = 'block';
    pageCountSpan.textContent = pageOrder.length;
    goToPageInput.max = pageOrder.length;
    renderPage(currentPage);
    renderThumbnails();
    renderSplitControls(); // 🆕 NEW Split Controls
  };
  fileReader.readAsArrayBuffer(file);
}

function renderSplitControls() {
  let splitUI = document.getElementById('split-controls');
  if (!splitUI) {
    splitUI = document.createElement('div');
    splitUI.id = 'split-controls';
    splitUI.innerHTML = `
      <h4>🔪 Split PDF Options</h4>
      <input type="text" id="split-range" placeholder="e.g. 1-3,5,7-9" style="width: 300px;"/>
      <button onclick="splitByRange()">Split by Range</button>
      <br/><br/>
      <button onclick="splitByCheckbox(true)">Create one PDF from selected pages</button>
      <button onclick="splitByCheckbox(false)">Split into multiple PDFs (one per page)</button>
    `;
    previewContainer.appendChild(splitUI);
  }
}

async function splitByRange() {
  const rangeInput = document.getElementById('split-range').value;
  const ranges = parsePageRange(rangeInput);
  const { PDFDocument } = PDFLib;
  const originalPdf = await PDFDocument.load(originalBytes);
  const newPdf = await PDFDocument.create();
  for (const idx of ranges) {
    if (idx - 1 < originalPdf.getPageCount()) {
      const [copied] = await newPdf.copyPages(originalPdf, [idx - 1]);
      newPdf.addPage(copied);
    }
  }
  downloadBlob(await newPdf.save(), 'split-range.pdf');
}

function parsePageRange(str) {
  const parts = str.split(',');
  const pages = new Set();
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      for (let i = start; i <= end; i++) pages.add(i);
    } else {
      pages.add(Number(part));
    }
  }
  return Array.from(pages);
}

async function splitByCheckbox(mergeIntoOne) {
  const selectedIndices = Array.from(document.querySelectorAll('.thumb-split:checked')).map(c => parseInt(c.dataset.index));
  if (selectedIndices.length === 0) return alert('Please select at least one page.');

  const { PDFDocument } = PDFLib;
  const originalPdf = await PDFDocument.load(originalBytes);

  if (mergeIntoOne) {
    const newPdf = await PDFDocument.create();
    for (const idx of selectedIndices) {
      const [copied] = await newPdf.copyPages(originalPdf, [idx - 1]);
      newPdf.addPage(copied);
    }
    downloadBlob(await newPdf.save(), 'split-manual.pdf');
  } else {
    for (const idx of selectedIndices) {
      const newPdf = await PDFDocument.create();
      const [copied] = await newPdf.copyPages(originalPdf, [idx - 1]);
      newPdf.addPage(copied);
      downloadBlob(await newPdf.save(), `page-${idx}.pdf`);
    }
  }
}

function downloadBlob(buffer, filename) {
  const blob = new Blob([buffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
