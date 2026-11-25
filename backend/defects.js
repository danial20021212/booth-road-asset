import "./env.js";
import { extractDetections } from "./roboflow.js";

export const DEFECT_CLASSES = [
  "potholes",
  "longitudinal crack",
  "transverse crack",
  "crocodile crack",
  "road patch",
  "crack seals",
];

const DEFAULT_URL = "https://serverless.roboflow.com/danial-lja5y/workflows/claude-fable-5-2-object-detection";

// Sends one image (base64) through the defects workflow and returns the raw JSON response.
export async function runDefects(base64) {
  const key = process.env.ROBOFLOW_API_KEY;
  if (!key) throw new Error("ROBOFLOW_API_KEY is missing from .env");

  const res = await fetch(process.env.ROBOFLOW_DEFECTS_URL || DEFAULT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      inputs: { image: { type: "base64", value: base64 }, classes: DEFECT_CLASSES },
    }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Roboflow ${res.status}: ${text.slice(0, 400)}`);
  return JSON.parse(text);
}

// ---- Reading the image size from the file itself (used if the response doesn't include it) ----
export function imageSize(buf) {
  // PNG
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // JPEG: walk the markers until a "start of frame" block, which holds the size
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1];
      if (marker === 0xff) {
        i++;
        continue;
      }
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}

// ---- Turning the workflow response into the same format the asset detector returns ----
// Roboflow object detection gives pixel boxes as centre x, y plus width, height. The frontend
// expects { label, box_2d: [ymin, xmin, ymax, xmax] on a 0-1000 scale, confidence }.

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const isPixelBox = (p) => p && typeof p === "object" && isNum(p.x) && isNum(p.y) && isNum(p.width) && isNum(p.height);

function findPredictions(node) {
  if (Array.isArray(node)) {
    if (node.length > 0 && node.every(isPixelBox)) return node;
    for (const item of node) {
      const found = findPredictions(item);
      if (found) return found;
    }
    return null;
  }
  if (node && typeof node === "object") {
    // A "predictions" array that is empty means the model found nothing, which is a valid answer.
    if (Array.isArray(node.predictions) && node.predictions.length === 0) return [];
    for (const value of Object.values(node)) {
      const found = findPredictions(value);
      if (found) return found;
    }
  }
  return null;
}

function findImageSize(node) {
  if (node && typeof node === "object") {
    const im = node.image;
    if (im && isNum(im.width) && isNum(im.height)) return { width: im.width, height: im.height };
    for (const value of Object.values(node)) {
      const found = findImageSize(value);
      if (found) return found;
    }
  }
  return null;
}

const clamp = (v) => Math.min(1000, Math.max(0, Math.round(v)));

export function defectsToDetections(response, imageBuffer) {
  const predictions = findPredictions(response);

  if (predictions) {
    if (predictions.length === 0) return [];
    const size = findImageSize(response) || imageSize(imageBuffer);
    if (!size) throw new Error("Could not work out the image size to scale the boxes");

    return predictions.map((p) => ({
      label: String(p.class ?? p.class_name ?? p.label ?? "defect").toLowerCase(),
      box_2d: [
        clamp(((p.y - p.height / 2) / size.height) * 1000),
        clamp(((p.x - p.width / 2) / size.width) * 1000),
        clamp(((p.y + p.height / 2) / size.height) * 1000),
        clamp(((p.x + p.width / 2) / size.width) * 1000),
      ],
      shape: null,
      main_color: null,
      category: null,
      confidence: isNum(p.confidence) ? p.confidence : 0,
    }));
  }

  // Some workflows return Gemini-style JSON with box_2d already on a 0-1000 scale.
  return extractDetections(response).map((d) => ({
    label: String(d.label ?? "defect").toLowerCase(),
    box_2d: d.box_2d,
    shape: null,
    main_color: null,
    category: null,
    confidence: d.confidence ?? 0,
  }));
}