const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function parseDigits(value) {
  const text = String(value).trim();
  return /^\d+$/.test(text) ? Number.parseInt(text, 10) : Number.NaN;
}

export function formatMoney(cents) {
  if (!Number.isFinite(cents)) return "—";
  return (
    "$" +
    (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

export function formatDate(yymmdd) {
  if (!/^\d{6}$/.test(yymmdd)) return yymmdd.trim() || "—";
  const year = Number(yymmdd.slice(0, 2));
  const month = Number(yymmdd.slice(2, 4));
  const day = Number(yymmdd.slice(4, 6));
  if (month < 1 || month > 12 || day < 1 || day > 31) return yymmdd;
  return `${MONTHS[month - 1]} ${day}, ${2000 + year}`;
}

export function formatTime(hhmm) {
  if (!/^\d{4}$/.test(hhmm)) return hhmm.trim() || "—";
  const hours = Number(hhmm.slice(0, 2));
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${hhmm.slice(2)} ${suffix}`;
}

export const padHash = (hash) => String(hash).padStart(10, "0");

export const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;
