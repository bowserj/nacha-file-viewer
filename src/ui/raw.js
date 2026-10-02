import { layoutFor } from "../nacha/layouts.js";
import { describeField } from "../nacha/describe.js";
import { ADDENDA_TYPES } from "../nacha/reference.js";
import { escapeHtml } from "./dom.js";

const KIND_TAGS = {
  fileHeader: "FH",
  batchHeader: "BH",
  entry: "ENT",
  addenda: "ADD",
  batchControl: "BC",
  fileControl: "FC",
  filler: "PAD",
  unknown: "?",
};

const KIND_NAMES = {
  fileHeader: "File header",
  batchHeader: "Batch header",
  entry: "Entry detail",
  addenda: "Addenda",
  batchControl: "Batch control",
  fileControl: "File control",
  filler: "Block filler",
  unknown: "Unknown record",
};

const LEGEND = [
  "FH file header",
  "BH batch header",
  "ENT entry",
  "ADD addenda",
  "BC batch control",
  "FC file control",
  "Hover a field for its name; click a line to decode it.",
];

const columns = ({ start, length }) => (length > 1 ? `${start}–${start + length - 1}` : `${start}`);
const fieldValue = (record, { start, length }) => record.raw.substr(start - 1, length);

function recordLine(record, index, selectedIndex) {
  const classes = [
    "rl",
    record.kind === "filler" && "pad",
    index === selectedIndex && "sel",
    record.lengthIssue && "bad",
  ]
    .filter(Boolean)
    .join(" ");
  const fields = layoutFor(record)
    .map(
      (field) =>
        `<span class="fd" title="${escapeHtml(field.label)} (${columns(field)})">${escapeHtml(fieldValue(record, field))}</span>`,
    )
    .join("");
  return `<div class="${classes}" data-index="${index}" tabindex="0"><span class="ln">${record.line}</span><span class="ty ${record.kind}">${KIND_TAGS[record.kind]}</span>${fields}</div>`;
}

export function renderInspector(file, selectedIndex) {
  if (selectedIndex == null) {
    return '<h3>Field inspector</h3><p class="mean">Click any record to see each field, its column positions and what it means.</p>';
  }
  const record = file.records[selectedIndex];
  const addendaName =
    record.kind === "addenda" ? ` · ${ADDENDA_TYPES[record.raw.substr(1, 2)] ?? ""}` : "";
  const rows = layoutFor(record)
    .map((field) => {
      const value = fieldValue(record, field);
      const meaning = describeField(field.format, value);
      return `
        <tr>
          <td class="pos">${columns(field)}</td>
          <td><div>${escapeHtml(field.label)}</div>${meaning ? `<div class="mean">${escapeHtml(meaning)}</div>` : ""}</td>
          <td class="val">${escapeHtml(value.trim() ? value.trimEnd() : "(blank)")}</td>
        </tr>`;
    })
    .join("");
  return `
    <h3>${escapeHtml(KIND_NAMES[record.kind] + addendaName)} <span class="mean">line ${record.line}</span></h3>
    <table><tbody>${rows}</tbody></table>`;
}

export function renderRawView(file, selectedIndex) {
  const lines = file.records
    .map((record, index) => recordLine(record, index, selectedIndex))
    .join("");
  return `
    <div class="rawgrid">
      <div class="rawcol">
        <div class="legend">${LEGEND.map((item) => `<span>${item}</span>`).join("")}</div>
        <div class="rawlist">${lines}</div>
      </div>
      <aside class="inspector" id="inspector">${renderInspector(file, selectedIndex)}</aside>
    </div>`;
}
