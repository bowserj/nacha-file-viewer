# NACHA File Viewer

A single-page viewer for NACHA-format ACH files.

- Shows originator, destination bank, creation date, credit and debit totals, batches and entries
- Decodes transaction codes, SEC codes, return (R) codes and notification of change (C) codes
- Verifies batch and file control totals, entry hash, entry counts, block count and routing check digits
- Raw record view with per-field decoding
- Copies entries as tab-separated rows for pasting into a spreadsheet
- Runs entirely in the browser; files are not uploaded or stored

## Usage

Open `nacha-viewer.html` in a browser, then choose, drag in, or paste an ACH file.

## Tests

```
node test/parser-test.js
```
