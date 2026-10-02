const fs = require("fs");
const path = require("path");

const htmlPath = path.join(__dirname, "..", "nacha-viewer.html");
const html = fs.readFileSync(htmlPath, "utf8");

const coreMatch = html.match(/<script id="core">([\s\S]*?)<\/script>/);
if (!coreMatch) {
  console.error('Could not find <script id="core"> in nacha-viewer.html');
  process.exit(1);
}
const loaded = { exports: {} };
new Function("module", coreMatch[1])(loaded);
const { parseNacha, checkDigit } = loaded.exports;

const uiScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("\n");
new Function(uiScripts);

const padRight = (value, width) => String(value).padEnd(width).slice(0, width);
const zeroPad = (value, width) => String(value).padStart(width, "0").slice(-width);

function buildFile(batchNumbers, amountTweakCents = 0) {
  const odfi = "11100061";
  const rdfi = "11100002";
  const lines = [];

  lines.push(
    "101 " +
      odfi +
      checkDigit(odfi) +
      "1234567890" +
      "261002" +
      "1415" +
      "A" +
      "094" +
      "10" +
      "1" +
      padRight("EXAMPLE BANK", 23) +
      padRight("EXAMPLE CO", 23) +
      padRight("", 8),
  );

  let entryCount = 0;
  let entryHash = 0;
  let totalCredits = 0;
  let traceSeq = 0;

  for (const batchNo of batchNumbers) {
    lines.push(
      "5" +
        "220" +
        padRight("EXAMPLE CO", 16) +
        padRight("", 20) +
        "1234567890" +
        "PPD" +
        padRight("PAYROLL", 10) +
        padRight("", 6) +
        "261003" +
        "   " +
        "1" +
        odfi +
        zeroPad(batchNo, 7),
    );
    traceSeq++;
    lines.push(
      "6" +
        "22" +
        rdfi +
        checkDigit(rdfi) +
        padRight("123456789", 17) +
        zeroPad(10000 + amountTweakCents, 10) +
        padRight("E1", 15) +
        padRight("DOE, JANE", 22) +
        "  " +
        "0" +
        odfi +
        zeroPad(traceSeq, 7),
    );
    lines.push(
      "8" +
        "220" +
        zeroPad(1, 6) +
        zeroPad(Number(rdfi), 10) +
        zeroPad(0, 12) +
        zeroPad(10000, 12) +
        "1234567890" +
        padRight("", 19) +
        padRight("", 6) +
        odfi +
        zeroPad(batchNo, 7),
    );
    entryCount++;
    entryHash += Number(rdfi);
    totalCredits += 10000;
  }

  const blockCount = Math.ceil((lines.length + 1) / 10);
  lines.push(
    "9" +
      zeroPad(batchNumbers.length, 6) +
      zeroPad(blockCount, 6) +
      zeroPad(entryCount, 8) +
      zeroPad(entryHash % 1e10, 10) +
      zeroPad(0, 12) +
      zeroPad(totalCredits, 12) +
      padRight("", 39),
  );
  while (lines.length % 10 !== 0) lines.push("9".repeat(94));
  return lines.join("\r\n");
}

let failures = 0;
function check(name, passed, detail) {
  console.log((passed ? "PASS  " : "FAIL  ") + name + (passed ? "" : "\n      " + detail));
  if (!passed) failures++;
}

const issuesOf = (text) => parseNacha(text).issues;

let issues = issuesOf(buildFile([0]));
check("single batch numbered 0000000 has no issues", issues.length === 0, JSON.stringify(issues));

issues = issuesOf(buildFile([0, 1]));
check("batches 0000000, 0000001 have no issues", issues.length === 0, JSON.stringify(issues));

issues = issuesOf(buildFile([2, 1]));
check(
  "out-of-order batches produce a warning",
  issues.length === 1 && issues[0].level === "warning" && /ascending/.test(issues[0].msg),
  JSON.stringify(issues),
);

issues = issuesOf(buildFile([0], 1));
check(
  "a 1-cent mismatch is caught at batch and file level",
  issues.filter((i) => i.level === "error").length === 2,
  JSON.stringify(issues),
);

issues = issuesOf("\uFEFF" + buildFile([0]));
check("a leading byte-order mark is ignored", issues.length === 0, JSON.stringify(issues));

issues = issuesOf(buildFile([0]).replace(/\r\n/g, ""));
check(
  "a file with no line breaks is split into records",
  issues.length === 1 && /no line breaks/.test(issues[0].msg),
  JSON.stringify(issues),
);

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
