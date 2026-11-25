import { describe, GROUP_ORDER, MODES } from "../constants";

// What a visitor can pick when drawing a box. Built from the same groups the AI results use,
// so names and colours match. "Unclassified sign" is left out; visitors always choose a type.
const asDetection = (group) => {
  if (group.startsWith("sign:")) return { label: "traffic sign", category: group.slice(5) };
  if (group === "arrow") return { label: "arrow road marking" };
  return { label: group };
};

const ALL_CATEGORIES = GROUP_ORDER.filter((g) => g !== "sign:unknown").map((group) => {
  const info = describe(asDetection(group));
  return { group, name: info.name, color: info.color, hint: info.hint };
});

// The choices shown for one mode: "assets" or "defects".
export const categoriesFor = (modeKey) => {
  const groups = MODES[modeKey]?.groups || [];
  return ALL_CATEGORIES.filter((c) => groups.includes(c.group));
};

export const categoryOf = (group) => ALL_CATEGORIES.find((c) => c.group === group) || ALL_CATEGORIES[0];

// How each result is shown. Order here is the order of the result list.
export const STATUS = {
  match: { label: "You both found it", color: "#22c55e" },
  wrong: { label: "Found it, different type", color: "#f59e0b" },
  missed: { label: "You missed it", color: "#f43f5e" },
  extra: { label: "The AI missed it", color: "#38bdf8" },
};
const KIND_ORDER = ["match", "wrong", "missed", "extra"];

// Overlap between two boxes (0 to 1). Boxes are { xmin, ymin, xmax, ymax } on a 0..1 scale.
export const iou = (a, b) => {
  const w = Math.min(a.xmax, b.xmax) - Math.max(a.xmin, b.xmin);
  const h = Math.min(a.ymax, b.ymax) - Math.max(a.ymin, b.ymin);
  if (w <= 0 || h <= 0) return 0;
  const inter = w * h;
  const area = (r) => (r.xmax - r.xmin) * (r.ymax - r.ymin);
  return inter / (area(a) + area(b) - inter);
};

// Far-away signs are tiny, so two boxes count as the same object at a fairly low overlap.
const MIN_IOU = 0.2;

// Pairs each AI detection with at most one of the visitor's boxes (best overlap first,
// preferring the same type), then labels everything: match / wrong / missed / extra.
export function compare(aiDetections, mine) {
  const pairs = [];
  aiDetections.forEach((ai, i) => {
    const aiGroup = describe(ai).group;
    mine.forEach((me, j) => {
      const overlap = iou(ai.box, me.box);
      if (overlap >= MIN_IOU) pairs.push({ i, j, score: overlap + (aiGroup === me.group ? 1 : 0) });
    });
  });
  pairs.sort((a, b) => b.score - a.score);

  const usedAi = new Set();
  const usedMine = new Set();
  const items = [];

  for (const { i, j } of pairs) {
    if (usedAi.has(i) || usedMine.has(j)) continue;
    usedAi.add(i);
    usedMine.add(j);
    const same = describe(aiDetections[i]).group === mine[j].group;
    items.push({ kind: same ? "match" : "wrong", ai: aiDetections[i], me: mine[j] });
  }
  aiDetections.forEach((ai, i) => {
    if (!usedAi.has(i)) items.push({ kind: "missed", ai });
  });
  mine.forEach((me, j) => {
    if (!usedMine.has(j)) items.push({ kind: "extra", me });
  });

  items.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  items.forEach((it, k) => (it.key = k + 1));

  const counts = { match: 0, wrong: 0, missed: 0, extra: 0 };
  items.forEach((it) => (counts[it.kind] += 1));
  return { items, counts };
}

// Name and one-line explanation for a result row.
export function itemInfo(it) {
  const aiName = it.ai ? describe(it.ai).name : "";
  const meName = it.me ? categoryOf(it.me.group).name : "";
  switch (it.kind) {
    case "match":
      return { name: aiName, sub: "Right place, right type" };
    case "wrong":
      return { name: aiName, sub: `AI says ${aiName.toLowerCase()}, you said ${meName.toLowerCase()}` };
    case "missed":
      return { name: aiName, sub: "The AI spotted this one" };
    default:
      return { name: meName, sub: "The AI didn't box this" };
  }
}