import { formatDate } from "../nacha/format.js";
import { entryMatches } from "./search.js";

const COLUMNS = [
  ["Batch", (entry, header) => header.batchNumber],
  ["Company", (entry, header) => header.companyName.trim()],
  ["SEC", (entry, header) => header.secCode],
  ["Description", (entry, header) => header.entryDescription.trim()],
  ["Effective date", (entry, header) => formatDate(header.effectiveDate)],
  ["Receiver", (entry) => entry.name.trim()],
  ["ID", (entry) => entry.identification.trim()],
  ["Tran code", (entry) => entry.transactionCode],
  ["Type", (entry) => entry.transaction.label],
  ["Routing", (entry) => entry.routing],
  ["Account", (entry) => entry.account.trim()],
  ["Amount", (entry) => (entry.amountCents / 100).toFixed(2)],
  ["Debit/Credit", (entry) => (entry.transaction.debit ? "Debit" : "Credit")],
  ["Trace", (entry) => entry.traceNumber],
  [
    "Addenda",
    (entry) =>
      entry.addenda
        .map(
          (addenda) =>
            `${addenda.reasonCode ? `${addenda.reasonCode} ` : ""}${addenda.information.trim()}`,
        )
        .join(" | "),
  ],
];

const cell = (value) => String(value).replace(/[\t\r\n]+/g, " ");

export function entriesToTsv(file, query) {
  const rows = [COLUMNS.map(([title]) => title)];
  for (const batch of file.batches) {
    for (const entry of batch.entries) {
      if (entryMatches(entry, query)) {
        rows.push(COLUMNS.map(([, value]) => value(entry, batch.header)));
      }
    }
  }
  return { text: rows.map((row) => row.map(cell).join("\t")).join("\n"), count: rows.length - 1 };
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {}
    textarea.remove();
    return copied;
  }
}
