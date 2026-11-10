import React from "react";
import { describe } from "../constants";

// Pads the box and enforces a minimum size so tiny far-away objects still get some context.
// Returns [start, length] on a 0..1 axis, kept inside the image.
const grow = (a, b, min) => {
  const centre = (a + b) / 2;
  const len = Math.min(1, Math.max((b - a) * 1.8, min));
  const start = Math.max(0, Math.min(1 - len, centre - len / 2));
  return [start, len];
};

// Zoomed crop of the selected detection, plus what the AI worked out about it.
// Far-away signs are tiny in a dashcam frame, so this is where visitors actually see them.
const Spotlight = ({ det, src, ratio }) => {
  const info = describe(det);
  const { xmin, ymin, xmax, ymax } = det.box;

  const MIN = 0.16;
  const [x0, cw] = grow(xmin, xmax, MIN);
  const [y0, ch] = grow(ymin, ymax, Math.min(1, MIN * ratio)); // same pixel size on both axes
  const aspect = (cw * ratio) / ch;

  const facts = [
    det.shape && ["Shape", det.shape],
    det.main_color && ["Colour", det.main_color],
    ["Confidence", `${Math.round(det.confidence * 100)}%`],
  ].filter(Boolean);

  return (
    <div className="rounded-xl bg-slate-800 p-4 ring-1 ring-slate-700">
      <div className="flex justify-center">
        <div
          className="relative overflow-hidden rounded-lg"
          style={{
            aspectRatio: aspect,
            width: `min(100%, calc(9rem * ${aspect}))`,
            backgroundImage: `url(${src})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: `${100 / cw}% ${100 / ch}%`,
            backgroundPosition: `${cw >= 1 ? 0 : (x0 / (1 - cw)) * 100}% ${ch >= 1 ? 0 : (y0 / (1 - ch)) * 100}%`,
          }}
        >
          <div
            className="absolute rounded-sm"
            style={{
              left: `${((xmin - x0) / cw) * 100}%`,
              top: `${((ymin - y0) / ch) * 100}%`,
              width: `${((xmax - xmin) / cw) * 100}%`,
              height: `${((ymax - ymin) / ch) * 100}%`,
              border: `3px solid ${info.color}`,
            }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full font-mono text-base font-bold text-slate-950"
          style={{ background: info.color }}
        >
          {det.n}
        </span>
        <p className="text-2xl font-bold text-white">{info.name}</p>
      </div>
      <p className="mt-1 text-lg text-slate-300">{info.group === "arrow" ? info.sub : info.hint}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {facts.map(([k, v]) => (
          <span key={k} className="rounded-full bg-slate-900 px-3 py-1 text-base capitalize text-slate-300">
            <span className="text-slate-500">{k}</span> {v}
          </span>
        ))}
      </div>
    </div>
  );
};

export default Spotlight;
