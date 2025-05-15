let currentPdfBytes = null;
let currentPdfDoc = null;

const input = document.getElementById("upload");
const deleteBtn = document.getElementById("delete-btn");
const downloadBtn = document.getElementById("download-btn");
const pageInput = document.getElementById("delete-page");
const canvas = document.getElementById("pdf-canvas");
const ctx = canvas.getContext("2d");
const pageControls = document.getElementById("page-controls");

input.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (file && file.type === "application/pdf") {
    const arrayBuffer = await file.arrayBuffer();
    currentPdfBytes = arrayBuffer;
    currentPdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);

    pageControls.style.display = "block";
    renderPage(1); // Show first page
  }
});

async function renderPage(pageNumber) {
  const pdfjsLib = window["pdfjs-dist/build/pdf"];
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js";

  const loadingTask = pdfjsLib.getDocument({ data: currentPdfBytes });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.5 });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: ctx, viewport }).promise;
}

deleteBtn.addEventListener("click", async () => {
  const pageToDelete = parseInt(pageInput.value);
  const totalPages = currentPdfDoc.getPageCount();

  if (pageToDelete < 1 || pageToDelete > totalPages) {
    alert("Invalid page number.");
    return;
  }

  currentPdfDoc.removePage(pageToDelete - 1);
  currentPdfBytes = await currentPdfDoc.save();
  alert(`Page ${pageToDelete} deleted.`);
  renderPage(1);
});

downloadBtn.addEventListener("click", async () => {
  const editedPdfBytes = await currentPdfDoc.save();
  const blob = new Blob([editedPdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "edited.pdf";
  a.click();
  URL.revokeObjectURL(url);
});
