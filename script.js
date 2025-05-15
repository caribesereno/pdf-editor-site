window.pdfjsLib = window.pdfjsLib || window["pdfjs-dist/build/pdf"];
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js";

let currentPdfBytes = null;
let currentPdfDoc = null;
let currentPage = 1;
let totalPages = 1;
let uploadedFiles = [];

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

const fileList = document.getElementById("file-names");

input.addEventListener("change", async (e) => {
  const newFiles = Array.from(e.target.files);

  for (const file of newFiles) {
    if (!uploadedFiles.some(f => f.name === file.name && f.size === file.size)) {
      uploadedFiles.push(file);
    }
  }

  renderFileList();

  if (uploadedFiles.length === 1) {
    await loadAndPreviewFile(uploadedFiles[0]);
  }
});

function renderFileList() {
  fileList.innerHTML = "";

  uploadedFiles.forEach((file, index) => {
    const li = document.createElement("li");
    li.textContent = `${index + 1}. ${file.name}`;
    li.style.cursor = "pointer";
    li.style.padding = "5px";
    li.style.borderBottom = "1px solid #eee";

    li.addEventListener("click", async () => {
      await loadAndPreviewFile(file);
    });

    fileList.appendChild(li);
  });
}

async function loadAndPreviewFile(file) {
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

async function renderPage(pageNumber) {
  if (!currentPdfBytes || !pageNumber) return;

  try {
    const loadingTask = pdfjsLib.getDocument({ data: currentPdfBytes });
    const pdf = await loadingTask.promise;

    if (pageNumber < 1 || pageNumber > pdf.numPages) return;

    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.5 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;

    currentPage = pageNumber;
    pageNumDisplay.textContent = currentPage;
  } catch (err) {
    console.error("Render failed:", err);
  }
}

prevBtn.addEventListener("click", () => {
  if (currentPage > 1) renderPage(currentPage - 1);
});

nextBtn.addEventListener("click", () => {
  if (currentPage < totalPages) renderPage(currentPage + 1);
});

pageInput.addEventListener("input", () => {
  const page = parseInt(pageInput.value);
  if (!isNaN(page)) renderPage(page);
});

deleteBtn.addEventListener("click", async () => {
  const pageToDelete = parseInt(pageInput.value);
  const total = currentPdfDoc.getPageCount();

  if (pageToDelete < 1 || pageToDelete > total) return;

  currentPdfDoc.removePage(pageToDelete - 1);
  currentPdfBytes = await currentPdfDoc.save();
  currentPdfDoc = await PDFLib.PDFDocument.load(currentPdfBytes);

  totalPages = currentPdfDoc.getPageCount();
  pageInput.max = totalPages;
  pageCountDisplay.textContent = totalPages;

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

mergeBtn.addEventListener("click", async () => {
  if (uploadedFiles.length < 2) {
    alert("Select at least 2 PDFs to merge.");
    return;
  }

  const mergedPdf = await PDFLib.PDFDocument.create();

  for (const file of uploadedFiles) {
    const bytes = await file.arrayBuffer();
    const tempPdf = await PDFLib.PDFDocument.load(bytes);
    const copiedPages = await mergedPdf.copyPages(tempPdf, tempPdf.getPageIndices());
    copiedPages.forEach(page => mergedPdf.addPage(page));
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
