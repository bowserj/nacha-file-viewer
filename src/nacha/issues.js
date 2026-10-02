export const error = (message, line) => ({ level: "error", message, line });

export const warning = (message, line) => ({ level: "warning", message, line });

export const isError = (issue) => issue.level === "error";

export function sortIssues(issues) {
  return issues.sort(
    (a, b) => Number(!isError(a)) - Number(!isError(b)) || (a.line ?? 0) - (b.line ?? 0),
  );
}
