import React, { useState } from "react";
import { MODES } from "../constants";
import { IMAGES } from "../data/images";
import { DEFECT_IMAGES } from "../data/defectImages";

// Colours and background photo for each card. The photo is the first frame of that mode,
// and if the file is missing the card simply falls back to the dark gradient.
const CARDS = [
  { mode: MODES.assets, accent: "#22d3ee", photo: IMAGES[0]?.src },
  { mode: MODES.defects, accent: "#fb923c", photo: DEFECT_IMAGES[0]?.src },
];

const Card = ({ mode, accent, photo, onPick }) => {
  const [missing, setMissing] = useState(false);

  return (
    <button
      onClick={() => onPick(mode.key)}
      className="group relative flex flex-col justify-end overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 to-slate-950 p-10 text-left ring-1 ring-slate-700 transition duration-200 active:scale-[0.98]"
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `0 0 0 4px ${accent}`)}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "")}
    >
      {photo && !missing && (
        <img
          src={photo}
          alt=""
          draggable={false}
          onError={() => setMissing(true)}
          className="absolute inset-0 h-full w-full object-cover opacity-60 transition duration-500 group-hover:scale-105 group-hover:opacity-80"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

      <div className="relative">
        <h2 className="text-7xl font-bold tracking-tight text-white">{mode.title}</h2>
        <p className="mt-4 max-w-xl text-3xl text-slate-300">{mode.blurb}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          {mode.pills.map((p) => (
            <span
              key={p}
              className="rounded-full border-2 px-5 py-2 text-xl text-slate-200"
              style={{ borderColor: `${accent}88`, background: `${accent}1a` }}
            >
              {p}
            </span>
          ))}
        </div>

        <span
          className="mt-10 inline-block rounded-full px-10 py-4 text-3xl font-bold text-slate-950"
          style={{ background: accent }}
        >
          Start →
        </span>
      </div>
    </button>
  );
};

const ModeSelect = ({ onPick }) => {
  return (
    <div className="grid h-full grid-cols-2 gap-8">
      {CARDS.map((c) => (
        <Card key={c.mode.key} {...c} onPick={onPick} />
      ))}
    </div>
  );
};

export default ModeSelect;