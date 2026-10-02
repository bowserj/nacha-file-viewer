import { formatDate, formatMoney, formatTime, plural } from "../nacha/format.js";
import { escapeHtml, trimmed } from "./dom.js";
import { statusChip } from "./status.js";

const party = (label, value, detail) => `
  <div>
    <div class="eyebrow">${label}</div>
    <div class="v">${escapeHtml(value)}</div>
    <div class="s">${escapeHtml(detail)}</div>
  </div>`;

const stat = (label, value, detail, modifier = "") => `
  <div class="stat ${modifier}">
    <div class="eyebrow">${label}</div>
    <div class="big">${value}</div>
    <div class="s">${detail}</div>
  </div>`;

function entryBreakdown(summary) {
  const parts = [
    summary.prenotes && plural(summary.prenotes, "prenote"),
    summary.returns && plural(summary.returns, "return"),
    summary.notifications && plural(summary.notifications, "NOC"),
  ].filter(Boolean);
  return parts.join(" · ") || "No prenotes or returns";
}

export function renderSummary(file, fileName) {
  const header = file.header ?? {};
  const { summary, batches } = file;
  const created = header.creationDate
    ? `${formatDate(header.creationDate)} at ${formatTime(header.creationTime)}`
    : "—";
  const secCodes = [...new Set(batches.map((batch) => batch.header.secCode))].join(", ") || "—";

  return `
    <div class="sumhead">
      <div class="fname">${escapeHtml(fileName)}</div>
      ${statusChip(file.issues)}
    </div>
    <div class="parties">
      ${party("Originator", trimmed(header.originName), `ID ${trimmed(header.immediateOrigin)}`)}
      ${party("Sent to bank", trimmed(header.destinationName), `Routing ${trimmed(header.immediateDestination)}`)}
      ${party("Created", created, `File ID modifier ${trimmed(header.fileIdModifier)}`)}
    </div>
    <div class="stats">
      ${stat(
        "Total credits",
        formatMoney(summary.credits),
        `${plural(summary.creditCount, "payment")} into accounts`,
      )}
      ${stat(
        "Total debits",
        formatMoney(summary.debits),
        `${plural(summary.debitCount, "withdrawal")} from accounts`,
        "debit",
      )}
      ${stat("Entries", summary.entries.toLocaleString(), entryBreakdown(summary))}
      ${stat("Batches", batches.length, escapeHtml(secCodes))}
    </div>`;
}
