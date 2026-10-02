import { test } from "node:test";
import assert from "node:assert/strict";
import { readNachaFile } from "../src/nacha/index.js";
import { buildAchFile, returnAddenda } from "./helpers/ach-file.js";

const messages = (file) => file.issues.map((issue) => issue.message);

test("a single batch numbered 0000000 has no issues", () => {
  assert.deepEqual(messages(readNachaFile(buildAchFile({ batches: [{ number: 0 }] }))), []);
});

test("ascending batch numbers have no issues", () => {
  const file = readNachaFile(buildAchFile({ batches: [{ number: 0 }, { number: 1 }] }));
  assert.deepEqual(messages(file), []);
});

test("out-of-order batch numbers produce one warning", () => {
  const file = readNachaFile(buildAchFile({ batches: [{ number: 2 }, { number: 1 }] }));
  assert.equal(file.issues.length, 1);
  assert.equal(file.issues[0].level, "warning");
  assert.match(file.issues[0].message, /ascending/);
});

test("a 1-cent mismatch is caught at batch and file level", () => {
  const file = readNachaFile(buildAchFile({ amountTweakCents: 1 }));
  const errors = file.issues.filter((issue) => issue.level === "error");
  assert.equal(errors.length, 2);
  assert.match(errors[0].message, /Total credits say \$100\.00, entries add to \$100\.01/);
});

test("a leading byte-order mark is ignored", () => {
  const file = readNachaFile(String.fromCharCode(0xfeff) + buildAchFile());
  assert.deepEqual(messages(file), []);
});

test("a file with no line breaks is split into records", () => {
  const file = readNachaFile(buildAchFile().replace(/\r\n/g, ""));
  assert.equal(file.issues.length, 1);
  assert.match(file.issues[0].message, /no line breaks/);
});

test("summary totals credits and debits", () => {
  const file = readNachaFile(
    buildAchFile({
      batches: [
        {
          number: 1,
          serviceClass: "200",
          entries: [{ amountCents: 25000 }, { transactionCode: 27, amountCents: 4000 }],
        },
      ],
    }),
  );
  assert.deepEqual(messages(file), []);
  assert.equal(file.summary.credits, 25000);
  assert.equal(file.summary.debits, 4000);
  assert.equal(file.summary.entries, 2);
});

test("return addenda are attached to their entry and counted", () => {
  const file = readNachaFile(
    buildAchFile({
      batches: [{ number: 1, entries: [{ transactionCode: 21, addenda: [returnAddenda("R01")] }] }],
    }),
  );
  const [entry] = file.batches[0].entries;
  assert.deepEqual(messages(file), []);
  assert.equal(entry.addenda.length, 1);
  assert.equal(entry.addenda[0].reasonCode, "R01");
  assert.equal(file.summary.returns, 1);
});

test("debits in a credits-only batch are an error", () => {
  const file = readNachaFile(
    buildAchFile({ batches: [{ number: 1, entries: [{ transactionCode: 27 }] }] }),
  );
  assert.ok(file.issues.some((issue) => /220 \(credits only\) contains debit/.test(issue.message)));
});

test("missing file control is reported", () => {
  const text = buildAchFile()
    .split("\r\n")
    .filter((line) => !line.startsWith("9"))
    .join("\r\n");
  assert.ok(messages(readNachaFile(text)).includes("No file control record (type 9)"));
});
