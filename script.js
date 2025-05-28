// — element refs —
const uploadInput        = document.getElementById('upload');
const dropZone           = document.getElementById('drop-zone');
const fileList           = document.getElementById('file-list');
const mergeBtn           = document.getElementById('merge-btn');
const canvas             = document.getElementById('pdf-canvas');
const ctx                = canvas.getContext('2d');
const previewContainer   = document.getElementById('preview-container');
const pageCountSpan      = document.getElementById('page-count');
const prevPageBtn        = document.getElementById('prev-page');
const nextPageBtn        = document.getElementById('next-page');
const goToPageInput      = document.getElementById('go-to-page');
const deleteCurrentBtn   = document.getElementById('delete-current-page');
const downloadEditedBtn  = document.getElementById('download-edited');
const splitRangeBtn      = document.getElementById('split-range-btn');
const splitSelectedBtn   = document.getElementById('split-selected-btn');
const splitMultipleBtn   = document.getElementById('split-multiple-btn');
const pageRangeInput     = document.getElementById('page-range');
const thumbnailsContainer= document.getElementById('thumbnails');

// — state —
let pdfFiles      = [];
let selectedFiles = new Set();
let originalBytes = null;      // Uint8Array of last-loaded PDF
let pdfDoc        = null;      // PDF.js doc
let currentPage   = 1;
let pageOrder     = [];

// — utility: parse range strings into 1-based page numbers array —
function parsePageRanges(str, max) {
  const pages = new Set();
  str.split(',').forEach(token => {
    token = token.trim();
    if (!token) return;
    if (token.includes('-')) {
      const [a,b] = token.split('-').map(n=>parseInt(n,10));
      for (let i = Math.max(1,a); i <= Math.min(b,max); i++) pages.add(i);
    } else {
      const p = parseInt(token,10);
      if (p>=1 && p<=max) pages.add(p);
    }
  });
  return Array.from(pages).sort((a,b)=>a-b);
}

// — Add & render uploaded files —
function addFile(file) {
  pdfFiles.push(file);
  renderFileList();
}

function renderFileList() {
  fileList.innerHTML = '';
  pdfFiles.forEach((file, i) => {
    const li = document.createElement('li');

    // checkbox
    const cb = document.createElement('input');
    cb.type    = 'checkbox';
    cb.className = 'file-checkbox';
    cb.checked = selectedFiles.has(file);
    cb.onchange = () => {
      if (cb.checked) selectedFiles.add(file);
      else           selectedFiles.delete(file);
    };

    // filename (click to preview)
    const span = document.createElement('span');
    span.className = 'file-name';
    span.textContent = file.name;
    span.onclick = () => previewPDF(file);

    // up/down/delete buttons
    const actions = document.createElement('div');
    actions.className = 'action-buttons';
    ['↑', '↓', '🗑️'].forEach((sym, idx) => {
      const btn = document.createElement('button');
      btn.textContent = sym;
      btn.onclick = () => {
        if (idx === 0) return moveFile(i,-1);
        if (idx === 1) return moveFile(i, 1);
        // delete file
        selectedFiles.delete(file);
        pdfFiles.splice(i,1);
        renderFileList();
      };
      actions.appendChild(btn);
    });

    li.appendChild(cb);
    li.appendChild(span);
    li.appendChild(actions);
    fileList.appendChild(li);
  });
}

// reorder files
function moveFile(i, dir) {
  const j = i+dir;
  if (j<0||j>=pdfFiles.length) return;
  [pdfFiles[i],pdfFiles[j]] = [pdfFiles[j],pdfFiles[i]];
  renderFileList();
}

// — drag-drop reorder —
Sortable.create(fileList, {
  animation:150,
  onEnd:evt=>{
    const [m] = pdfFiles.splice(evt.oldIndex,1);
    pdfFiles.splice(evt.newIndex,0,m);
    renderFileList();
  }
});

// — preview & store bytes —
async function previewPDF(file) {
  const r = new FileReader();
  r.onload = async () => {
    const bytes = new Uint8Array(r.result);
    originalBytes = bytes;

    pdfDoc = await pdfjsLib.getDocument({ data: bytes }).promise;
    pageOrder = Array.from({length:pdfDoc.numPages},(_,i)=>i+1);
    currentPage = 1;
    previewContainer.style.display = 'block';
    pageCountSpan.textContent = pageOrder.length;
    goToPageInput.max = pageOrder.length;
    renderPage(currentPage);
    renderThumbnails();
  };
  r.readAsArrayBuffer(file);
}

// — render a single page —
async function renderPage(n) {
  if (!pdfDoc) return;
  const pg = await pdfDoc.getPage(pageOrder[n-1]);
  const vp = pg.getViewport({ scale:1.5 });
  canvas.height = vp.height;
  canvas.width  = vp.width;
  await pg.render({ canvasContext:ctx, viewport:vp }).promise;
  goToPageInput.value = n;
  document.querySelectorAll('.thumbnail-canvas')
    .forEach((c,i)=>c.classList.toggle('active', i===n-1));
}

// navigation
prevPageBtn.onclick = ()=>{ if(currentPage>1){currentPage--;renderPage(currentPage);} };
nextPageBtn.onclick = ()=>{ if(currentPage<pageOrder.length){currentPage++;renderPage(currentPage);} };
goToPageInput.onchange = ()=>{ const p=+goToPageInput.value; if(p>=1&&p<=pageOrder.length){currentPage=p;renderPage(p);} };

// delete current
deleteCurrentBtn.onclick = ()=>{
  if(pageOrder.length===1) return alert("Can't delete last page.");
  pageOrder.splice(currentPage-1,1);
  currentPage = Math.min(currentPage,pageOrder.length);
  pageCountSpan.textContent = pageOrder.length;
  goToPageInput.max = pageOrder.length;
  renderThumbnails();
  renderPage(currentPage);
};

// download edited
downloadEditedBtn.onclick = async ()=>{
  if(!originalBytes) return;
  const { PDFDocument } = PDFLib;
  const out = await PDFDocument.create();
  const src = await PDFDocument.load(originalBytes);
  const indices = pageOrder.map(n=>n-1);
  const copied = await out.copyPages(src, indices);
  copied.forEach(p=>out.addPage(p));
  const bytes = await out.save();
  const blob = new Blob([bytes],{type:'application/pdf'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url; a.download = 'edited.pdf'; a.click();
  URL.revokeObjectURL(url);
};

// — thumbnails with position-input, delete & selection checkbox —
async function renderThumbnails() {
  thumbnailsContainer.innerHTML = '';
  for(let i=0;i<pageOrder.length;i++){
    const idx = pageOrder[i];
    const pg  = await pdfDoc.getPage(idx);
    const vp  = pg.getViewport({ scale:0.2 });

    const w = document.createElement('div'); 
    w.className='thumbnail-wrapper';

    // manual-select checkbox
    const sel = document.createElement('input');
    sel.type = 'checkbox'; sel.className='thumb-select';

    // canvas
    const c = document.createElement('canvas');
    c.className='thumbnail-canvas';
    c.width  = vp.width;
    c.height = vp.height;
    await pg.render({ canvasContext:c.getContext('2d'), viewport:vp }).promise;
    c.onclick = ()=>{ currentPage=i+1; renderPage(currentPage); };

    // position input
    const pi = document.createElement('input');
    pi.type='number'; pi.className='thumbnail-position';
    pi.min='1'; pi.max=pageOrder.length; pi.value=(i+1);
    pi.onchange = ()=>{
      const np = parseInt(pi.value)-1;
      if(np>=0&&np<pageOrder.length&&np!==i){
        const m = pageOrder.splice(i,1)[0];
        pageOrder.splice(np,0,m);
        currentPage=np+1;
        renderThumbnails();
        renderPage(currentPage);
      }
    };

    // delete thumb
    const db = document.createElement('button');
    db.textContent = '🗑️'; db.className='delete-thumb';
    db.onclick = ()=>{
      if(pageOrder.length===1) return alert("Can't delete last page.");
      pageOrder.splice(i,1);
      currentPage = Math.min(currentPage,pageOrder.length);
      pageCountSpan.textContent=pageOrder.length;
      goToPageInput.max=pageOrder.length;
      renderThumbnails();
      renderPage(currentPage);
    };

    [sel,c,pi,db].forEach(el=>w.appendChild(el));
    thumbnailsContainer.appendChild(w);
  }

  Sortable.create(thumbnailsContainer, {
    animation:150,
    onEnd:evt=>{
      const [m] = pageOrder.splice(evt.oldIndex,1);
      pageOrder.splice(evt.newIndex,0,m);
      currentPage = evt.newIndex+1;
      renderThumbnails();
      renderPage(currentPage);
    }
  });
}

// — Merge selected PDFs, then preview merged —
mergeBtn.onclick = async ()=>{
  if(selectedFiles.size<2){
    return alert('Select at least two to merge.');
  }
  const { PDFDocument } = PDFLib;
  const out = await PDFDocument.create();
  for(const f of selectedFiles){
    const buf = await f.arrayBuffer();
    const tmp = await PDFDocument.load(buf);
    const pages = await out.copyPages(tmp, tmp.getPageIndices());
    pages.forEach(p=>out.addPage(p));
  }
  const bytes = await out.save();
  const blob  = new Blob([bytes], { type:'application/pdf' });
  // preview
  loadMergedPdf(blob);
};

// — loadMergedPdf now stores originalBytes too —
async function loadMergedPdf(blob){
  const ab = await blob.arrayBuffer();
  originalBytes = new Uint8Array(ab);
  pdfDoc = await pdfjsLib.getDocument({ data: originalBytes }).promise;
  pageOrder = Array.from({length:pdfDoc.numPages},(_,i)=>i+1);
  currentPage = 1;
  previewContainer.style.display='block';
  pageCountSpan.textContent = pageOrder.length;
  goToPageInput.max = pageOrder.length;
  renderPage(currentPage);
  renderThumbnails();
}

// — Phase 7: Split Range button —
splitRangeBtn.onclick = () => {
  const ranges = pageRangeInput.value.trim();
  if (!ranges) return alert('Enter a range first.');
  const pages = parsePageRanges(ranges, pageOrder.length);
  if (pages.length === 0) return alert('No valid pages.');
  createAndLoadPdf(pages);
};

// — Split Selected Pages button —
splitSelectedBtn.onclick = () => {
  const wrappers = [...thumbnailsContainer.children];
  const pages = wrappers
    .map((w,i)=> w.querySelector('.thumb-select').checked ? pageOrder[i] : null)
    .filter(n=>n);
  if (pages.length===0) return alert('Check at least one thumbnail.');
  createAndLoadPdf(pages);
};

// — Split Into Multiple PDFs button —
splitMultipleBtn.onclick = async () => {
  const wrappers = [...thumbnailsContainer.children];
  // gather selected indices
  const sel = wrappers
    .map((w,i)=> w.querySelector('.thumb-select').checked ? i+1 : null)
    .filter(n=>n);
  if (!sel.length) return alert('Select pages first.');
  // group into contiguous runs
  const groups = [];
  sel.sort((a,b)=>a-b).forEach(n=>{
    if (!groups.length || n - groups[groups.length-1].slice(-1)[0] > 1) {
      groups.push([n]);
    } else {
      groups[groups.length-1].push(n);
    }
  });
  // for each group, create & download
  const { PDFDocument } = PDFLib;
  const src = await PDFDocument.load(originalBytes);
  for (const grp of groups) {
    const out = await PDFDocument.create();
    const zeroIdx = grp.map(n=>pageOrder[n-1]-1);
    const pages = await out.copyPages(src, zeroIdx);
    pages.forEach(p=>out.addPage(p));
    const bytes = await out.save();
    const blob  = new Blob([bytes], { type:'application/pdf' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href      = url;
    a.download  = `split_${grp[0]}_to_${grp.slice(-1)[0]}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

// — drag-drop for upload area styling —
uploadInput.addEventListener('change', ()=> dropZone.style.backgroundColor='#fff');
dropZone.addEventListener('drop', ()=> dropZone.style.backgroundColor='#fff');
