window.pdfjsLib = window.pdfjsLib || window["pdfjs-dist/build/pdf"];
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js";

let uploadedFiles = [];
let currentPdfBytes = null;
let currentPdfDoc = null;
let currentFileName = null;
let currentPage = 1;
let totalPages = 1;

const input = document.getElementById("upload");
const dropZone = document.getElementById("drop-zone");
const fileQueue = document.getElementById("file-queue");
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

function addFiles(files) {
  for (const file of files) {
    if (!uploadedFiles.some(f => f.name === file.name && f.size === file.size)) {
      uploadedFiles.push(file);
    }
  }
  renderFileList();
  if (uploadedFiles.length === 1) loadAndPreviewFile(uploadedFiles[0]);
}

input.addEventListener("change", (e) => {
  addFiles(Array.from(e.target.files));
});

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.style.backgroundColor = "#eef";
});

dropZone.addEventListener("dragleave", () => {
  dropZone.style.backgroundColor = "#f9f9f9";
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.style.backgroundColor = "#f9f9f9";
  addFiles(Array.from(e.dataTransfer.files));
});

function renderFileList() {
  fileQueue.innerHTML = "";

  uploadedFiles.forEach((file, index) => {
    const entry = document.createElement("div");
    entry.className = "file-entry";
    entry.setAttribute("data-index", index);

    if (file.name === currentFileName) {
      entry.classList.add("active");
    }

    entry.innerHTML = `
      <span style="flex: 1; cursor: pointer;">${file.name}</span>
      <div class="file-actions">
        <button class="up" title="Move up">🔼</button>
        <button class="down" title="Move down">🔽</button>
        <button class="remove" title="Remove">❌</button>
      </div>
    `;

    entry.querySelector("span").onclick = () => loadAndPreviewFile(file);
    fileQueue.appendChild(entry);
  });

  assignFileActionButtons();

  if (uploadedFiles.length > 0) {
    if (!currentPdfBytes || !uploadedFiles.some(f => f.name === currentFileName)) {
      loadAndPreviewFile(uploadedFiles[0]);
    }
  } else {
    canvas.width = 0;
    canvas.height = 0;
    pageControls.style.display = "none";
    navButtons.style.display = "none";
    currentPdfBytes = null;
    currentPdfDoc = null;
    currentFileName = null;
  }
}

function assignFileActionButtons() {
  const entries = fileQueue.querySelectorAll(".file-entry");

  entries.forEach((entry, index) => {
    const upBtn = entry.querySelector(".up");
    const downBtn = entry.querySelector(".down");
    const removeBtn = entry.querySelector(".remove");

    upBtn.disabled = index === 0;
    downBtn.disabled = index === uploadedFiles.length - 1;

    upBtn.onclick = () => {
      if (index > 0) {
        [uploadedFiles[index], uploadedFiles[index - 1]] = [uploadedFiles[index - 1], uploadedFiles[index]];
        renderFileList();
      }
    };

    downBtn.onclick = () => {
      if (index < uploadedFiles.length - 1) {
        [uploadedFiles[index], uploadedFiles[index + 1]] = [uploadedFiles[index + 1], uploadedFiles[index]];
        renderFileList();
      }
    };

    removeBtn.onclick = () => {
      uploadedFiles.splice(index, 1);
      renderFileList();
    };
  });
}

Sortable.create(fileQueue, {
  animation: 150,
  onEnd: function () {
    const reordered = Array.from(fileQueue.children).map(entry => {
      const fileName = entry.querySelector("span").textContent;
      return uploadedFiles.find(f => f.name === fileName);
    });

    if (reordered.every(Boolean)) {
      uploadedFiles = reordered;
    }

    renderFileList();
  }
});

async function loadAndPreviewFile(file) {
  const buffer = await file.arrayBuffer();
  currentPdfBytes = buffer;
  currentPdfDoc = await PDFLib.PDFDocument.load(buffer);
  currentFileName = file.name;

  // Move file to top of list
  uploadedFiles = [file, ...uploadedFiles.filter(f => f.name !== file.name)];
  renderFileList();

  totalPages = currentPdfDoc.getPageCount();
  currentPage = 1;

  pageControls.style.display = "block";
  navButtons.style.display = "block";
  pageInput.max = totalPages;
  pageCountDisplay.textContent = totalPages;

  renderPage(currentPage);
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

prevBtn.onclick = () => {
  if (currentPage > 1) renderPage(currentPage - 1);
};
nextBtn.onclick = () => {
  if (currentPage < totalPages) renderPage(currentPage + 1);
};
pageInput.oninput = () => {
  const page = parseInt(pageInput.value);
  if (!isNaN(page)) renderPage(page);
};

deleteBtn.onclick = async () => {
  const pageToDelete = parseInt(pageInput.value);
  if (pageToDelete < 1 || pageToDelete > totalPages) return;

  currentPdfDoc.removePage(pageToDelete - 1);
  currentPdfBytes = await currentPdfDoc.save();
  currentPdfDoc = await PDFLib.PDFDocument.load(currentPdfBytes);

  totalPages = currentPdfDoc.getPageCount();
  pageInput.max = totalPages;
  pageCountDisplay.textContent = totalPages;
  renderPage(Math.min(currentPage, totalPages));
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
    pages.forEach(page => mergedPdf.addPage(page));
  }

  currentPdfBytes = await mergedPdf.save();
  currentPdfDoc = await PDFLib.PDFDocument.load(currentPdfBytes);
  currentFileName = "merged.pdf";

  totalPages = currentPdfDoc.getPageCount();
  currentPage = 1;

  pageControls.style.display = "block";
  navButtons.style.display = "block";
  pageInput.max = totalPages;
  pageCountDisplay.textContent = totalPages;

  renderPage(currentPage);
  alert("PDFs merged successfully!");
};
