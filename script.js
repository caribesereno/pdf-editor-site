pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js";

let uploadedFiles = [];
let currentPdfBytes = null;
let currentPdfDoc = null;
let currentFileName = null;
let currentPage = 1;
let totalPages = 1;

const input = document.getElementById("upload");
const canvas = document.getElementById("pdf-canvas");
const ctx = canvas.getContext("2d");
const pageInput = document.getElementById("delete-page");
const pageControls = document.getElementById("page-controls");
const navButtons = document.getElementById("nav-buttons");
const pageNumDisplay = document.getElementById("page-num");
const pageCountDisplay = document.getElementById("page-count");
const deleteBtn = document.getElementById("delete-btn");
const downloadBtn = document.getElementById("download-btn");
const mergeBtn = document.getElementById("merge-btn");
const thumbnailStrip = document.getElementById("thumbnail-strip");

input.addEventListener("change", async (e) => {
  uploadedFiles = Array.from(e.target.files);
  if (uploadedFiles.length > 0) {
    await loadAndPreviewFile(uploadedFiles[0]);
  }
});

async function loadAndPreviewFile(file) {
  const buffer = await file.arrayBuffer();
  currentPdfBytes = buffer;
  currentPdfDoc = await PDFLib.PDFDocument.load(buffer);
  currentFileName = file.name;
  currentPage = 1;
  totalPages = currentPdfDoc.getPageCount();

  pageControls.style.display = "block";
  navButtons.style.display = "block";
  thumbnailStrip.style.display = "flex";

  pageInput.max = totalPages;
  pageCountDisplay.textContent = totalPages;

  await renderPage(currentPage);
  await renderThumbnails(currentPdfBytes);
}

async function renderPage(pageNum) {
  const pdf = await pdfjsLib.getDocument({ data: currentPdfBytes }).promise;
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1.5 });

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: ctx, viewport }).promise;
  currentPage = pageNum;
  pageNumDisplay.textContent = pageNum;
}

deleteBtn.onclick = async () => {
  const pageToDelete = parseInt(pageInput.value);
  if (pageToDelete < 1 || pageToDelete > totalPages) return;

  currentPdfDoc.removePage(pageToDelete - 1);
  currentPdfBytes = await currentPdfDoc.save();
  currentPdfDoc = await PDFLib.PDFDocument.load(currentPdfBytes);

  totalPages = currentPdfDoc.getPageCount();
  pageInput.max = totalPages;
  pageCountDisplay.textContent = totalPages;

  currentPage = Math.min(currentPage, totalPages);
  await renderPage(currentPage);
  await renderThumbnails(currentPdfBytes);
};

downloadBtn.onclick = async () => {
  const bytes = await currentPdfDoc.save();
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "edited.pdf";
  a.click();
  URL.revokeObjectURL(url);
};

mergeBtn.onclick = async () => {
  if (uploadedFiles.length < 2) {
    alert("Please upload at least 2 PDFs.");
    return;
  }

  const mergedPdf = await PDFLib.PDFDocument.create();
  for (const file of uploadedFiles) {
    const bytes = await file.arrayBuffer();
    const tempPdf = await PDFLib.PDFDocument.load(bytes);
    const pages = await mergedPdf.copyPages(tempPdf, tempPdf.getPageIndices());
    pages.forEach((page) => mergedPdf.addPage(page));
  }

  currentPdfBytes = await mergedPdf.save();
  currentPdfDoc = await PDFLib.PDFDocument.load(currentPdfBytes);
  totalPages = currentPdfDoc.getPageCount();
  currentPage = 1;

  pageInput.max = totalPages;
  pageCountDisplay.textContent = totalPages;
  await renderPage(currentPage);
  await renderThumbnails(currentPdfBytes);
};

async function renderThumbnails(pdfBytes) {
  thumbnailStrip.innerHTML = "";

  const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;

  for (let i = 0; i < pdf.numPages; i++) {
    const page = await pdf.getPage(i + 1);
    const viewport = page.getViewport({ scale: 0.3 });

    const thumbCanvas = document.createElement("canvas");
    const ctx = thumbCanvas.getContext("2d");
    thumbCanvas.width = viewport.width;
    thumbCanvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const wrapper = document.createElement("div");
    wrapper.className = "thumb";
    wrapper.setAttribute("data-index", i);
    wrapper.appendChild(thumbCanvas);
    wrapper.title = `Page ${i + 1}`;

    wrapper.onclick = () => {
      currentPage = i + 1;
      renderPage(currentPage);
    };

    thumbnailStrip.appendChild(wrapper);
  }

  Sortable.create(thumbnailStrip, {
    animation: 150,
    onEnd: async function () {
      const newOrder = Array.from(thumbnailStrip.children).map(div =>
        parseInt(div.getAttribute("data-index"))
      );

      const newPdf = await PDFLib.PDFDocument.create();
      const oldPdf = await PDFLib.PDFDocument.load(pdfBytes);

      for (let index of newOrder) {
        const [page] = await newPdf.copyPages(oldPdf, [index]);
        newPdf.addPage(page);
      }

      currentPdfBytes = await newPdf.save();
      currentPdfDoc = await PDFLib.PDFDocument.load(currentPdfBytes);
      totalPages = currentPdfDoc.getPageCount();

      // Always reset preview to new first page
      currentPage = 1;
      pageInput.max = totalPages;
      pageCountDisplay.textContent = totalPages;
      await renderPage(currentPage);
      await renderThumbnails(currentPdfBytes);
    }
  });
}

// Navigation buttons
prevBtn.onclick = () => {
  if (currentPage > 1) {
    currentPage -= 1;
    renderPage(currentPage);
  }
};

nextBtn.onclick = () => {
  if (currentPage < totalPages) {
    currentPage += 1;
    renderPage(currentPage);
  }
};

pageInput.oninput = () => {
  const page = parseInt(pageInput.value);
  if (!isNaN(page) && page >= 1 && page <= totalPages) {
    currentPage = page;
    renderPage(currentPage);
  }
};
