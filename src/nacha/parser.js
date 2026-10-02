import { RECORD_LENGTH, extractFields, layoutFor, recordKind } from "./layouts.js";
import { describeTransactionCode } from "./reference.js";
import { parseDigits, plural } from "./format.js";
import { error, warning } from "./issues.js";

const BYTE_ORDER_MARK = 0xfeff;

export function splitRecords(text) {
  const issues = [];
  let source = String(text);
  if (source.charCodeAt(0) === BYTE_ORDER_MARK) source = source.slice(1);

  let lines = source.split(/\r\n|\n|\r/);
  while (lines.length && lines.at(-1).trim() === "") lines.pop();

  if (
    lines.length === 1 &&
    lines[0].length > RECORD_LENGTH &&
    lines[0].length % RECORD_LENGTH === 0
  ) {
    const joined = lines[0];
    lines = [];
    for (let i = 0; i < joined.length; i += RECORD_LENGTH) {
      lines.push(joined.slice(i, i + RECORD_LENGTH));
    }
    issues.push(warning("File has no line breaks; split into 94-character records."));
  }

  const records = [];
  let shortCount = 0;
  let longCount = 0;

  lines.forEach((text, index) => {
    const line = index + 1;
    if (text.trim() === "") {
      issues.push(warning("Blank line", line));
      return;
    }
    let raw = text;
    let lengthIssue = false;
    if (raw.length < RECORD_LENGTH) {
      shortCount++;
      raw = raw.padEnd(RECORD_LENGTH);
      lengthIssue = true;
    } else if (raw.length > RECORD_LENGTH) {
      if (raw.slice(RECORD_LENGTH).trim() !== "") {
        longCount++;
        lengthIssue = true;
      }
      raw = raw.slice(0, RECORD_LENGTH);
    }
    records.push({ line, raw, kind: recordKind(raw), secCode: null, lengthIssue });
  });

  if (shortCount) {
    issues.push(
      warning(
        `${plural(shortCount, "record")} ${shortCount === 1 ? "is" : "are"} shorter than 94 characters (padded with spaces to read).`,
      ),
    );
  }
  if (longCount) {
    issues.push(
      warning(
        `${plural(longCount, "record")} ${longCount === 1 ? "is" : "are"} longer than 94 characters (extra text ignored).`,
      ),
    );
  }

  return { records, issues };
}

export function assembleFile(records, issues = []) {
  const file = { header: null, control: null, batches: [], records, issues };
  let batch = null;
  let entry = null;
  let afterFileControl = false;

  for (const record of records) {
    if (record.kind === "filler") continue;
    const { line } = record;
    if (afterFileControl) issues.push(error("Record found after the file control record", line));

    record.secCode = batch ? batch.header.secCode : null;
    const fields = extractFields(record.raw, layoutFor(record));

    switch (record.kind) {
      case "fileHeader":
        if (file.header) {
          issues.push(error("Second file header record", line));
        } else {
          file.header = { ...fields, line };
          if (record !== records[0])
            issues.push(error("File header is not the first record", line));
        }
        break;

      case "batchHeader":
        if (batch) {
          issues.push(
            error(
              `Batch ${batch.header.batchNumber} has no batch control record before the next batch`,
              line,
            ),
          );
        }
        batch = { header: fields, control: null, line, entries: [], issues: [] };
        file.batches.push(batch);
        entry = null;
        break;

      case "entry":
        if (!batch) {
          issues.push(error("Entry outside of a batch", line));
          break;
        }
        entry = {
          ...fields,
          line,
          transaction: describeTransactionCode(fields.transactionCode),
          amountCents: parseDigits(fields.amount),
          routing: fields.rdfi + fields.checkDigit,
          addenda: [],
          issues: [],
          batch,
        };
        batch.entries.push(entry);
        break;

      case "addenda":
        if (!entry) {
          issues.push(error("Addenda record without a preceding entry", line));
          break;
        }
        entry.addenda.push({ ...fields, line });
        break;

      case "batchControl":
        if (!batch) {
          issues.push(error("Batch control record without a batch header", line));
          break;
        }
        batch.control = { ...fields, line };
        batch = null;
        entry = null;
        break;

      case "fileControl":
        if (batch) {
          issues.push(
            error(
              `Batch ${batch.header.batchNumber} was not closed before the file control record`,
              line,
            ),
          );
          batch = null;
        }
        if (file.control) issues.push(error("Second file control record", line));
        file.control = { ...fields, line };
        afterFileControl = true;
        break;

      default:
        issues.push(error(`Unknown record type "${record.raw[0]}"`, line));
    }
  }

  if (batch) issues.push(error(`Batch ${batch.header.batchNumber} has no batch control record`));
  if (!file.header) issues.push(error("No file header record (type 1)"));
  if (!file.control) issues.push(error("No file control record (type 9)"));

  return file;
}
