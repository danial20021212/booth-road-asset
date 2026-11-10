import React from "react";
import { describe } from "../constants";

// Numbered list that matches the badges on the image. Tap a row to spotlight it.
const DetectionList = ({ detections, selected, onSelect }) => {
  return (
    <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
      {detections.map((d) => {
        const info = describe(d);
        const on = selected === d.n;
        return (
          <li key={d.n}>
            <button
              onClick={() => onSelect(on ? null : d.n)}
              className={`flex w-full items-center gap-4 rounded-xl border-2 px-4 py-3 text-left transition active:scale-[0.98] ${
                on ? "bg-slate-800" : "border-transparent bg-slate-800/40 hover:bg-slate-800"
              }`}
              style={{ borderColor: on ? info.color : undefined }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-lg font-bold text-slate-950"
                style={{ background: info.color }}
              >
                {d.n}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xl font-semibold text-white">{info.name}</span>
                <span className="block truncate text-base text-slate-400">{info.sub}</span>
              </span>
              <span className="font-mono text-lg text-slate-400">{Math.round(d.confidence * 100)}%</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export default DetectionList;
