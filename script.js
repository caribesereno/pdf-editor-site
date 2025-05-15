// Set up PDF.js worker
window.pdfjsLib = window.pdfjsLib || window["pdfjs-dist/build/pdf"];
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js";

// State variables
let currentPdfBytes = null;
let currentPdfDoc = null;
let currentPage = 1;
let totalPages = 1;
let uploadedFiles = [];

// DOM elements
const input = document.getElementById("upload");
const mergeBtn = document.getElementById("merge-btn");
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

// Handle file selection (but do NOT merge automatically)
input.addEventListener("change", (e) => {
  uploadedFiles = Array.from(e.target.files);
});

// Render a specific page
async function renderPage(pageNumber) {
  if (!currentPdfBytes || !pageNumber) {
    console.error("No PDF data or invalid page number.");
    return;
  }

  try {
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
  } catch (error) {
    console.error("Error rendering page:", error);
    alert("Something went wrong while rendering the PDF.");
  }
}

// Navigation buttons
prevBtn.addEventListener("click", () => {
  if (currentPage > 1) renderPage(currentPage - 1);
});

nextBtn.addEventListener("click", () => {
  if (currentPage < totalPages) renderPage(currentPage + 1);
});

// Direct page preview from input
pageInput.addEventListener("input", () => {
  const page = parseInt(pageInput.value);
  if (!isNaN(page)) renderPage(page);
});

// Delete selected page
deleteBtn.addEventListener("click", async () => {
  const pageToDelete = parseInt(pageInput.value);
  const total = currentPdfDoc.getPageCount();

  if (pageToDelete < 1 || pageToDelete > total) {
    alert("Invalid page number.");
    return;
  }

  currentPdfDoc.removePage(pageToDelete - 1);
  currentPdfBytes = await currentPdfDoc.save();
  currentPdfDoc = await PDFLib.PDFDocument.load(currentPdfBytes);

  totalPages = currentPdfDoc.getPageCount();
  pageInput.max = totalPages;
  pageCountDisplay.textContent = totalPages;

  alert(`Page ${pageToDelete} deleted.`);
  if (currentPage > totalPages) currentPage = totalPages;

  renderPage(currentPage || 1);
});

// Download PDF
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

// Merge PDFs
mergeBtn.addEventListener("click", async () => {
  if (uploadedFiles.length === 0) {
    alert("Please select at least one PDF file to merge.");
    return;
  }

  const mergedPdf = await PDFLib.PDFDocument.create();

  for (const file of uploadedFiles) {
    const bytes = await file.arrayBuffer();
    const tempPdf = await PDFLib.PDFDocument.load(bytes);
    const copiedPages = await mergedPdf.copyPages(tempPdf, tempPdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  currentPdfBytes = await mergedPdf.save();
  currentPdfDoc = await PDFLib.PDFDocument.load(currentPdfBytes);

  totalPages = currentPdfDoc.getPageCount();
  currentPage = 1;

  pageControls.style.display = "block";
  navButtons.style.display = "block";
  pageInput.max = totalPages;
  pageCountDisplay.textContent = totalPages;

  renderPage(currentPage);
  alert("PDFs merged successfully!");
});
