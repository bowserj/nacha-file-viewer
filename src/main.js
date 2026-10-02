import { readNachaFile } from "./nacha/index.js";
import { byId } from "./ui/dom.js";
import { state, setView } from "./ui/state.js";
import { renderSummary } from "./ui/summary.js";
import { renderIssueList } from "./ui/issue-list.js";
import { renderBatches } from "./ui/batches.js";
import { renderInspector, renderRawView } from "./ui/raw.js";
import { normalizeQuery } from "./ui/search.js";
import { copyText, entriesToTsv } from "./ui/export.js";
import { setupFileInput } from "./ui/file-input.js";

const COPY_MESSAGE_MS = 4000;

function renderEntries() {
  byId("view").innerHTML = renderBatches(state.file, {
    query: normalizeQuery(state.query),
    rawQuery: state.query,
    openEntries: state.openEntries,
  });
}

function renderView() {
  byId("tabEntries").setAttribute("aria-selected", String(state.view === "entries"));
  byId("tabRaw").setAttribute("aria-selected", String(state.view === "raw"));
  byId("copyBtn").hidden = state.view !== "entries";
  if (state.view === "entries") renderEntries();
  else byId("view").innerHTML = renderRawView(state.file, state.selectedRecord);
}

function render() {
  byId("summary").innerHTML = renderSummary(state.file, state.fileName);
  byId("issues").innerHTML = renderIssueList(state.file.issues);
  renderView();
}

function load(text, fileName) {
  state.file = readNachaFile(text);
  state.fileName = fileName;
  state.openEntries.clear();
  state.selectedRecord = null;
  byId("landing").hidden = true;
  byId("summary").hidden = false;
  byId("bar").hidden = false;
  render();
}

function toggleEntry(row) {
  const line = Number(row.dataset.line);
  if (state.openEntries.has(line)) state.openEntries.delete(line);
  else state.openEntries.add(line);
  renderEntries();
}

function selectRecord(line) {
  document.querySelector(".rl.sel")?.classList.remove("sel");
  line.classList.add("sel");
  state.selectedRecord = Number(line.dataset.index);
  byId("inspector").innerHTML = renderInspector(state.file, state.selectedRecord);
}

async function copyEntries() {
  const { text, count } = entriesToTsv(state.file, normalizeQuery(state.query));
  const message = byId("copyMsg");
  message.textContent = (await copyText(text))
    ? `Copied ${count} rows. Paste into Excel.`
    : "Copy was blocked by the browser.";
  setTimeout(() => (message.textContent = ""), COPY_MESSAGE_MS);
}

byId("view").addEventListener("click", (event) => {
  const row = event.target.closest("tr.e");
  if (row) return toggleEntry(row);
  const line = event.target.closest(".rl");
  if (line) selectRecord(line);
});

byId("view").addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches("tr.e, .rl")) {
    event.preventDefault();
    event.target.click();
  }
});

byId("tabEntries").addEventListener("click", () => {
  setView("entries");
  renderView();
});

byId("tabRaw").addEventListener("click", () => {
  setView("raw");
  renderView();
});

byId("search").addEventListener("input", (event) => {
  state.query = event.target.value;
  if (state.view === "entries") renderEntries();
});

byId("copyBtn").addEventListener("click", copyEntries);

setupFileInput(load);
