import { formatMoney } from "../nacha/format.js";

function searchText(entry) {
  const { header } = entry.batch;
  return [
    entry.name,
    entry.identification,
    entry.traceNumber,
    entry.account.trim(),
    entry.routing,
    (entry.amountCents / 100).toFixed(2),
    formatMoney(entry.amountCents),
    entry.transaction.label,
    header.companyName,
    header.entryDescription,
    header.secCode,
    ...entry.addenda.map((addenda) => `${addenda.information} ${addenda.reasonCode ?? ""}`),
  ]
    .join(" ")
    .toLowerCase();
}

export function normalizeQuery(query) {
  return query.trim().toLowerCase();
}

export function entryMatches(entry, query) {
  if (!query) return true;
  const text = searchText(entry);
  return query
    .split(/\s+/)
    .every((word) => text.includes(word.replace(/[$,]/g, "")) || text.includes(word));
}
