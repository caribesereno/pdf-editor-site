const uploadInput = document.getElementById('upload');
const dropZone = document.getElementById('drop-zone');
const fileList = document.getElementById('file-list');

let pdfFiles = [];

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

  const li = document.createElement('li');
  li.textContent = file.name;
  fileList.appendChild(li);
}

// Make file list draggable
Sortable.create(fileList, {
  animation: 150
});
