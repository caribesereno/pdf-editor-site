const uploadInput = document.getElementById('upload');
const dropZone = document.getElementById('drop-zone');
const fileList = document.getElementById('file-list');
const canvas = document.getElementById('pdf-canvas');
const ctx = canvas.getContext('2d');

const previewContainer = document.getElementById('preview-container');
const pageNumSpan = document.getElementById('page-num');
const pageCountSpan = document.getElementById('page-count');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const thumbnailsContainer = document.getElementById('thumbnails');

let pdfFiles = [];
let pdfDoc = null;
let currentPage = 1;
let pageOrder = []; // Custom page order

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
    currentPage = 1;
    pageOrder = Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1);
    previewContainer.style.display = 'block';
    pageCountSpan.textContent = pdfDoc.numPages;
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

  pageNumSpan.textContent = pageNum;

  document.querySelectorAll('.thumbnail-canvas').forEach((thumb, i) => {
    thumb.classList.toggle('active', i === pageNum - 1);
  });
}

prevPageBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    renderPage(currentPage);
  }
});

nextPageBtn.addEventListener('click', () => {
  if (currentPage < pageOrder.length) {
    currentPage++;
    renderPage(currentPage);
  }
});

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
        renderThumbnails();
        renderPage(currentPage);
      }
    };

    wrapper.appendChild(thumbCanvas);
    wrapper.appendChild(positionInput);
    thumbnailsContainer.appendChild(wrapper);
  }

  // Enable drag and drop of thumbnails
  Sortable.create(thumbnailsContainer, {
    animation: 150,
    onEnd: (evt) => {
      const [moved] = pageOrder.splice(evt.oldIndex, 1);
      pageOrder.splice(evt.newIndex, 0, moved);
      renderThumbnails();
      renderPage(currentPage);
    }
  });
}
