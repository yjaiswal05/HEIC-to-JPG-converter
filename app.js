const singleInput = document.querySelector("#singleInput");
const bulkInput = document.querySelector("#bulkInput");
const dropzone = document.querySelector("#dropzone");
const qualityRange = document.querySelector("#qualityRange");
const qualityValue = document.querySelector("#qualityValue");
const queueCount = document.querySelector("#queueCount");
const convertedCount = document.querySelector("#convertedCount");
const resultsList = document.querySelector("#resultsList");
const emptyState = document.querySelector("#emptyState");
const clearButton = document.querySelector("#clearButton");
const downloadAllButton = document.querySelector("#downloadAllButton");
const downloadSelectedButton = document.querySelector("#downloadSelectedButton");
const offlineBadge = document.querySelector("#offlineBadge");

const state = {
  quality: Number(qualityRange.value) / 100,
  items: [],
};

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 KB";
  }

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const getBaseName = (filename) => filename.replace(/\.[^.]+$/, "");

const setOfflineBadge = (message, warning = false) => {
  offlineBadge.textContent = message;
  offlineBadge.classList.toggle("is-warning", warning);
};

const updateCounters = () => {
  const readyItems = state.items.filter((item) => item.status === "ready");
  const selectedReadyItems = readyItems.filter((item) => item.selected);

  queueCount.textContent = `${state.items.length} ${state.items.length === 1 ? "file" : "files"}`;
  convertedCount.textContent = `${readyItems.length} ready`;
  clearButton.disabled = state.items.length === 0;
  downloadAllButton.disabled = readyItems.length === 0;
  downloadSelectedButton.disabled = selectedReadyItems.length === 0;
  emptyState.hidden = state.items.length > 0;
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

const buildStatusClass = (status) => {
  if (status === "ready") {
    return "item-status is-ready";
  }

  if (status === "error") {
    return "item-status is-error";
  }

  return "item-status";
};

const renderList = () => {
  resultsList.innerHTML = "";

  for (const item of state.items) {
    const li = document.createElement("li");
    li.className = "result-item";

    const checkboxDisabled = item.status !== "ready" ? "disabled" : "";
    const checkboxChecked = item.selected ? "checked" : "";
    const sizeSummary = item.outputBlob
      ? `${formatBytes(item.inputFile.size)} -> ${formatBytes(item.outputBlob.size)}`
      : formatBytes(item.inputFile.size);

    li.innerHTML = `
      <label class="select-wrap">
        <input type="checkbox" data-role="select" data-id="${item.id}" ${checkboxChecked} ${checkboxDisabled}>
      </label>
      <div class="file-main">
        <h3 class="file-name">${item.outputName}</h3>
        <p class="file-meta">${sizeSummary}</p>
        <p class="${buildStatusClass(item.status)}">${item.message}</p>
      </div>
      <div class="item-actions">
        <button class="button ghost" type="button" data-role="retry" data-id="${item.id}" ${item.status === "processing" ? "disabled" : ""}>Reconvert</button>
        <button class="button primary" type="button" data-role="download" data-id="${item.id}" ${item.status !== "ready" ? "disabled" : ""}>Download JPG</button>
      </div>
    `;

    resultsList.append(li);
  }

  updateCounters();
};

const convertFile = async (item) => {
  item.status = "processing";
  item.message = "Converting locally...";
  item.outputBlob = null;
  item.selected = false;
  renderList();

  try {
    const result = await window.heic2any({
      blob: item.inputFile,
      toType: "image/jpeg",
      quality: state.quality,
    });

    const outputBlob = Array.isArray(result) ? result[0] : result;

    if (!(outputBlob instanceof Blob)) {
      throw new Error("The browser decoder did not return a JPG file.");
    }

    item.outputBlob = outputBlob;
    item.status = "ready";
    item.selected = true;
    item.message = "Ready to download.";
  } catch (error) {
    item.status = "error";
    item.selected = false;
    item.message = error instanceof Error ? error.message : "Conversion failed for this file.";
  }

  renderList();
};

const addFiles = async (fileList) => {
  const files = Array.from(fileList).filter((file) => /\.(heic|heif)$/i.test(file.name));

  if (files.length === 0) {
    setOfflineBadge("Please choose HEIC or HEIF files only.", true);
    return;
  }

  setOfflineBadge("Converting files locally in your browser.");

  const newItems = files.map((file) => ({
    id: crypto.randomUUID(),
    inputFile: file,
    outputName: `${getBaseName(file.name)}.jpg`,
    outputBlob: null,
    status: "queued",
    message: "Waiting to convert...",
    selected: false,
  }));

  state.items.unshift(...newItems);
  renderList();

  for (const item of newItems) {
    // Convert sequentially to keep the browser responsive during larger batches.
    await convertFile(item);
  }
};

const collectReadyItems = (selectedOnly = false) => {
  return state.items.filter((item) => item.status === "ready" && (!selectedOnly || item.selected));
};

const downloadZip = async (items, archiveName) => {
  if (items.length === 0) {
    return;
  }

  const zip = new window.JSZip();
  for (const item of items) {
    zip.file(item.outputName, item.outputBlob);
  }

  setOfflineBadge("Preparing ZIP archive locally...");
  const zipBlob = await zip.generateAsync({ type: "blob" });
  downloadBlob(zipBlob, archiveName);
  setOfflineBadge("ZIP downloaded. Files were processed locally only.");
};

const clearSession = () => {
  state.items.length = 0;
  renderList();
  setOfflineBadge("Session cleared. No images were stored.");
};

const refreshQuality = () => {
  const percent = Number(qualityRange.value);
  state.quality = percent / 100;
  qualityValue.textContent = `${percent}%`;
};

const installServiceWorker = async () => {
  if (!("serviceWorker" in navigator)) {
    setOfflineBadge("This browser can convert files, but offline caching is not available here.", true);
    return;
  }

  try {
    await navigator.serviceWorker.register("./service-worker.js");
    setOfflineBadge("Offline cache ready after the first load. No internet is needed afterward.");
  } catch {
    setOfflineBadge("Conversion still works, but offline caching could not be enabled.", true);
  }
};

singleInput.addEventListener("change", async (event) => {
  if (event.target.files?.length) {
    await addFiles(event.target.files);
    event.target.value = "";
  }
});

bulkInput.addEventListener("change", async (event) => {
  if (event.target.files?.length) {
    await addFiles(event.target.files);
    event.target.value = "";
  }
});

qualityRange.addEventListener("input", refreshQuality);
clearButton.addEventListener("click", clearSession);

downloadAllButton.addEventListener("click", async () => {
  await downloadZip(collectReadyItems(false), "converted-jpgs.zip");
});

downloadSelectedButton.addEventListener("click", async () => {
  await downloadZip(collectReadyItems(true), "selected-converted-jpgs.zip");
});

resultsList.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const itemId = target.dataset.id;
  if (!itemId) {
    return;
  }

  const item = state.items.find((entry) => entry.id === itemId);
  if (!item) {
    return;
  }

  if (target.dataset.role === "download" && item.outputBlob) {
    downloadBlob(item.outputBlob, item.outputName);
  }

  if (target.dataset.role === "retry") {
    await convertFile(item);
  }
});

resultsList.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.dataset.role !== "select") {
    return;
  }

  const item = state.items.find((entry) => entry.id === target.dataset.id);
  if (!item) {
    return;
  }

  item.selected = target.checked;
  updateCounters();
});

for (const eventName of ["dragenter", "dragover"]) {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add("is-dragging");
  });
}

for (const eventName of ["dragleave", "drop"]) {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove("is-dragging");
  });
}

dropzone.addEventListener("drop", async (event) => {
  if (event.dataTransfer?.files?.length) {
    await addFiles(event.dataTransfer.files);
  }
});

dropzone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    bulkInput.click();
  }
});

refreshQuality();
renderList();
installServiceWorker();
