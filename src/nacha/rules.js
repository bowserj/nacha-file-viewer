import { SEC_CODES, SERVICE_CLASSES } from "./reference.js";
import { checkDigit, isValidRouting } from "./routing.js";
import { formatMoney, padHash, parseDigits, plural } from "./format.js";
import { error, warning } from "./issues.js";

export const fileHeaderRules = [
  (header) =>
    header.recordSize !== "094" &&
    warning(`Record size field is "${header.recordSize}", expected 094`, header.line),
  (header) =>
    header.blockingFactor !== "10" &&
    warning(`Blocking factor is "${header.blockingFactor}", expected 10`, header.line),
  (header) =>
    !isValidRouting(header.immediateDestination.trim()) &&
    warning(
      `Immediate destination ${header.immediateDestination.trim()} fails the routing check digit`,
      header.line,
    ),
];

export const entryRules = [
  (entry) => !entry.transaction.valid && error(`Unknown transaction code ${entry.transactionCode}`),
  (entry) => Number.isNaN(entry.amountCents) && error(`Amount is not numeric: "${entry.amount}"`),
  (entry) => {
    if (!/^\d{8}$/.test(entry.rdfi)) return error("Receiving DFI is not 8 digits");
    const expected = String(checkDigit(entry.rdfi));
    return (
      expected !== entry.checkDigit &&
      warning(`Routing check digit should be ${expected}, file has ${entry.checkDigit}`)
    );
  },
  (entry) =>
    entry.transaction.kind === "prenote" &&
    entry.amountCents > 0 &&
    warning("Prenote has a non-zero amount"),
  (entry) => !/^\d{15}$/.test(entry.traceNumber) && warning("Trace number is not 15 digits"),
  (entry) =>
    entry.addendaIndicator === "1" &&
    entry.addenda.length === 0 &&
    warning("Addenda indicator is 1 but no addenda record follows"),
  (entry) =>
    entry.addendaIndicator === "0" &&
    entry.addenda.length > 0 &&
    warning("Addenda indicator is 0 but addenda records follow"),
];

export const batchRules = [
  ({ header, line }) =>
    !SERVICE_CLASSES[header.serviceClass] &&
    error(`Unknown service class code ${header.serviceClass}`, line),
  ({ header, line }, { previousBatchNumber }) => {
    const number = parseDigits(header.batchNumber);
    return (
      !Number.isNaN(number) &&
      number <= previousBatchNumber &&
      warning(`Batch number ${header.batchNumber} is not in ascending order`, line)
    );
  },
  ({ header, totals, line }) =>
    header.serviceClass === "220" &&
    totals.hasDebits &&
    error("Service class 220 (credits only) contains debit entries", line),
  ({ header, totals, line }) =>
    header.serviceClass === "225" &&
    totals.hasCredits &&
    error("Service class 225 (debits only) contains credit entries", line),
  ({ header, line }) =>
    !SEC_CODES[header.secCode] && warning(`Unrecognized SEC code "${header.secCode}"`, line),
  ({ entries, line }) => entries.length === 0 && warning("Batch has no entries", line),
];

export const batchControlRules = [
  ({ header, control }) =>
    control.serviceClass !== header.serviceClass &&
    error(
      `Batch control service class ${control.serviceClass} does not match header ${header.serviceClass}`,
      control.line,
    ),
  ({ header, control }) =>
    control.batchNumber !== header.batchNumber &&
    error(
      `Batch control number ${control.batchNumber} does not match header ${header.batchNumber}`,
      control.line,
    ),
  ({ header, control }) =>
    control.companyId !== header.companyId &&
    warning("Batch control company ID does not match header", control.line),
  ({ control, totals }) =>
    parseDigits(control.entryAddendaCount) !== totals.count &&
    error(
      `Entry/addenda count says ${parseDigits(control.entryAddendaCount)}, counted ${totals.count}`,
      control.line,
    ),
  ({ control, totals }) =>
    parseDigits(control.entryHash) !== totals.hash &&
    error(`Entry hash says ${control.entryHash}, calculated ${padHash(totals.hash)}`, control.line),
  ({ control, totals }) =>
    parseDigits(control.totalDebits) !== totals.debits &&
    error(
      `Total debits say ${formatMoney(parseDigits(control.totalDebits))}, entries add to ${formatMoney(totals.debits)}`,
      control.line,
    ),
  ({ control, totals }) =>
    parseDigits(control.totalCredits) !== totals.credits &&
    error(
      `Total credits say ${formatMoney(parseDigits(control.totalCredits))}, entries add to ${formatMoney(totals.credits)}`,
      control.line,
    ),
];

export const fileControlRules = [
  ({ control, batches }) =>
    parseDigits(control.batchCount) !== batches.length &&
    error(
      `File control batch count says ${parseDigits(control.batchCount)}, file has ${batches.length}`,
      control.line,
    ),
  ({ control }, totals) =>
    parseDigits(control.entryAddendaCount) !== totals.count &&
    error(
      `File control entry/addenda count says ${parseDigits(control.entryAddendaCount)}, counted ${totals.count}`,
      control.line,
    ),
  ({ control }, totals) =>
    parseDigits(control.entryHash) !== totals.hash &&
    error(
      `File control entry hash says ${control.entryHash}, calculated ${padHash(totals.hash)}`,
      control.line,
    ),
  ({ control }, totals) =>
    parseDigits(control.totalDebits) !== totals.debits &&
    error(
      `File control total debits say ${formatMoney(parseDigits(control.totalDebits))}, batches add to ${formatMoney(totals.debits)}`,
      control.line,
    ),
  ({ control }, totals) =>
    parseDigits(control.totalCredits) !== totals.credits &&
    error(
      `File control total credits say ${formatMoney(parseDigits(control.totalCredits))}, batches add to ${formatMoney(totals.credits)}`,
      control.line,
    ),
  ({ control, records }) => {
    const blocks = Math.ceil(records.length / 10);
    return (
      parseDigits(control.blockCount) !== blocks &&
      warning(
        `Block count says ${parseDigits(control.blockCount)}, file has ${plural(blocks, "block")} of 10 records`,
        control.line,
      )
    );
  },
  ({ records }) => {
    if (records.length % 10 === 0) return false;
    const filler = records.filter((record) => record.kind === "filler").length;
    return warning(
      `File is not padded to a multiple of 10 records (${records.length - filler} records, ${filler} filler)`,
    );
  },
];
