import React from "react";
import { describe } from "../constants";

// One chip per kind of asset found. Tap to hide or show that kind on the image.
const ClassChips = ({ detections, activeGroups, onToggle }) => {
  const groups = new Map();
  detections.forEach((d) => {
    const info = describe(d);
    const g = groups.get(info.group) || { key: info.group, name: info.name, color: info.color, count: 0 };
    g.count += 1;
    groups.set(info.group, g);
  });

  return (
    <div className="flex flex-wrap gap-2">
      {[...groups.values()].map((g) => {
        const on = activeGroups.has(g.key);
        return (
          <button
            key={g.key}
            onClick={() => onToggle(g.key)}
            className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 text-lg font-medium transition active:scale-95 ${
              on ? "text-white" : "text-slate-500 opacity-50"
            }`}
            style={{ borderColor: on ? g.color : "#334155", background: on ? `${g.color}22` : "transparent" }}
          >
            <span className="h-3.5 w-3.5 rounded-full" style={{ background: g.color }} />
            {g.name}
            <span className="font-mono font-bold" style={{ color: on ? g.color : undefined }}>
              {g.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default ClassChips;
