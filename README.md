# NACHA File Viewer

A browser-based viewer and validator for NACHA-format ACH files.

- Shows originator, destination bank, creation date, credit and debit totals, batches and entries
- Decodes transaction codes, SEC codes, return (R) codes and notification of change (C) codes
- Verifies batch and file control totals, entry hash, entry counts, block count and routing check digits
- Raw record view with per-field decoding
- Copies entries as tab-separated rows for pasting into a spreadsheet
- Runs entirely in the browser; files are not uploaded or stored

## Usage

```
npm install
npm run build
```

Open `dist/nacha-viewer.html` in a browser. It is a single self-contained file that can be copied anywhere.

For development, `npm start` serves the unbundled source at http://127.0.0.1:8080/.

## Scripts

| Command          | Description                          |
| ---------------- | ------------------------------------ |
| `npm start`      | Serve the source locally             |
| `npm run build`  | Bundle into `dist/nacha-viewer.html` |
| `npm test`       | Run the test suite                   |
| `npm run format` | Format all files with Prettier       |

## Structure

```
index.html            page markup
src/
  main.js             wires the UI to the parser
  styles.css
  nacha/              parsing and validation, no browser dependencies
    index.js          readNachaFile() and public exports
    parser.js         splits text into records and assembles batches and entries
    layouts.js        field positions for each record type
    rules.js          validation rules
    validate.js       runs the rules and computes totals
    totals.js
    reference.js      SEC, service class, transaction, return and change codes
    describe.js       human-readable descriptions for field formats
    routing.js        routing number check digits
    format.js
    issues.js
  ui/                 rendering and input handling
scripts/
  build.js            bundles the app into a single HTML file
  serve.js            local development server
test/
```

## Extending

The parser and validator are driven by registries that can be added to without changing the core code.

**Record layouts.** `LAYOUTS` in `src/nacha/layouts.js` maps a record kind to its fields. Entry layouts can be specialized per SEC code with an `entry:<SEC>` key (see `entry:CTX`), and addenda layouts per addenda type with an `addenda:<type>` key (see `addenda:99`).

**Validation rules.** `src/nacha/rules.js` exports `fileHeaderRules`, `entryRules`, `batchRules`, `batchControlRules` and `fileControlRules`. Each rule is a function that returns an issue created with `error()` or `warning()`, an array of issues, or a falsy value when the check passes.

**Field descriptions.** `FIELD_FORMATS` in `src/nacha/describe.js` maps a layout field's `format` to a function that explains its value in the raw record inspector.
