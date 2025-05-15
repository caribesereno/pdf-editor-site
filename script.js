let currentPdfBytes = null;
let currentPdfDoc = null;
let currentPage = 1;
let totalPages = 1;

const input = document.getElementById("upload");
const deleteBtn = document.getElementById("delete-btn");
const downloadBtn = document.getElementById("download-btn");
const pageInput = document.getElementById("delete-page");
const canvas = document.getElementById("pdf-canvas");
const ctx = canvas.getContext("2d");
const pageControls = document.getElementById("page-controls");

const navButtons = document.getElementById("nav-buttons");
const prevBtn = document.getElementById("prev-page");
const nextBtn = document.getElementById("next-page");
const pageNumDisplay = document.getElementById("page-num");
const pageCountDisplay = document.getElementById("page-count");

input.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (file && file.type === "application/pdf") {
    const arrayBuffer = await file.arrayBuffer();
    currentPdfBytes = arrayBuffer;
    currentPdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);

    totalPages = currentPdfDoc.getPageCount();
    currentPage = 1;

    pageControls.style.display = "block";
    navButtons.style.display = "block";
    pageInput.max = totalPages;
    pageCountDisplay.textContent = totalPages;

    renderPage(currentPage);
  }
});

async function renderPage(pageNumber) {
  const pdfjsLib = window["pdfjs-dist/build/pdf"];
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js";

  const loadingTask = pdfjsLib.getDocument({ data: currentPdfBytes });
  const pdf = await loadingTask.promise;

  if (pageNumber < 1 || pageNumber > pdf.numPages) {
    alert("Invalid page number.");
    return;
  }

  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.5 });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: ctx, viewport }).promise;

  currentPage = pageNumber;
  pageNumDisplay.textContent = currentPage;
}

prevBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    renderPage(currentPage - 1);
  }
});

nextBtn.addEventListener("click", () => {
  if (currentPage < totalPages) {
    renderPage(currentPage + 1);
  }
});

pageInput.addEventListener("input", () => {
  const page = parseInt(pageInput.value);
  if (!isNaN(page)) {
    renderPage(page);
  }
});

deleteBtn.addEventListener("click", async () => {
  const pageToDelete = parseInt(pageInput.value);
  const total = currentPdfDoc.getPageCount();

  if (pageToDelete < 1 || pageToDelete > total) {
    alert("Invalid page number.");
    return;
  }

  currentPdfDoc.removePage(pageToDelete - 1);
  currentPdfBytes = await currentPdfDoc.save();

  totalPages = currentPdfDoc.getPageCount();
  pageInput.max = totalPages;
  pageCountDisplay.textContent = totalPages;

  alert(`Page ${pageToDelete} deleted.`);

  if (currentPage > totalPages) currentPage = totalPages;
  renderPage(currentPage || 1);
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
