import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "dist", "nacha-viewer.html");

const STYLESHEET_TAG = '<link rel="stylesheet" href="src/styles.css" />';
const SCRIPT_TAG = '<script type="module" src="src/main.js"></script>';

const [html, css, bundle] = await Promise.all([
  readFile(join(root, "index.html"), "utf8"),
  readFile(join(root, "src", "styles.css"), "utf8"),
  build({
    entryPoints: [join(root, "src", "main.js")],
    bundle: true,
    format: "iife",
    charset: "utf8",
    write: false,
  }).then((result) => result.outputFiles[0].text),
]);

for (const tag of [STYLESHEET_TAG, SCRIPT_TAG]) {
  if (!html.includes(tag)) throw new Error(`index.html is missing ${tag}`);
}

const standalone = html
  .replace(STYLESHEET_TAG, () => `<style>\n${css}</style>`)
  .replace(SCRIPT_TAG, "")
  .replace("</body>", () => `<script>\n${bundle}</script>\n  </body>`);

await mkdir(dirname(output), { recursive: true });
await writeFile(output, standalone);
console.log(`Wrote ${output}`);
