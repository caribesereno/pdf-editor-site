
// script.js
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js";

let uploadedFiles = [];
let currentPdfBytes = null;
let currentPdfDoc = null;
let currentFileName = null;
let currentPage = 1;
let totalPages = 1;

const input = document.getElementById("upload");
const fileQueue = document.getElementById("file-queue");
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

// Handle uploads
input.addEventListener("change", (e) => {
  const files = Array.from(e.target.files);
  for (const file of files) {
    if (!uploadedFiles.some(f => f.name === file.name && f.size === file.size)) {
      uploadedFiles.push(file);
    }
  }
  renderFileList();
  if (uploadedFiles.length === 1) loadAndPreviewFile(uploadedFiles[0]);
});

function renderFileList() {
  fileQueue.innerHTML = "";
  uploadedFiles.forEach((file, index) => {
    const entry = document.createElement("div");
    entry.className = "file-entry";
    if (file.name === currentFileName) {
      entry.classList.add("active");
    }

    entry.innerHTML = `
      <span style="flex:1;cursor:pointer;">${file.name}</span>
      <div class="file-actions">
        <button class="up">🔼</button>
        <button class="down">🔽</button>
        <button class="remove">❌</button>
      </div>
    `;

    entry.querySelector("span").onclick = () => loadAndPreviewFile(file);
    entry.querySelector(".up").onclick = () => {
      if (index > 0) {
        [uploadedFiles[index], uploadedFiles[index - 1]] = [uploadedFiles[index - 1], uploadedFiles[index]];
        renderFileList();
      }
    };
    entry.querySelector(".down").onclick = () => {
      if (index < uploadedFiles.length - 1) {
        [uploadedFiles[index], uploadedFiles[index + 1]] = [uploadedFiles[index + 1], uploadedFiles[index]];
        renderFileList();
      }
    };
    entry.querySelector(".remove").onclick = () => {
      uploadedFiles.splice(index, 1);
      renderFileList();
    };

    fileQueue.appendChild(entry);
  });
}

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

  renderFileList();
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
  currentPage = 1;
  totalPages = currentPdfDoc.getPageCount();

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
      currentPage = 1;

      pageInput.max = totalPages;
      pageCountDisplay.textContent = totalPages;
      await renderPage(currentPage);
      await renderThumbnails(currentPdfBytes);
    }
  });
}

// Navigation
prevBtn.onclick = () => {
  if (currentPage > 1) {
    currentPage--;
    renderPage(currentPage);
  }
};

nextBtn.onclick = () => {
  if (currentPage < totalPages) {
    currentPage++;
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
