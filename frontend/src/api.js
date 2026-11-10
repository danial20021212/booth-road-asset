import { MIN_SCAN_MS, describe, groupRank } from "./constants";

// Flip to false once the Express server is running.
const USE_MOCK = true;
const API_BASE = "http://localhost:8000";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/*
  Contract with the Express server:

  POST {API_BASE}/api/detect/:imageId
  -> the Gemini JSON exactly as your prompt returns it, either the bare list
     or wrapped as { "detections": [...] }:

  [{ "label": "traffic sign",
     "box_2d": [ymin, xmin, ymax, xmax],     // 0 to 1000
     "shape": "diamond", "main_color": "yellow",
     "category": "warning", "confidence": 0.9 }]

  The frontend converts box_2d to 0..1 itself, so the server does not have to.
*/

// ---------- mock data, only used while USE_MOCK = true ----------
// y / w / h ranges are on the same 0-1000 scale as box_2d.
const TEMPLATES = [
  { label: "traffic sign", category: "warning", shape: "diamond", main_color: "yellow", y: [250, 520], w: [18, 32], h: [28, 50] },
  { label: "traffic sign", category: "warning", shape: "rectangle", main_color: "yellow", y: [250, 520], w: [18, 34], h: [16, 30] },
  { label: "traffic sign", category: "informative", shape: "rectangle", main_color: "blue", y: [250, 500], w: [25, 60], h: [18, 40] },
  { label: "traffic sign", category: "regulatory_prohibitive", shape: "circle", main_color: "red", y: [280, 520], w: [20, 34], h: [28, 48] },
  { label: "traffic sign", category: "regulatory_mandatory", shape: "circle", main_color: "blue", y: [280, 520], w: [20, 34], h: [28, 48] },
  { label: "traffic sign", category: "construction_temporary", shape: "diamond", main_color: "orange", y: [260, 520], w: [20, 34], h: [30, 52] },
  { label: "expressway sign", y: [180, 400], w: [60, 120], h: [40, 80] },
  { label: "traffic light", y: [200, 420], w: [14, 26], h: [40, 70] },
  { label: "left turn arrow road marking", y: [560, 700], w: [30, 55], h: [14, 26] },
  { label: "straight arrow road marking", y: [560, 700], w: [30, 55], h: [14, 26] },
  { label: "right and straight arrow road marking", y: [560, 700], w: [30, 55], h: [14, 26] },
  { label: "u-turn arrow road marking", y: [560, 700], w: [30, 55], h: [14, 26] },
  { label: "yellow box junction", y: [580, 720], w: [120, 220], h: [40, 80] },
  { label: "feeder pillar", y: [450, 650], w: [30, 50], h: [60, 100] },
  { label: "bus stop", y: [380, 560], w: [40, 90], h: [70, 130] },
  { label: "traffic island", y: [520, 680], w: [80, 160], h: [20, 40] },
];

const mulberry32 = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const mockRaw = (imageId) => {
  const seed = [...imageId].reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = mulberry32(seed);
  const between = ([a, b]) => a + rand() * (b - a);
  const count = 7 + Math.floor(rand() * 5);

  return Array.from({ length: count }, () => {
    const t = TEMPLATES[Math.floor(rand() * TEMPLATES.length)];
    const w = between(t.w);
    const h = between(t.h);
    const x = 20 + rand() * (960 - w);
    const y = between(t.y);
    return {
      label: t.label,
      box_2d: [y, x, y + h, x + w].map(Math.round),
      shape: t.shape ?? null,
      main_color: t.main_color ?? null,
      category: t.category ?? null,
      confidence: +(0.72 + rand() * 0.26).toFixed(2),
    };
  });
};
// ----------------------------------------------------------------

const clamp01 = (v) => Math.min(1, Math.max(0, v));

// Raw Gemini output -> clean list the UI can draw: boxes on a 0..1 scale,
// sorted by group then left to right, and numbered (n) so boxes and list match.
function prepare(raw) {
  const list = Array.isArray(raw) ? raw : raw?.detections ?? [];

  return list
    .filter((d) => Array.isArray(d.box_2d) && d.box_2d.length === 4)
    .map((d) => {
      const [ymin, xmin, ymax, xmax] = d.box_2d.map((v) => clamp01(v / 1000));
      return {
        label: d.label,
        shape: d.shape ?? null,
        main_color: d.main_color ?? null,
        category: d.category ?? null,
        confidence: d.confidence ?? 0,
        box: { xmin, ymin, xmax, ymax },
      };
    })
    .sort(
      (a, b) =>
        groupRank(describe(a).group) - groupRank(describe(b).group) || a.box.xmin - b.box.xmin
    )
    .map((d, i) => ({ ...d, n: i + 1 }));
}

export async function detect(imageId) {
  const started = Date.now();
  let raw;

  if (USE_MOCK) {
    await sleep(800);
    raw = mockRaw(imageId);
  } else {
    const res = await fetch(`${API_BASE}/api/detect/${imageId}`, { method: "POST" });
    if (!res.ok) throw new Error(`Detection failed (${res.status})`);
    raw = await res.json();
  }

  const detections = prepare(raw);

  // Keep the scan animation on screen for a minimum time so it never flashes by.
  const remaining = MIN_SCAN_MS - (Date.now() - started);
  if (remaining > 0) await sleep(remaining);
  return detections;
}
