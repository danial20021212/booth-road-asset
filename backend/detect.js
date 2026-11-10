import "./env.js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runWorkflow, extractDetections } from "./roboflow.js";

const here = path.dirname(fileURLToPath(import.meta.url));

// Frames are read straight from the Vite project's public/images folder, so there is one copy.
const IMAGES_DIR = path.resolve(here, process.env.IMAGES_DIR || "../public/images");
const CACHE_DIR = path.join(here, "cache");
const EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

const fail = (status, message) => Object.assign(new Error(message), { status });

export async function listImages() {
  const files = await fs.readdir(IMAGES_DIR);
  return files
    .filter((f) => EXTENSIONS.includes(path.extname(f).toLowerCase()))
    .map((f) => ({ id: path.parse(f).name, file: f }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

async function findImage(id) {
  if (!/^[\w-]+$/.test(id)) throw fail(400, "Invalid image id");
  let images;
  try {
    images = await listImages();
  } catch {
    throw fail(500, `Cannot read images folder: ${IMAGES_DIR}`);
  }
  const hit = images.find((i) => i.id === id);
  if (!hit) throw fail(404, `No image named "${id}" in ${IMAGES_DIR}`);
  return path.join(IMAGES_DIR, hit.file);
}

const readCache = async (id) => {
  try {
    return JSON.parse(await fs.readFile(path.join(CACHE_DIR, `${id}.json`), "utf8"));
  } catch {
    return null;
  }
};

const inflight = new Map(); // id -> promise, so two taps on the same frame make one API call

// Returns { detections, cached }. Uses the saved result unless `fresh` is true.
export function detectImage(id, { fresh = false } = {}) {
  if (inflight.has(id)) return inflight.get(id);

  const job = (async () => {
    if (!fresh) {
      const saved = await readCache(id);
      if (saved) return { detections: saved, cached: true };
    }

    // CACHE_ONLY=1 makes the booth fully offline-safe: never call the API, only use saved results.
    if (process.env.CACHE_ONLY === "1") throw fail(503, `No saved result for "${id}" (CACHE_ONLY is on)`);

    const imagePath = await findImage(id);
    const base64 = (await fs.readFile(imagePath)).toString("base64");

    const response = await runWorkflow(base64);
    const detections = extractDetections(response);

    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(path.join(CACHE_DIR, `${id}.json`), JSON.stringify(detections, null, 2));
    return { detections, cached: false };
  })().finally(() => inflight.delete(id));

  inflight.set(id, job);
  return job;
}
