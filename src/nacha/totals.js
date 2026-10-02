import { parseDigits } from "./format.js";

const amountOf = (entry) => (Number.isNaN(entry.amountCents) ? 0 : entry.amountCents);

export function batchTotals(batch) {
  const totals = { count: 0, hash: 0, debits: 0, credits: 0, hasDebits: false, hasCredits: false };
  for (const entry of batch.entries) {
    const amount = amountOf(entry);
    const moves = amount > 0 || entry.transaction.kind === "live";
    totals.count += 1 + entry.addenda.length;
    totals.hash += parseDigits(entry.rdfi) || 0;
    if (entry.transaction.debit) {
      totals.debits += amount;
      totals.hasDebits ||= moves;
    } else {
      totals.credits += amount;
      totals.hasCredits ||= moves;
    }
  }
  totals.hash %= 1e10;
  return totals;
}

export function fileTotals(batches) {
  const totals = { count: 0, hash: 0, debits: 0, credits: 0 };
  for (const { totals: batch } of batches) {
    totals.count += batch.count;
    totals.hash += batch.hash;
    totals.debits += batch.debits;
    totals.credits += batch.credits;
  }
  totals.hash %= 1e10;
  return totals;
}

export function fileSummary(file) {
  const summary = {
    entries: 0,
    credits: 0,
    debits: 0,
    creditCount: 0,
    debitCount: 0,
    prenotes: 0,
    returns: 0,
    notifications: 0,
  };
  for (const batch of file.batches) {
    for (const entry of batch.entries) {
      const amount = amountOf(entry);
      summary.entries++;
      if (entry.transaction.kind === "prenote") summary.prenotes++;
      if (entry.addenda.some((a) => a.addendaType === "99")) summary.returns++;
      if (entry.addenda.some((a) => a.addendaType === "98")) summary.notifications++;
      if (entry.transaction.debit) {
        summary.debits += amount;
        if (amount > 0) summary.debitCount++;
      } else {
        summary.credits += amount;
        if (amount > 0) summary.creditCount++;
      }
    }
  }
  return summary;
}
