import { assembleFile, splitRecords } from "./parser.js";
import { validate } from "./validate.js";

export function readNachaFile(text) {
  const { records, issues } = splitRecords(text);
  return validate(assembleFile(records, issues));
}

export { assembleFile, splitRecords } from "./parser.js";
export { validate } from "./validate.js";
export { LAYOUTS, layoutFor, extractFields } from "./layouts.js";
export * as rules from "./rules.js";
export { FIELD_FORMATS, describeField } from "./describe.js";
export * from "./reference.js";
export * from "./routing.js";
export * from "./format.js";
