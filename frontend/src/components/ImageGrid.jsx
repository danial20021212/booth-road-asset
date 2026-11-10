import React, { useState } from "react";

const Tile = ({ img, index, onPick }) => {
  const [missing, setMissing] = useState(false);

  return (
    <button
      onClick={() => onPick(img)}
      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-left ring-1 ring-slate-700 transition duration-200 hover:ring-4 hover:ring-cyan-400 active:scale-[0.98]"
    >
      {!missing && (
        <img
          src={img.src}
          alt={img.title}
          draggable={false}
          onError={() => setMissing(true)}
          className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      )}

      {/* Shown instead of a silent blank tile when the file can't be found */}
      {missing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="text-xl font-semibold text-amber-400">Image not found</p>
          <p className="break-all font-mono text-base text-slate-400">public{img.src}</p>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
      <div className="absolute left-4 top-4 rounded-md bg-slate-950/70 px-3 py-1 font-mono text-lg text-cyan-300">
        {String(index + 1).padStart(2, "0")}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-5">
        <span className="text-2xl font-semibold text-white">{img.title}</span>
        <span className="rounded-full bg-cyan-400 px-4 py-1 text-base font-bold text-slate-950 opacity-0 transition group-hover:opacity-100">
          Scan
        </span>
      </div>
    </button>
  );
};

const ImageGrid = ({ images, onPick }) => {
  return (
    <div className="grid h-full grid-cols-3 grid-rows-2 gap-6">
      {images.map((img, i) => (
        <Tile key={img.id} img={img} index={i} onPick={onPick} />
      ))}
    </div>
  );
};

export default ImageGrid;