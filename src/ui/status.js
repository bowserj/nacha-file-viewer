import { plural } from "../nacha/format.js";
import { isError } from "../nacha/issues.js";

export function statusChip(issues) {
  const errors = issues.filter(isError).length;
  const warnings = issues.length - errors;
  if (errors) {
    const suffix = warnings ? ` · ${plural(warnings, "warning")}` : "";
    return `<span class="chip bad"><span class="dot"></span>${plural(errors, "error")}${suffix}</span>`;
  }
  if (warnings) {
    return `<span class="chip warn"><span class="dot"></span>Totals balance · ${plural(warnings, "warning")}</span>`;
  }
  return `<span class="chip ok"><span class="dot"></span>All control totals check out</span>`;
}
