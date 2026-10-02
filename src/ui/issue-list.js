import { isError } from "../nacha/issues.js";
import { escapeHtml } from "./dom.js";
import { statusChip } from "./status.js";

const issueItem = (issue) => `
  <li>
    <span class="ln">${issue.line ? `line ${issue.line}` : ""}</span>
    <span class="lvl ${issue.level}">${issue.level}</span>
    <span>${escapeHtml(issue.message)}</span>
  </li>`;

export function renderIssueList(issues) {
  if (!issues.length) return "";
  return `
    <details class="issues"${issues.some(isError) ? " open" : ""}>
      <summary>${statusChip(issues)} <span>What the checks found</span></summary>
      <ul>${issues.map(issueItem).join("")}</ul>
    </details>`;
}
