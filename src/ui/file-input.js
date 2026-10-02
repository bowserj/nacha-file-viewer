import { byId } from "./dom.js";

const PASTED_NAME = "Pasted text";
const looksLikeNacha = (text) => /^1\d{2}/.test(text.trim());

function readFile(file, onLoad) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => onLoad(reader.result, file.name);
  reader.readAsText(file);
}

function setupPicker(onLoad) {
  byId("fileInput").addEventListener("change", (event) => {
    readFile(event.target.files[0], onLoad);
    event.target.value = "";
  });
}

function setupDragAndDrop(onLoad) {
  const overlay = byId("drop");
  let depth = 0;
  addEventListener("dragenter", (event) => {
    if ([...(event.dataTransfer?.types ?? [])].includes("Files")) {
      depth++;
      overlay.hidden = false;
    }
  });
  addEventListener("dragleave", () => {
    if (--depth <= 0) {
      depth = 0;
      overlay.hidden = true;
    }
  });
  addEventListener("dragover", (event) => event.preventDefault());
  addEventListener("drop", (event) => {
    event.preventDefault();
    depth = 0;
    overlay.hidden = true;
    readFile(event.dataTransfer.files[0], onLoad);
  });
}

function setupPasteBox(onLoad) {
  const box = byId("pasteBox");
  const area = byId("pasteArea");
  byId("pasteBtn").addEventListener("click", () => {
    box.hidden = false;
    area.focus();
  });
  byId("pasteCancel").addEventListener("click", () => {
    box.hidden = true;
  });
  byId("pasteLoad").addEventListener("click", () => {
    if (!area.value.trim()) return;
    onLoad(area.value, PASTED_NAME);
    box.hidden = true;
    area.value = "";
  });
}

function setupDocumentPaste(onLoad) {
  document.addEventListener("paste", (event) => {
    if (event.target.closest("input, textarea")) return;
    const text = event.clipboardData?.getData("text") ?? "";
    if (looksLikeNacha(text)) {
      event.preventDefault();
      onLoad(text, PASTED_NAME);
    }
  });
}

export function setupFileInput(onLoad) {
  setupPicker(onLoad);
  setupDragAndDrop(onLoad);
  setupPasteBox(onLoad);
  setupDocumentPaste(onLoad);
}
