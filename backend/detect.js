import "./env.js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runWorkflow, extractDetections } from "./roboflow.js";
import { runDefects, defectsToDetections } from "./defects.js";

const here = path.dirname(fileURLToPath(import.meta.url));

// Frames are read straight from the Vite project's public folder, so there is one copy.
// Road asset frames: public/images. Road defect frames: public/defects (next to it).
const ASSETS_DIR = path.resolve(here, process.env.IMAGES_DIR || "../public/images");
const DEFECTS_DIR = path.resolve(here, process.env.DEFECT_IMAGES_DIR || path.join(ASSETS_DIR, "..", "defects"));

const EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

// Each mode has its own images, its own saved results, and its own way of calling Roboflow.
// Asset results stay in server/cache (as before); defect results go in server/cache/defects.
const MODES = {
  assets: {
    dir: ASSETS_DIR,
    cacheDir: path.join(here, "cache"),
    run: async (base64) => extractDetections(await runWorkflow(base64)),
  },
  defects: {
    dir: DEFECTS_DIR,
    cacheDir: path.join(here, "cache", "defects"),
    run: async (base64, buffer) => defectsToDetections(await runDefects(base64), buffer),
  },
};

export const MODE_NAMES = Object.keys(MODES);

const fail = (status, message) => Object.assign(new Error(message), { status });

const getMode = (mode) => {
  const m = MODES[mode];
  if (!m) throw fail(400, `Unknown mode "${mode}". Use one of: ${MODE_NAMES.join(", ")}`);
  return m;
};

export async function listImages(mode = "assets") {
  const { dir } = getMode(mode);
  const files = await fs.readdir(dir);
  return files
    .filter((f) => EXTENSIONS.includes(path.extname(f).toLowerCase()))
    .map((f) => ({ id: path.parse(f).name, file: f }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

async function findImage(mode, id) {
  if (!/^[\w-]+$/.test(id)) throw fail(400, "Invalid image id");
  const { dir } = getMode(mode);
  let images;
  try {
    images = await listImages(mode);
  } catch {
    throw fail(500, `Cannot read images folder: ${dir}`);
  }
  const hit = images.find((i) => i.id === id);
  if (!hit) throw fail(404, `No image named "${id}" in ${dir}`);
  return path.join(dir, hit.file);
}

const readCache = async (mode, id) => {
  try {
    return JSON.parse(await fs.readFile(path.join(getMode(mode).cacheDir, `${id}.json`), "utf8"));
  } catch {
    return null;
  }
};

// A visitor's own photo: always a live call, never saved, and not affected by CACHE_ONLY
// (there is no saved result for a photo we have never seen).
export async function detectBuffer(mode, buffer) {
  const config = getMode(mode);
  return config.run(buffer.toString("base64"), buffer);
}

const inflight = new Map(); // "mode:id" -> promise, so two taps on the same frame make one API call

// Returns { detections, cached }. Uses the saved result unless `fresh` is true.
export function detectImage(mode, id, { fresh = false } = {}) {
  const config = getMode(mode);
  const jobKey = `${mode}:${id}`;
  if (inflight.has(jobKey)) return inflight.get(jobKey);

  const job = (async () => {
    if (!fresh) {
      const saved = await readCache(mode, id);
      if (saved) return { detections: saved, cached: true };
    }

    // CACHE_ONLY=1 makes the booth fully offline-safe: never call the API, only use saved results.
    if (process.env.CACHE_ONLY === "1") throw fail(503, `No saved result for "${id}" (CACHE_ONLY is on)`);

    const imagePath = await findImage(mode, id);
    const buffer = await fs.readFile(imagePath);
    const detections = await config.run(buffer.toString("base64"), buffer);

    await fs.mkdir(config.cacheDir, { recursive: true });
    await fs.writeFile(path.join(config.cacheDir, `${id}.json`), JSON.stringify(detections, null, 2));
    return { detections, cached: false };
  })().finally(() => inflight.delete(jobKey));

  inflight.set(jobKey, job);
  return job;
}