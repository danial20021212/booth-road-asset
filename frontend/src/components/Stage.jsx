import React, { useEffect, useState } from "react";
import { describe } from "../constants";

// Cyan line that sweeps up and down while scanning (pure Tailwind transitions).
const ScanLine = () => {
  const [down, setDown] = useState(false);

  useEffect(() => {
    const first = setTimeout(() => setDown(true), 50);
    const loop = setInterval(() => setDown((d) => !d), 1500);
    return () => {
      clearTimeout(first);
      clearInterval(loop);
    };
  }, []);

  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.08)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div
        className={`absolute inset-x-0 h-1 bg-cyan-300 shadow-[0_0_40px_14px_rgba(34,211,238,0.45)] transition-[top] duration-[1500ms] ease-in-out ${
          down ? "top-full" : "top-0"
        }`}
      />
    </>
  );
};

// One box. Only a small numbered badge sits on the image, so crowded scenes stay readable.
// The full name appears for the selected box, and in the side panel list.
const BoundingBox = ({ det, selected, dimmed, onSelect }) => {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 20);
    return () => clearTimeout(t);
  }, []);

  const info = describe(det);
  const { xmin, ymin, xmax, ymax } = det.box;
  const badgeBelow = ymin < 0.05; // keep the badge on screen near the top edge

  const state = !shown ? "scale-125 opacity-0" : dimmed ? "scale-100 opacity-30" : "scale-100 opacity-100";

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect(det.n);
      }}
      className={`absolute cursor-pointer rounded-sm transition duration-300 ease-out ${state} ${
        selected ? "z-20" : "z-10"
      }`}
      style={{
        left: `${xmin * 100}%`,
        top: `${ymin * 100}%`,
        width: `${(xmax - xmin) * 100}%`,
        height: `${(ymax - ymin) * 100}%`,
        border: `${selected ? 4 : 2}px solid ${info.color}`,
        background: selected ? `${info.color}33` : `${info.color}1a`,
        boxShadow: selected ? `0 0 0 3px #020617, 0 0 28px 6px ${info.color}aa` : "none",
      }}
    >
      <span
        className={`absolute left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-sm font-bold text-slate-950 ${
          badgeBelow ? "top-full mt-1" : "bottom-full mb-1"
        }`}
        style={{ background: info.color }}
      >
        {det.n}
        {selected && <span className="font-sans">{info.name}</span>}
      </span>
    </div>
  );
};

// Shows the selected frame and draws the detections on top of it.
// The box layer hugs the image exactly (no letterbox gaps), so the 0..1
// coordinates line up at any screen size.
const Stage = ({ image, ratio, onRatio, phase, detections, selected, onSelect }) => {
  return (
    <div className="flex h-full w-full items-center justify-center [container-type:size]">
      <div
        onClick={() => onSelect(null)}
        className="relative overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-cyan-500/40"
        style={{
          width: `min(100cqw, calc(100cqh * ${ratio}))`,
          aspectRatio: ratio,
        }}
      >
        <img
          src={image.src}
          alt={image.title}
          draggable={false}
          onLoad={(e) => onRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
          className={`absolute inset-0 h-full w-full transition duration-500 ${
            phase === "scanning" ? "brightness-75" : ""
          }`}
        />

        {phase === "scanning" && <ScanLine />}

        {detections.map((d) => (
          <BoundingBox
            key={d.n}
            det={d}
            selected={selected === d.n}
            dimmed={selected !== null && selected !== d.n}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
};

export default Stage;
