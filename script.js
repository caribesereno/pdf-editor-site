let pdfDoc = null;
let pdfBytes = null;

document.getElementById('pdfUpload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const arrayBuffer = await file.arrayBuffer();
  pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
  pdfBytes = arrayBuffer;
  alert('PDF loaded!');
});

document.getElementById('addTextBtn').addEventListener('click', async () => {
  if (!pdfDoc) return alert('Upload a PDF first.');

  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();

  firstPage.drawText('Hello from your editor!', {
    x: 50,
    y: height - 50,
    size: 20,
    color: PDFLib.rgb(0, 0, 0),
  });

  alert('Text added to the first page!');
});

document.getElementById('downloadBtn').addEventListener('click', async () => {
  if (!pdfDoc) return alert('Upload and edit a PDF first.');

  const editedPdfBytes = await pdfDoc.save();
  const blob = new Blob([editedPdfBytes], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'edited.pdf';
  link.click();
});
