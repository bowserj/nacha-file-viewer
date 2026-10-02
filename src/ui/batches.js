import {
  CHANGE_CODES,
  RETURN_CODES,
  ADDENDA_TYPES,
  SEC_CODES,
  SERVICE_CLASSES,
} from "../nacha/reference.js";
import { formatDate, formatMoney } from "../nacha/format.js";
import { isValidRouting } from "../nacha/routing.js";
import { isError } from "../nacha/issues.js";
import { escapeHtml, trimmed } from "./dom.js";
import { entryMatches } from "./search.js";

const findAddenda = (entry, type) => entry.addenda.find((addenda) => addenda.addendaType === type);

function entryTags(entry) {
  const tags = [];
  const returned = findAddenda(entry, "99");
  const notice = findAddenda(entry, "98");
  if (entry.transaction.kind === "prenote") tags.push('<span class="tag acc">Prenote</span>');
  if (entry.transaction.kind === "zero") tags.push('<span class="tag">Zero-dollar</span>');
  if (returned) tags.push(`<span class="tag bad">Return ${escapeHtml(returned.reasonCode)}</span>`);
  if (notice) tags.push(`<span class="tag warn">NOC ${escapeHtml(notice.reasonCode)}</span>`);
  if (entry.issues.some(isError)) tags.push('<span class="tag bad">Error</span>');
  else if (entry.issues.length) tags.push('<span class="tag warn">Check</span>');
  return tags.join("");
}

function addendaBlock(title, body) {
  return `<div class="a"><div class="t">${escapeHtml(title)}</div><div class="x">${escapeHtml(body)}</div></div>`;
}

function renderAddenda(addenda) {
  const information = addenda.information.trim();
  if (addenda.addendaType === "99") {
    const lines = [
      [
        `Original trace ${addenda.originalTrace}`,
        `Original RDFI ${addenda.originalRdfi}`,
        addenda.dateOfDeath.trim() && `Date of death ${formatDate(addenda.dateOfDeath)}`,
      ]
        .filter(Boolean)
        .join(" · "),
      information,
    ];
    return addendaBlock(
      `Return · ${addenda.reasonCode} ${RETURN_CODES[addenda.reasonCode] ?? "Unknown return code"}`,
      lines.filter(Boolean).join("\n"),
    );
  }
  if (addenda.addendaType === "98") {
    return addendaBlock(
      `Notification of change · ${addenda.reasonCode} ${CHANGE_CODES[addenda.reasonCode] ?? "Unknown change code"}`,
      `Corrected data: ${information}\nOriginal trace ${addenda.originalTrace}`,
    );
  }
  return addendaBlock(
    ADDENDA_TYPES[addenda.addendaType] ?? `Addenda type ${addenda.addendaType}`,
    information,
  );
}

function entryDetail(entry) {
  const details = [
    ["Transaction code", `${entry.transactionCode} · ${entry.transaction.label}`],
    [
      "Routing number",
      entry.routing + (isValidRouting(entry.routing) ? "" : "  (check digit fails)"),
    ],
    ["Account number", entry.account.trim()],
    ["Amount", formatMoney(entry.amountCents)],
    ["Identification", trimmed(entry.identification)],
    ["Trace number", entry.traceNumber],
    ["Discretionary data", trimmed(entry.discretionaryData)],
    ["File line", entry.line],
  ];
  const grid = details
    .map(
      ([label, value]) =>
        `<div><div class="k">${label}</div><div class="v">${escapeHtml(value)}</div></div>`,
    )
    .join("");
  const addenda = entry.addenda.length
    ? `<div class="addenda">${entry.addenda.map(renderAddenda).join("")}</div>`
    : "";
  const issues = entry.issues.length
    ? `<div class="eiss">${entry.issues.map((issue) => escapeHtml(issue.message)).join("<br>")}</div>`
    : "";
  return `<div class="kv">${grid}</div>${addenda}${issues}`;
}

function entryRow(entry, isOpen) {
  const debit = entry.transaction.debit;
  const addendaNote = entry.addenda.length ? ` · ${entry.addenda.length} addenda` : "";
  const row = `
    <tr class="e${isOpen ? " open" : ""}" data-line="${entry.line}" tabindex="0" aria-expanded="${isOpen}">
      <td>
        <div>${escapeHtml(entry.name.trim())}${entryTags(entry)}</div>
        <div class="sub">${escapeHtml(entry.identification.trim())}${addendaNote}</div>
      </td>
      <td>${escapeHtml(entry.transaction.label)}<div class="sub">Code ${escapeHtml(entry.transactionCode)}</div></td>
      <td class="mono">${escapeHtml(entry.routing)}</td>
      <td class="mono">${escapeHtml(entry.account.trim())}</td>
      <td class="amt r${debit ? " debit" : ""}">${debit ? "−" : ""}${formatMoney(entry.amountCents)}</td>
      <td class="mono">${escapeHtml(entry.traceNumber)}</td>
    </tr>`;
  const detail = isOpen ? `<tr class="detail"><td colspan="6">${entryDetail(entry)}</td></tr>` : "";
  return row + detail;
}

function controlsChip(batch) {
  const hasError = batch.issues.some(isError) || batch.entries.some((e) => e.issues.some(isError));
  const hasWarning = batch.issues.length || batch.entries.some((e) => e.issues.length);
  if (hasError) return '<span class="chip bad">Mismatch</span>';
  if (hasWarning) return '<span class="chip warn">Warnings</span>';
  return '<span class="chip ok">Balanced</span>';
}

function batchSection(batch, entries, openEntries) {
  const { header, totals } = batch;
  const secLabel = SEC_CODES[header.secCode];
  const descriptiveDate = header.descriptiveDate.trim()
    ? `<span>Descriptive date <b>${escapeHtml(header.descriptiveDate.trim())}</b></span>`
    : "";
  const rows =
    entries.map((entry) => entryRow(entry, openEntries.has(entry.line))).join("") ||
    '<tr><td colspan="6" class="empty">No entries in this batch</td></tr>';

  return `
    <section class="batch">
      <div class="bhead">
        <div class="left">
          <div class="eyebrow">
            Batch ${escapeHtml(header.batchNumber.replace(/^0+/, "") || "0")} ·
            ${escapeHtml(SERVICE_CLASSES[header.serviceClass] ?? `Service class ${header.serviceClass}`)}
          </div>
          <h3>${escapeHtml(header.companyName.trim())} · ${escapeHtml(header.entryDescription.trim())}</h3>
          <div class="bmeta">
            <span class="chip acc" title="${escapeHtml(secLabel ?? "")}">${escapeHtml(header.secCode)}</span>
            <span>${escapeHtml(secLabel ?? "Unrecognized SEC code")}</span>
            <span>Effective <b>${formatDate(header.effectiveDate)}</b></span>
            ${descriptiveDate}
            <span>Company ID <b class="mono">${escapeHtml(header.companyId.trim())}</b></span>
          </div>
        </div>
        <div class="btot">
          <div><span class="eyebrow">Credits</span><span class="amt">${formatMoney(totals.credits)}</span></div>
          <div><span class="eyebrow">Debits</span><span class="amt debit">${formatMoney(totals.debits)}</span></div>
          <div><span class="eyebrow">Entries</span><span class="amt">${batch.entries.length}</span></div>
          <div><span class="eyebrow">Controls</span>${controlsChip(batch)}</div>
        </div>
      </div>
      <div class="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Receiver</th><th>Type</th><th>Routing</th><th>Account</th>
              <th class="r">Amount</th><th>Trace</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>`;
}

export function renderBatches(file, { query, rawQuery, openEntries }) {
  if (!file.batches.length) {
    return '<div class="batch empty">No batches were found. Check that this is a NACHA-format ACH file (records start with 1, 5, 6, 7, 8, 9).</div>';
  }
  const sections = file.batches
    .map((batch) => {
      const entries = batch.entries.filter((entry) => entryMatches(entry, query));
      return query && !entries.length ? "" : batchSection(batch, entries, openEntries);
    })
    .filter(Boolean);
  return (
    sections.join("") ||
    `<div class="batch empty">No entries match “${escapeHtml(rawQuery)}”.</div>`
  );
}
