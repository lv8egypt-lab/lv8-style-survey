import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..");
const dataPath = path.join(repoRoot, "js", "data.js");
const source = fs.readFileSync(dataPath, "utf8");
const sandbox = { window: {} };

vm.runInNewContext(source, sandbox, { filename: dataPath });

const data = sandbox.window.LV8_SURVEY_DATA;
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

assert(data && Array.isArray(data.styles), "Survey data did not expose a styles array.");
assert(data && Array.isArray(data.comparisons), "Survey data did not expose a comparisons array.");

if (data?.styles && data?.comparisons) {
  const styleIds = new Set(data.styles.map((style) => style.id));
  const styleCodes = new Set(data.styles.map((style) => style.code));
  const imagePaths = data.styles.flatMap((style) => style.images || []);
  const galleryNames = new Set(imagePaths.map((imagePath) => imagePath.split("/").slice(0, 3).join("/")));
  const menCount = data.styles.filter((style) => style.audience === "men").length;
  const womenCount = data.styles.filter((style) => style.audience === "women").length;

  assert(data.styles.length === 22, `Expected 22 styles, found ${data.styles.length}.`);
  assert(data.comparisons.length === 7, `Expected 7 comparisons, found ${data.comparisons.length}.`);
  assert(menCount === 8, `Expected 8 men's styles, found ${menCount}.`);
  assert(womenCount === 14, `Expected 14 women's styles, found ${womenCount}.`);
  assert(styleIds.size === data.styles.length, "Style IDs are not unique.");
  assert(styleCodes.size === data.styles.length, "Style codes are not unique.");
  assert(imagePaths.length === 132, `Expected 132 image references, found ${imagePaths.length}.`);
  assert(galleryNames.size === 22, `Expected 22 referenced galleries, found ${galleryNames.size}.`);
  assert(!styleIds.has("women-air-street-set"), "The removed Women6 collection is still published.");
  assert(!imagePaths.some((imagePath) => imagePath.includes("/women6/")), "A published image still points to Women6.");

  for (const style of data.styles) {
    assert(style.images?.length > 0, `${style.id} has no images.`);
    for (const imagePath of style.images || []) {
      const absolutePath = path.join(repoRoot, ...imagePath.split("/"));
      assert(fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile(), `Missing image: ${imagePath}`);
    }
  }

  for (const comparison of data.comparisons) {
    assert(comparison.options?.length >= 2, `${comparison.id} needs at least two options.`);
    for (const option of comparison.options || []) {
      assert(styleIds.has(option.styleId), `${comparison.id} references unknown style ${option.styleId}.`);
    }
  }
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log("Collection data valid: 22 styles, 7 comparisons, and 132 image references.");
