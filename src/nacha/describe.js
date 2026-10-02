import {
  ADDENDA_TYPES,
  CHANGE_CODES,
  RETURN_CODES,
  SEC_CODES,
  SERVICE_CLASSES,
  describeTransactionCode,
} from "./reference.js";
import { formatDate, formatMoney, formatTime, parseDigits } from "./format.js";
import { isValidRouting } from "./routing.js";

export const FIELD_FORMATS = {
  date: (value) => (/^\d{6}$/.test(value) ? formatDate(value) : ""),
  time: (value) => formatTime(value),
  money: (value) => formatMoney(parseDigits(value)),
  serviceClass: (value) => SERVICE_CLASSES[value] ?? "Unknown",
  secCode: (value) => SEC_CODES[value] ?? "Unrecognized",
  transactionCode: (value) => describeTransactionCode(value).label,
  returnCode: (value) => RETURN_CODES[value] ?? "",
  changeCode: (value) => CHANGE_CODES[value] ?? "",
  addendaType: (value) => ADDENDA_TYPES[value] ?? "",
  routing: (value) => (isValidRouting(value) ? "Valid routing number" : "Check digit fails"),
};

export function describeField(format, value) {
  const describe = FIELD_FORMATS[format];
  return describe ? describe(value.trim()) : "";
}
