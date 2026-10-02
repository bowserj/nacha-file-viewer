import { checkDigit } from "../../src/nacha/routing.js";

const ODFI = "11100061";
const RDFI = "11100002";
const COMPANY_ID = "1234567890";

export const padRight = (value, width) => String(value).padEnd(width).slice(0, width);
export const zeroPad = (value, width) => String(value).padStart(width, "0").slice(-width);

const isDebit = (transactionCode) => Number(String(transactionCode)[1]) >= 5;

export function returnAddenda(reasonCode, originalTrace = `${ODFI}0000001`) {
  return (
    "799" +
    reasonCode +
    zeroPad(originalTrace, 15) +
    padRight("", 6) +
    RDFI +
    padRight("", 44) +
    `${ODFI}0000099`
  );
}

export function buildAchFile({ batches = [{ number: 0 }], amountTweakCents = 0 } = {}) {
  const lines = [
    "101 " +
      ODFI +
      checkDigit(ODFI) +
      COMPANY_ID +
      "261002" +
      "1415" +
      "A" +
      "094" +
      "10" +
      "1" +
      padRight("EXAMPLE BANK", 23) +
      padRight("EXAMPLE CO", 23) +
      padRight("", 8),
  ];
  const fileTotals = { count: 0, hash: 0, debits: 0, credits: 0 };
  let trace = 0;

  for (const { number, serviceClass = "220", secCode = "PPD", entries = [{}] } of batches) {
    lines.push(
      "5" +
        serviceClass +
        padRight("EXAMPLE CO", 16) +
        padRight("", 20) +
        COMPANY_ID +
        secCode +
        padRight("PAYROLL", 10) +
        padRight("", 6) +
        "261003" +
        "   " +
        "1" +
        ODFI +
        zeroPad(number, 7),
    );
    const totals = { count: 0, hash: 0, debits: 0, credits: 0 };

    for (const { transactionCode = 22, amountCents = 10000, addenda = [] } of entries) {
      trace++;
      lines.push(
        "6" +
          transactionCode +
          RDFI +
          checkDigit(RDFI) +
          padRight("123456789", 17) +
          zeroPad(amountCents + amountTweakCents, 10) +
          padRight("E1", 15) +
          padRight("DOE, JANE", 22) +
          "  " +
          (addenda.length ? "1" : "0") +
          ODFI +
          zeroPad(trace, 7),
      );
      lines.push(...addenda.map((record) => padRight(record, 94)));
      totals.count += 1 + addenda.length;
      totals.hash += Number(RDFI);
      if (isDebit(transactionCode)) totals.debits += amountCents;
      else totals.credits += amountCents;
    }

    lines.push(
      "8" +
        serviceClass +
        zeroPad(totals.count, 6) +
        zeroPad(totals.hash, 10) +
        zeroPad(totals.debits, 12) +
        zeroPad(totals.credits, 12) +
        COMPANY_ID +
        padRight("", 19) +
        padRight("", 6) +
        ODFI +
        zeroPad(number, 7),
    );
    for (const key of Object.keys(fileTotals)) fileTotals[key] += totals[key];
  }

  lines.push(
    "9" +
      zeroPad(batches.length, 6) +
      zeroPad(Math.ceil((lines.length + 1) / 10), 6) +
      zeroPad(fileTotals.count, 8) +
      zeroPad(fileTotals.hash, 10) +
      zeroPad(fileTotals.debits, 12) +
      zeroPad(fileTotals.credits, 12) +
      padRight("", 39),
  );
  while (lines.length % 10 !== 0) lines.push("9".repeat(94));
  return lines.join("\r\n");
}
