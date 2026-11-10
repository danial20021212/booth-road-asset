// Seconds of no interaction before the demo returns to the start screen.
export const IDLE_RESET_MS = 45_000;

// Minimum time the scan animation plays, so it feels intentional even if the API is instant.
export const MIN_SCAN_MS = 2200;

// Delay between each detection appearing.
export const REVEAL_STEP_MS = 280;

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
};

const ARROW = { name: "Road arrow", color: "#a3e635" };

// Order used for numbering, the chips and the list.
export const GROUP_ORDER = [
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

export const groupRank = (group) => {
  const i = GROUP_ORDER.indexOf(group);
  return i === -1 ? 99 : i;
};

const cap = (s = "") => (s ? s[0].toUpperCase() + s.slice(1) : s);

// Turns one raw detection into everything the UI needs to show it.
// group: key used for filtering. name/color: display. sub: one-line detail.
export function describe(det) {
  const label = (det.label || "").toLowerCase().trim();

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
  if (o) return { group: label, name: o.name, color: o.color, hint: o.hint, sub: o.hint };

  return { group: label, name: cap(label) || "Object", color: "#94a3b8", hint: "", sub: "" };
}
