import {
  batchControlRules,
  batchRules,
  entryRules,
  fileControlRules,
  fileHeaderRules,
} from "./rules.js";
import { batchTotals, fileSummary, fileTotals } from "./totals.js";
import { parseDigits } from "./format.js";
import { sortIssues } from "./issues.js";

const runRules = (rules, ...args) =>
  rules.flatMap((rule) => [rule(...args)].flat().filter(Boolean));

export function validate(file) {
  const { issues } = file;

  if (file.header) issues.push(...runRules(fileHeaderRules, file.header));

  let previousBatchNumber = -1;
  for (const batch of file.batches) {
    batch.totals = batchTotals(batch);

    for (const entry of batch.entries) {
      entry.issues = runRules(entryRules, entry);
      issues.push(
        ...entry.issues.map((issue) => ({
          ...issue,
          message: `${issue.message} (entry: ${entry.name.trim()})`,
          line: entry.line,
        })),
      );
    }

    batch.issues = [
      ...runRules(batchRules, batch, { previousBatchNumber }),
      ...(batch.control ? runRules(batchControlRules, batch) : []),
    ];
    const label = `Batch ${batch.header.batchNumber.trim()} (${batch.header.companyName.trim()})`;
    issues.push(
      ...batch.issues.map((issue) => ({ ...issue, message: `${label}: ${issue.message}` })),
    );

    const number = parseDigits(batch.header.batchNumber);
    if (!Number.isNaN(number)) previousBatchNumber = number;
  }

  if (file.control) issues.push(...runRules(fileControlRules, file, fileTotals(file.batches)));

  file.summary = fileSummary(file);
  sortIssues(issues);
  return file;
}
