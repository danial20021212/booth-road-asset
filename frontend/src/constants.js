// Seconds of no interaction before the demo returns to the home screen.
export const IDLE_RESET_MS = 45_000;

// Minimum time the scan animation plays, so it feels intentional even if the API is instant.
export const MIN_SCAN_MS = 2200;

// Delay between each detection appearing.
export const REVEAL_STEP_MS = 280;

// ---------- Road assets ----------

// Traffic signs are coloured by the category the AI picked (same idea as your inspection page).
const SIGN = {
  warning: { name: "Warning sign", color: "#facc15", hint: "Warns of a hazard ahead" },
  regulatory_prohibitive: { name: "Prohibitive sign", color: "#ef4444", hint: "Forbids or limits something" },
  regulatory_mandatory: { name: "Mandatory sign", color: "#818cf8", hint: "Orders a required action" },
  informative: { name: "Informative sign", color: "#22d3ee", hint: "Directions, distances, facilities" },
  construction_temporary: { name: "Roadwork sign", color: "#fb923c", hint: "Road works or temporary conditions" },
  unknown: { name: "Unclassified sign", color: "#94a3b8", hint: "Too small or blurry to categorise" },
};

const OTHER = {
  "expressway sign": { name: "Expressway sign", color: "#22c55e", hint: "Green guide board" },
  "traffic light": { name: "Traffic light", color: "#f43f5e", hint: "Signal head" },
  "yellow box junction": { name: "Yellow box junction", color: "#a78bfa", hint: "Painted criss-cross grid" },
  "feeder pillar": { name: "Feeder pillar", color: "#e2e8f0", hint: "Roadside electrical cabinet" },
  "bus stop": { name: "Bus stop", color: "#2dd4bf", hint: "Bus stop sign or shelter" },
  "traffic island": { name: "Traffic island", color: "#f472b6", hint: "Separates traffic flows" },

  // ---------- Road defects ----------
  potholes: { name: "Pothole", color: "#ef4444", hint: "Hole in the road surface" },
  "longitudinal crack": { name: "Longitudinal crack", color: "#facc15", hint: "Crack running along the road" },
  "transverse crack": { name: "Transverse crack", color: "#22d3ee", hint: "Crack running across the road" },
  "crocodile crack": { name: "Crocodile crack", color: "#fb923c", hint: "Web of cracks, like crocodile skin" },
  "road patch": { name: "Road patch", color: "#a78bfa", hint: "Repaired section of road" },
  "crack seals": { name: "Crack seal", color: "#4ade80", hint: "Sealant filling a crack" },
};
OTHER.pothole = OTHER.potholes; // in case the model answers in the singular
OTHER["crack seal"] = OTHER["crack seals"];

const ARROW = { name: "Road arrow", color: "#a3e635" };

export const ASSET_GROUPS = [
  "sign:warning",
  "sign:regulatory_prohibitive",
  "sign:regulatory_mandatory",
  "sign:informative",
  "sign:construction_temporary",
  "sign:unknown",
  "expressway sign",
  "traffic light",
  "arrow",
  "yellow box junction",
  "feeder pillar",
  "bus stop",
  "traffic island",
];

export const DEFECT_GROUPS = [
  "potholes",
  "longitudinal crack",
  "transverse crack",
  "crocodile crack",
  "road patch",
  "crack seals",
];

// Order used for numbering, the chips and the list.
export const GROUP_ORDER = [...ASSET_GROUPS, ...DEFECT_GROUPS];

export const groupRank = (group) => {
  const i = GROUP_ORDER.indexOf(group);
  return i === -1 ? 99 : i;
};

// ---------- The two things a visitor can try ----------
export const MODES = {
  assets: {
    key: "assets",
    title: "Road Assets",
    blurb: "Signs, traffic lights, road markings, bus stops and more",
    pills: ["Traffic signs", "Traffic lights", "Road arrows", "Bus stops", "Feeder pillars", "+ more"],
    eyebrow: "AI Road Asset Detection",
    selectTitle: "Pick a dashcam frame. Watch the AI find every road asset.",
    readyText:
      "Our AI will scan this dashcam frame for traffic signs, traffic lights, road markings, feeder pillars, bus stops and more.",
    scanText: "Looking for signs, lights and road markings",
    noun: ["asset", "assets"],
    groups: ASSET_GROUPS,
  },
  defects: {
    key: "defects",
    title: "Road Defects",
    blurb: "Potholes, cracks, patches and other damage to the road surface",
    pills: ["Potholes", "Longitudinal cracks", "Transverse cracks", "Crocodile cracks", "Road patches", "Crack seals"],
    eyebrow: "AI Road Defect Detection",
    selectTitle: "Pick a road photo. Watch the AI find every defect.",
    readyText: "Our AI will scan this road for potholes, cracks, patches and crack seals.",
    scanText: "Looking for potholes and cracks",
    noun: ["defect", "defects"],
    groups: DEFECT_GROUPS,
  },
};

const cap = (s = "") => (s ? s[0].toUpperCase() + s.slice(1) : s);

// Turns one raw detection into everything the UI needs to show it.
// group: key used for filtering. name/color: display. sub: one-line detail.
export function describe(det) {
  const label = (det.label || "").toLowerCase().replace(/_/g, " ").trim();

  if (label === "traffic sign") {
    const cat = SIGN[det.category] ? det.category : "unknown";
    const s = SIGN[cat];
    const looks = [det.shape, det.main_color].filter(Boolean).map(cap).join(" · ");
    return { group: `sign:${cat}`, name: s.name, color: s.color, hint: s.hint, sub: looks || s.hint };
  }

  if (label.includes("arrow")) {
    const type = cap(label.replace(/\s*arrow.*$/, ""));
    return { group: "arrow", name: ARROW.name, color: ARROW.color, hint: "Painted lane arrow", sub: type };
  }

  const o = OTHER[label];
  if (o) {
    // Singular and plural spellings share one group so they filter and compare together.
    const group = GROUP_ORDER.includes(label) ? label : Object.keys(OTHER).find((k) => OTHER[k] === o && GROUP_ORDER.includes(k)) || label;
    return { group, name: o.name, color: o.color, hint: o.hint, sub: o.hint };
  }

  return { group: label, name: cap(label) || "Object", color: "#94a3b8", hint: "", sub: "" };
}