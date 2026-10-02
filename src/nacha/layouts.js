export const RECORD_LENGTH = 94;

const field = (key, start, length, label, format = null) => ({ key, start, length, label, format });
const recordType = field("recordType", 1, 1, "Record type");
const addendaType = field("addendaType", 2, 2, "Addenda type code", "addendaType");

export const LAYOUTS = {
  fileHeader: [
    recordType,
    field("priorityCode", 2, 2, "Priority code"),
    field("immediateDestination", 4, 10, "Immediate destination", "routing"),
    field("immediateOrigin", 14, 10, "Immediate origin"),
    field("creationDate", 24, 6, "File creation date", "date"),
    field("creationTime", 30, 4, "File creation time", "time"),
    field("fileIdModifier", 34, 1, "File ID modifier"),
    field("recordSize", 35, 3, "Record size"),
    field("blockingFactor", 38, 2, "Blocking factor"),
    field("formatCode", 40, 1, "Format code"),
    field("destinationName", 41, 23, "Immediate destination name"),
    field("originName", 64, 23, "Immediate origin name"),
    field("referenceCode", 87, 8, "Reference code"),
  ],
  batchHeader: [
    recordType,
    field("serviceClass", 2, 3, "Service class code", "serviceClass"),
    field("companyName", 5, 16, "Company name"),
    field("discretionaryData", 21, 20, "Company discretionary data"),
    field("companyId", 41, 10, "Company identification"),
    field("secCode", 51, 3, "Standard entry class", "secCode"),
    field("entryDescription", 54, 10, "Company entry description"),
    field("descriptiveDate", 64, 6, "Company descriptive date"),
    field("effectiveDate", 70, 6, "Effective entry date", "date"),
    field("settlementDate", 76, 3, "Settlement date (Julian, bank-filled)"),
    field("originatorStatus", 79, 1, "Originator status code"),
    field("odfi", 80, 8, "Originating DFI"),
    field("batchNumber", 88, 7, "Batch number"),
  ],
  entry: [
    recordType,
    field("transactionCode", 2, 2, "Transaction code", "transactionCode"),
    field("rdfi", 4, 8, "Receiving DFI"),
    field("checkDigit", 12, 1, "Check digit"),
    field("account", 13, 17, "DFI account number"),
    field("amount", 30, 10, "Amount", "money"),
    field("identification", 40, 15, "Identification number"),
    field("name", 55, 22, "Receiver name"),
    field("discretionaryData", 77, 2, "Discretionary data"),
    field("addendaIndicator", 79, 1, "Addenda record indicator"),
    field("traceNumber", 80, 15, "Trace number"),
  ],
  "entry:CTX": [
    recordType,
    field("transactionCode", 2, 2, "Transaction code", "transactionCode"),
    field("rdfi", 4, 8, "Receiving DFI"),
    field("checkDigit", 12, 1, "Check digit"),
    field("account", 13, 17, "DFI account number"),
    field("amount", 30, 10, "Amount", "money"),
    field("identification", 40, 15, "Identification number"),
    field("addendaCount", 55, 4, "Number of addenda records"),
    field("name", 59, 16, "Receiving company name"),
    field("reserved", 75, 2, "Reserved"),
    field("discretionaryData", 77, 2, "Discretionary data"),
    field("addendaIndicator", 79, 1, "Addenda record indicator"),
    field("traceNumber", 80, 15, "Trace number"),
  ],
  addenda: [recordType, addendaType, field("information", 4, 91, "Addenda data")],
  "addenda:05": [
    recordType,
    addendaType,
    field("information", 4, 80, "Payment related information"),
    field("sequence", 84, 4, "Addenda sequence number"),
    field("entrySequence", 88, 7, "Entry detail sequence number"),
  ],
  "addenda:98": [
    recordType,
    addendaType,
    field("reasonCode", 4, 3, "Change code", "changeCode"),
    field("originalTrace", 7, 15, "Original entry trace number"),
    field("reserved", 22, 6, "Reserved"),
    field("originalRdfi", 28, 8, "Original receiving DFI"),
    field("information", 36, 29, "Corrected data"),
    field("reserved2", 65, 15, "Reserved"),
    field("traceNumber", 80, 15, "Trace number"),
  ],
  "addenda:99": [
    recordType,
    addendaType,
    field("reasonCode", 4, 3, "Return reason code", "returnCode"),
    field("originalTrace", 7, 15, "Original entry trace number"),
    field("dateOfDeath", 22, 6, "Date of death", "date"),
    field("originalRdfi", 28, 8, "Original receiving DFI"),
    field("information", 36, 44, "Addenda information"),
    field("traceNumber", 80, 15, "Trace number"),
  ],
  batchControl: [
    recordType,
    field("serviceClass", 2, 3, "Service class code", "serviceClass"),
    field("entryAddendaCount", 5, 6, "Entry/addenda count"),
    field("entryHash", 11, 10, "Entry hash"),
    field("totalDebits", 21, 12, "Total debit amount", "money"),
    field("totalCredits", 33, 12, "Total credit amount", "money"),
    field("companyId", 45, 10, "Company identification"),
    field("messageAuthCode", 55, 19, "Message authentication code"),
    field("reserved", 74, 6, "Reserved"),
    field("odfi", 80, 8, "Originating DFI"),
    field("batchNumber", 88, 7, "Batch number"),
  ],
  fileControl: [
    recordType,
    field("batchCount", 2, 6, "Batch count"),
    field("blockCount", 8, 6, "Block count"),
    field("entryAddendaCount", 14, 8, "Entry/addenda count"),
    field("entryHash", 22, 10, "Entry hash"),
    field("totalDebits", 32, 12, "Total debit amount", "money"),
    field("totalCredits", 44, 12, "Total credit amount", "money"),
    field("reserved", 56, 39, "Reserved"),
  ],
  filler: [field("filler", 1, 94, "Block filler (all 9s)")],
  unknown: [field("raw", 1, 94, "Unrecognized record")],
};

const KIND_BY_TYPE = {
  1: "fileHeader",
  5: "batchHeader",
  6: "entry",
  7: "addenda",
  8: "batchControl",
  9: "fileControl",
};

export function recordKind(raw) {
  if (/^9{94}$/.test(raw)) return "filler";
  return KIND_BY_TYPE[raw[0]] ?? "unknown";
}

export function layoutFor(record) {
  if (record.kind === "entry") return LAYOUTS[`entry:${record.secCode}`] ?? LAYOUTS.entry;
  if (record.kind === "addenda")
    return LAYOUTS[`addenda:${record.raw.substr(1, 2)}`] ?? LAYOUTS.addenda;
  return LAYOUTS[record.kind];
}

export function extractFields(raw, layout) {
  return Object.fromEntries(
    layout.map(({ key, start, length }) => [key, raw.substr(start - 1, length)]),
  );
}
