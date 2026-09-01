import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..");
const dataPath = path.join(repoRoot, "js", "data.js");
const catalogPath = path.join(repoRoot, "js", "catalog-images.js");
const source = fs.readFileSync(dataPath, "utf8");
const catalogSource = fs.readFileSync(catalogPath, "utf8");
const sandbox = { window: {} };

vm.runInNewContext(source, sandbox, { filename: dataPath });
vm.runInNewContext(catalogSource, sandbox, { filename: catalogPath });

const data = sandbox.window.LV8_SURVEY_DATA;
const catalogMedia = sandbox.window.LV8_CATALOG_IMAGES;
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

assert(data && Array.isArray(data.styles), "Survey data did not expose a styles array.");
assert(data && Array.isArray(data.archivedStyles), "Survey data did not expose an archived styles array.");
assert(data && Array.isArray(data.comparisons), "Survey data did not expose a comparisons array.");
assert(catalogMedia && typeof catalogMedia === "object", "Optimized image catalog was not generated.");

if (data?.styles && data?.comparisons && catalogMedia) {
  const catalogStyles = [...data.styles, ...(data.archivedStyles || [])];
  const activeStyles = data.styles.map((style) => ({ ...style, ...(catalogMedia[style.id] || {}) }));
  const styleIds = new Set(data.styles.map((style) => style.id));
  const styleCodes = new Set(data.styles.map((style) => style.code));
  const catalogIds = new Set(Object.keys(catalogMedia));
  const imagePaths = activeStyles.flatMap((style) => style.images || []);
  const thumbnailPaths = activeStyles.flatMap((style) => style.thumbnails || []);
  const galleryNames = new Set(imagePaths.map((imagePath) => imagePath.split("/").slice(0, 3).join("/")));
  const menCount = data.styles.filter((style) => style.audience === "men").length;
  const womenCount = data.styles.filter((style) => style.audience === "women").length;

  assert(data.styles.length === 23, `Expected 23 styles, found ${data.styles.length}.`);
  assert(data.comparisons.length === 7, `Expected 7 comparisons, found ${data.comparisons.length}.`);
  assert(menCount === 8, `Expected 8 men's styles, found ${menCount}.`);
  assert(womenCount === 15, `Expected 15 women's styles, found ${womenCount}.`);
  assert(styleIds.size === data.styles.length, "Style IDs are not unique.");
  assert(styleCodes.size === data.styles.length, "Style codes are not unique.");
  assert(new Set(catalogStyles.map((style) => style.id)).size === catalogStyles.length, "Active and archived style IDs are not unique.");
  assert(catalogIds.size === styleIds.size, `Expected ${styleIds.size} optimized galleries, found ${catalogIds.size}.`);
  assert([...styleIds].every((styleId) => catalogIds.has(styleId)), "One or more styles are missing from the optimized image catalog.");
  assert([...catalogIds].every((styleId) => styleIds.has(styleId)), "The optimized image catalog contains an unknown style.");
  assert(imagePaths.length === 129, `Expected 129 optimized image references, found ${imagePaths.length}.`);
  assert(thumbnailPaths.length === 129, `Expected 129 thumbnail references, found ${thumbnailPaths.length}.`);
  assert(galleryNames.size === 23, `Expected 23 referenced galleries, found ${galleryNames.size}.`);
  assert(styleIds.has("women-air-street-set"), "The restored Women6 collection is not published.");
  assert(imagePaths.some((imagePath) => imagePath.includes("/women6/")), "The Women6 gallery is not referenced.");
  assert(data.styles.findIndex((style) => style.id === "women-air-street-set") === data.styles.findIndex((style) => style.id === "women-piped-track-set") + 1, "Women6 is not positioned immediately after Women5.");
  assert(data.archivedStyles.some((style) => style.id === "women-city-track-set"), "The replaced W01 style is not preserved for historical results.");

  for (const style of activeStyles) {
    assert(style.images?.length > 0, `${style.id} has no images.`);
    assert(style.thumbnails?.length === style.images?.length, `${style.id} does not have one thumbnail per image.`);
    for (const imagePath of style.images || []) {
      const absolutePath = path.join(repoRoot, ...imagePath.split("/"));
      assert(fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile(), `Missing image: ${imagePath}`);
    }
    for (const imagePath of style.thumbnails || []) {
      const absolutePath = path.join(repoRoot, ...imagePath.split("/"));
      assert(fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile(), `Missing thumbnail: ${imagePath}`);
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

console.log("Collection data valid: 23 styles, 7 comparisons, 129 optimized images, and 129 thumbnails.");
