window.pdfjsLib = window.pdfjsLib || window["pdfjs-dist/build/pdf"];
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js";

let uploadedFiles = [];
let currentPdfBytes = null;
let currentPdfDoc = null;
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

input.addEventListener("change", (e) => addFiles(Array.from(e.target.files)));

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.style.backgroundColor = "#eef
