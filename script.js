import { mergePDFs } from './utils/pdfMerge.js';

let selectedFiles = [];

const input = document.getElementById('pdfUpload');

input.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file && file.type === 'application/pdf') {
    selectedFiles.push(file);
    updateFileList();
    input.value = ''; // allows re-upload of same file
  }
});

window.handleMerge = async () => {
  if (selectedFiles.length < 2) {
    alert("Please upload at least 2 PDFs.");
    return;
  }

  try {
    const mergedBlob = await mergePDFs(selectedFiles);
    const url = URL.createObjectURL(mergedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merged.pdf';
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Merge failed:", err);
    alert("There was an error merging the PDFs.");
  }
};

window.clearFiles = () => {
  selectedFiles = [];
  updateFileList();
};

function updateFileList() {
  const container = document.getElementById('previewContainer');
  container.innerHTML = '';

  if (selectedFiles.length === 0) {
    container.innerHTML = '<p>No files uploaded yet.</p>';
    return;
  }

  const ul = document.createElement('ul');
  selectedFiles.forEach((file, index) => {
    const li = document.createElement('li');
    li.textContent = `${index + 1}. ${file.name}`;
    ul.appendChild(li);
  });

  container.appendChild(ul);
}

// Placeholder for future buttons
window.handleReorder = () => alert("Reorder coming soon");
window.handleDelete = () => alert("Delete coming soon");
window.handleSplit = () => alert("Split coming soon");
window.handleCompress = () => alert("Compress coming soon");
window.handleEdit = () => alert("Edit coming soon");
window.handleSign = () => alert("Sign coming soon");
