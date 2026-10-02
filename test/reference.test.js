import { test } from "node:test";
import assert from "node:assert/strict";
import { checkDigit, isValidRouting } from "../src/nacha/routing.js";
import { describeTransactionCode } from "../src/nacha/reference.js";
import { describeField } from "../src/nacha/describe.js";
import { formatDate, formatMoney, formatTime } from "../src/nacha/format.js";

test("routing check digits", () => {
  assert.equal(checkDigit("11100002"), 5);
  assert.equal(isValidRouting("111000025"), true);
  assert.equal(isValidRouting("111000026"), false);
  assert.equal(isValidRouting("12345"), false);
});

test("transaction codes", () => {
  assert.equal(describeTransactionCode("22").label, "Checking credit");
  assert.equal(describeTransactionCode("37").label, "Savings debit");
  assert.equal(describeTransactionCode("23").kind, "prenote");
  assert.equal(describeTransactionCode("26").label, "Checking return/NOC debit");
  assert.equal(describeTransactionCode("55").label, "Loan debit");
  assert.equal(describeTransactionCode("25").valid, false);
});

test("field descriptions", () => {
  assert.equal(describeField("returnCode", "R01"), "Insufficient funds");
  assert.equal(describeField("secCode", "PPD "), "Prearranged payment & deposit (consumer)");
  assert.equal(describeField("money", "0000012345"), "$123.45");
  assert.equal(describeField(null, "anything"), "");
});

test("formatting", () => {
  assert.equal(formatDate("261003"), "Oct 3, 2026");
  assert.equal(formatTime("1415"), "2:15 PM");
  assert.equal(formatTime("0005"), "12:05 AM");
  assert.equal(formatMoney(123456789), "$1,234,567.89");
});
