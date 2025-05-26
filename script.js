import { mergePDFs } from './utils/pdfMerge.js';
import { deletePages } from './utils/pdfDelete.js';
import { splitPDF } from './utils/pdfSplit.js';
import { compressPDF } from './utils/pdfCompress.js';
import { editPDF } from './utils/pdfEdit.js';
import { signPDF } from './utils/pdfSign.js';

window.handleMerge = async () => {
  const input = document.getElementById('pdfUpload');
  const files = input.files;
  if (files.length < 2) return alert("Select at least 2 PDFs to merge.");

  const mergedBlob = await mergePDFs(files);
  downloadBlob(mergedBlob, 'merged.pdf');
};

window.handleDelete = async () => {
  const input = document.getElementById('pdfUpload');
  const file = input.files[0];
  if (!file) return alert("Select a PDF to delete pages from.");

  const deletedBlob = await deletePages(file, [0]); // Example: delete page 1
  downloadBlob(deletedBlob, 'deleted.pdf');
};

window.handleSplit = async () => {
  const input = document.getElementById('pdfUpload');
  const file = input.files[0];
  if (!file) return alert("Select a PDF to split.");

  const blobs = await splitPDF(file, [2, 4]); // Example: split after pages 2 and 4
  blobs.forEach((blob, i) => downloadBlob(blob, `split_part_${i + 1}.pdf`));
};

window.handleCompress = async () => {
  const input = document.getElementById('pdfUpload');
  const file = input.files[0];
  if (!file) return alert("Select a PDF to compress.");

  const blob = await compressPDF(file);
  downloadBlob(blob, 'compressed.pdf');
};

window.handleEdit = async () => {
  const input = document.getElementById('pdfUpload');
  const file = input.files[0];
  if (!file) return alert("Select a PDF to edit.");

  const blob = await editPDF(file);
  downloadBlob(blob, 'edited.pdf');
};

window.handleSign = async () => {
  const input = document.getElementById('pdfUpload');
  const file = input.files[0];
  if (!file) return alert("Select a PDF to sign.");

  const blob = await signPDF(file);
  downloadBlob(blob, 'signed.pdf');
};

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
