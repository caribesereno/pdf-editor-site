// ✅ Base elements
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

// ✅ Split-related elements
const rangeInput = document.createElement('input');
rangeInput.id = 'range-split';
rangeInput.placeholder = 'e.g. 1-3,5,7';
rangeInput.style.marginTop = '20px';

const rangeBtn = document.createElement('button');
rangeBtn.textContent = '📎 Split by Range';
rangeBtn.onclick = splitByRange;

const splitSelectedBtn = document.createElement('button');
splitSelectedBtn.textContent = '📎 Split Selected Pages';
splitSelectedBtn.onclick = splitSelectedPages;

document.body.appendChild(rangeInput);
document.body.appendChild(rangeBtn);
document.body.appendChild(splitSelectedBtn);

let pdfFiles = [];
let selectedFiles = new Set();
let pdfDoc = null;
let currentPage = 1;
let pageOrder = [];
let selectedPages = new Set();

uploadInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file && file.type === 'application/pdf') addFile(file);
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.style.backgroundColor = '#e0e0e0';
});

dropZone.addEventListener('dragleave', () => dropZone.style.backgroundColor = '#fff');

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.style.backgroundColor = '#fff';
  const file = e.dataTransfer.files[0];
  if (file && file.type === 'application/pdf') addFile(file);
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
    checkbox.onchange = () => checkbox.checked ? selectedFiles.add(file) : selectedFiles.delete(file);
    
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

    actions.append(upBtn, downBtn, deleteBtn);
    li.append(checkbox, fileName, actions);
    fileList.appendChild(li);
  });
}

function moveFile(currentIndex, direction) {
  const newIndex = currentIndex + direction;
  if (newIndex >= 0 && newIndex < pdfFiles.length) {
    [pdfFiles[currentIndex], pdfFiles[newIndex]] = [pdfFiles[newIndex], pdfFiles[currentIndex]];
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
    selectedPages.clear();
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

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'page-checkbox';
    checkbox.checked = selectedPages.has(i + 1);
    checkbox.onchange = () => {
      checkbox.checked ? selectedPages.add(i + 1) : selectedPages.delete(i + 1);
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';
    deleteBtn.onclick = () => {
      if (pageOrder.length === 1) return alert("Can't delete last page.");
      pageOrder.splice(i, 1);
      currentPage = Math.min(currentPage, pageOrder.length);
      renderThumbnails();
      renderPage(currentPage);
    };

    wrapper.append(thumbCanvas, checkbox, deleteBtn);
    thumbnailsContainer.appendChild(wrapper);
  }
}

async function splitByRange() {
  const rangeStr = rangeInput.value;
  const ranges = parsePageRanges(rangeStr);
  if (!ranges.length) return alert('Invalid range input.');
  const { PDFDocument } = PDFLib;
  const newPdf = await PDFDocument.create();
  const originalBytes = await pdfDoc.getData();
  const loaded = await PDFDocument.load(originalBytes);

  for (let r of ranges) {
    const [copied] = await newPdf.copyPages(loaded, [r - 1]);
    newPdf.addPage(copied);
  }

  const blob = new Blob([await newPdf.save()], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'split-range.pdf';
  a.click();
  URL.revokeObjectURL(url);
}

async function splitSelectedPages() {
  if (selectedPages.size === 0) return alert('No pages selected.');
  const { PDFDocument } = PDFLib;
  const originalBytes = await pdfDoc.getData();
  const loaded = await PDFDocument.load(originalBytes);
  const pages = [...selectedPages].sort((a, b) => a - b);

  for (let p of pages) {
    const newPdf = await PDFDocument.create();
    const [copied] = await newPdf.copyPages(loaded, [p - 1]);
    newPdf.addPage(copied);
    const blob = new Blob([await newPdf.save()], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `page-${p}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

function parsePageRanges(str) {
  const nums = new Set();
  const parts = str.split(',');
  for (let part of parts) {
    if (part.includes('-')) {
      let [start, end] = part.split('-').map(Number);
      for (let i = start; i <= end; i++) nums.add(i);
    } else {
      nums.add(Number(part));
    }
  }
  return [...nums].filter(n => n > 0 && n <= pageOrder.length);
}
