import React, { useEffect, useMemo, useRef, useState } from "react";
import { detect, detectUpload } from "../api";
import { describe } from "../constants";
import { STATUS, categoriesFor, categoryOf, compare, itemInfo } from "../lib/compare";

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const pct = (v) => `${v * 100}%`;
const boxStyle = (b) => ({
  left: pct(b.xmin),
  top: pct(b.ymin),
  width: pct(b.xmax - b.xmin),
  height: pct(b.ymax - b.ymin),
});

// Small label stuck to a box so it is obvious whose box it is: a solid AI pill or a dark YOU pill.
// The number (matching the list on the right) rides on one tag per result.
const Tag = ({ box, side, n, name, color, place }) => {
  const isAi = side === "AI";
  const pos =
    place === "above"
      ? { top: pct(box.ymin), transform: "translate(-50%, calc(-100% - 4px))" }
      : place === "below"
      ? { top: pct(box.ymax), transform: "translate(-50%, 4px)" }
      : { top: pct(box.ymin), transform: "translate(-50%, 4px)" };
  return (
    <span
      className="absolute flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-bold"
      style={{
        left: pct((box.xmin + box.xmax) / 2),
        ...pos,
        background: isAi ? color : "#020617",
        color: isAi ? "#020617" : "#ffffff",
        border: `2px solid ${color}`,
      }}
    >
      {n != null && (
        <span className={`rounded-full px-1.5 font-mono text-xs text-white ${isAi ? "bg-slate-950" : "bg-white/25"}`}>
          {n}
        </span>
      )}
      {isAi ? "AI" : "YOU"}
      {name && <span className="font-medium">· {name}</span>}
    </span>
  );
};

// Smallest drag (as a fraction of the image) that counts as a box, so stray taps are ignored.
const MIN_DRAG = 0.008;

// `kind` is "assets" or "defects": it decides which types the visitor can pick and which saved result is used.
const ChallengeModal = ({ image, ratio, kind = "assets", onClose }) => {
  const categories = useMemo(() => categoriesFor(kind), [kind]);
  const [mode, setMode] = useState("draw"); // "draw" -> "compare"
  const [mine, setMine] = useState([]); // [{ id, group, box }]
  const [brush, setBrush] = useState(categories[0].group);
  const [drawing, setDrawing] = useState(null); // { x0, y0, x1, y1 } while dragging
  const [ai, setAi] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("both"); // "both" | "mine" | "ai"

  const layerRef = useRef(null);
  const nextId = useRef(1);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const result = useMemo(() => (mode === "compare" && ai ? compare(ai, mine) : null), [mode, ai, mine]);
  const brushCat = categoryOf(brush);

  // ---- drawing ----
  const pointFrom = (e) => {
    const r = layerRef.current.getBoundingClientRect();
    return { x: clamp01((e.clientX - r.left) / r.width), y: clamp01((e.clientY - r.top) / r.height) };
  };

  const onDown = (e) => {
    if (mode !== "draw") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pointFrom(e);
    setDrawing({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
  };

  const onMove = (e) => {
    if (!drawing) return;
    const p = pointFrom(e);
    setDrawing((d) => ({ ...d, x1: p.x, y1: p.y }));
  };

  const onUp = () => {
    if (!drawing) return;
    const box = {
      xmin: Math.min(drawing.x0, drawing.x1),
      xmax: Math.max(drawing.x0, drawing.x1),
      ymin: Math.min(drawing.y0, drawing.y1),
      ymax: Math.max(drawing.y0, drawing.y1),
    };
    if (box.xmax - box.xmin > MIN_DRAG && box.ymax - box.ymin > MIN_DRAG) {
      setMine((m) => [...m, { id: nextId.current++, group: brush, box }]);
    }
    setDrawing(null);
  };

  const removeBox = (id) => setMine((m) => m.filter((b) => b.id !== id));

  // ---- comparing ----
  const runCompare = async () => {
    setError("");
    setSelected(null);
    setView("both");
    if (ai) {
      setMode("compare");
      return;
    }
    setBusy(true);
    try {
      // Sample frames use the saved result; an uploaded photo reuses the result from its first scan.
      const detections = image.upload ? await detectUpload(image.src, kind) : await detect(image.id, kind);
      if (!alive.current) return;
      setAi(detections);
      setMode("compare");
    } catch {
      if (alive.current) setError("Couldn't reach the AI. Please try again.");
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 p-8 text-slate-100">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <p className="font-mono text-lg uppercase tracking-[0.3em] text-amber-400">Challenge</p>
          <h1 className="text-5xl font-bold tracking-tight">Can you beat the AI?</h1>
        </div>
        <button
          onClick={onClose}
          className="rounded-full border-2 border-slate-600 px-8 py-3 text-2xl font-medium text-slate-300 transition hover:border-amber-400 hover:text-white active:scale-95"
        >
          ✕ Close
        </button>
      </header>

      <div className="flex min-h-0 flex-1 gap-8">
        {/* Image */}
        <div className="min-h-0 min-w-0 flex-1">
          <div className="flex h-full w-full items-center justify-center [container-type:size]">
            <div
              ref={layerRef}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={() => setDrawing(null)}
              onClick={() => mode === "compare" && setSelected(null)}
              className={`relative touch-none overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-amber-500/40 ${
                mode === "draw" ? "cursor-crosshair" : ""
              }`}
              style={{ width: `min(100cqw, calc(100cqh * ${ratio}))`, aspectRatio: ratio }}
            >
              <img
                src={image.src}
                alt={image.title}
                draggable={false}
                className="pointer-events-none absolute inset-0 h-full w-full"
              />

              {/* Drawing mode: the visitor's own boxes */}
              {mode === "draw" &&
                mine.map((m) => {
                  const cat = categoryOf(m.group);
                  return (
                    <div
                      key={m.id}
                      className="absolute rounded-sm"
                      style={{
                        ...boxStyle(m.box),
                        border: `3px solid ${cat.color}`,
                        background: `${cat.color}22`,
                      }}
                    >
                      <span
                        className="absolute left-0 bottom-full mb-0.5 whitespace-nowrap rounded-sm px-2 py-0.5 text-sm font-semibold text-slate-950"
                        style={{ background: cat.color }}
                      >
                        {cat.name}
                      </span>
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => removeBox(m.id)}
                        className="absolute -right-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white ring-2 ring-white"
                        aria-label="Remove box"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}

              {/* The box currently being dragged */}
              {drawing && (
                <div
                  className="absolute rounded-sm border-[3px] border-dashed"
                  style={{
                    ...boxStyle({
                      xmin: Math.min(drawing.x0, drawing.x1),
                      xmax: Math.max(drawing.x0, drawing.x1),
                      ymin: Math.min(drawing.y0, drawing.y1),
                      ymax: Math.max(drawing.y0, drawing.y1),
                    }),
                    borderColor: brushCat.color,
                    background: `${brushCat.color}22`,
                  }}
                />
              )}

              {/* Compare mode: legend, then solid = yours, dashed = the AI's, each with a YOU or AI tag */}
              {result && (
                <div className="pointer-events-none absolute right-4 top-4 z-30 flex gap-6 rounded-xl bg-slate-950/85 px-5 py-3 text-2xl font-bold text-white ring-1 ring-slate-600">
                  <span className={`flex items-center gap-3 ${view === "ai" ? "opacity-30" : ""}`}>
                    <span className="h-6 w-10 rounded-sm border-[3px] border-solid border-white" />
                    You
                  </span>
                  <span className={`flex items-center gap-3 ${view === "mine" ? "opacity-30" : ""}`}>
                    <span className="h-6 w-10 rounded-sm border-[3px] border-dashed border-white bg-white/20" />
                    AI
                  </span>
                </div>
              )}

              {result &&
                result.items.map((it) => {
                  const showAi = Boolean(it.ai) && view !== "mine";
                  const showMe = Boolean(it.me) && view !== "ai";
                  if (!showAi && !showMe) return null;

                  const color = STATUS[it.kind].color;
                  // When the visitor picked the wrong type, each box keeps its own type colour
                  // (their pick, and what the AI found) so the difference is visible.
                  // Otherwise both boxes use the result colour.
                  const wrong = it.kind === "wrong";
                  const meColor = wrong ? categoryOf(it.me.group).color : color;
                  const aiColor = wrong ? describe(it.ai).color : color;
                  const dim = selected !== null && selected !== it.key;
                  const on = selected === it.key;
                  return (
                    <div
                      key={it.key}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(on ? null : it.key);
                      }}
                      className={`transition-opacity duration-200 ${dim ? "opacity-25" : "opacity-100"}`}
                    >
                      {showAi && (
                        <>
                          <div
                            className="absolute cursor-pointer rounded-sm"
                            style={{
                              ...boxStyle(it.ai.box),
                              border: `${on ? 4 : 2}px dashed ${aiColor}`,
                              background: `${aiColor}1f`,
                            }}
                          />
                          <Tag
                            box={it.ai.box}
                            side="AI"
                            n={it.key}
                            name={on ? describe(it.ai).name : null}
                            color={aiColor}
                            place={it.ai.box.ymin < 0.05 ? "inside" : "above"}
                          />
                        </>
                      )}
                      {showMe && (
                        <>
                          <div
                            className="absolute cursor-pointer rounded-sm"
                            style={{
                              ...boxStyle(it.me.box),
                              border: `${on ? 4 : 3}px solid ${meColor}`,
                            }}
                          />
                          <Tag
                            box={it.me.box}
                            side="YOU"
                            n={showAi ? null : it.key}
                            name={on ? categoryOf(it.me.group).name : null}
                            color={meColor}
                            place="below"
                          />
                        </>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Side panel */}
        <aside className="flex min-h-0 w-[32rem] shrink-0 flex-col gap-4 rounded-2xl bg-slate-900 p-6 ring-1 ring-slate-800">
          {mode === "draw" && (
            <>
              <div>
                <p className="text-2xl font-semibold text-white">1. Pick what you're boxing</p>
                <p className="text-lg text-slate-400">2. Drag on the image to draw a box around it</p>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto pr-1">
                {categories.map((c) => {
                  const on = brush === c.group;
                  return (
                    <button
                      key={c.group}
                      onClick={() => setBrush(c.group)}
                      className={`flex flex-col items-start rounded-xl border-2 px-3 py-2 text-left transition active:scale-95 ${
                        on ? "bg-slate-800" : "border-transparent bg-slate-800/40 hover:bg-slate-800"
                      }`}
                      style={{ borderColor: on ? c.color : undefined }}
                    >
                      <span className="flex items-center gap-2 text-lg font-semibold text-white">
                        <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: c.color }} />
                        {c.name}
                      </span>
                      <span className="text-sm leading-tight text-slate-400">{c.hint}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xl text-slate-300">
                  Your boxes: <span className="font-mono font-bold text-amber-300">{mine.length}</span>
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMine((m) => m.slice(0, -1))}
                    disabled={mine.length === 0}
                    className="rounded-full border-2 border-slate-600 px-5 py-2 text-lg text-slate-300 transition active:scale-95 disabled:opacity-30"
                  >
                    Undo
                  </button>
                  <button
                    onClick={() => setMine([])}
                    disabled={mine.length === 0}
                    className="rounded-full border-2 border-slate-600 px-5 py-2 text-lg text-slate-300 transition active:scale-95 disabled:opacity-30"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {error && <p className="text-lg text-red-400">{error}</p>}

              <button
                onClick={runCompare}
                disabled={mine.length === 0 || busy}
                className="rounded-2xl bg-amber-400 py-5 text-3xl font-bold text-slate-950 transition active:scale-95 disabled:opacity-40"
              >
                {busy ? "AI is checking…" : mine.length === 0 ? "Draw a box first" : "Compare with AI"}
              </button>
            </>
          )}

          {mode === "compare" && result && (
            <>
              <div>
                <p className="text-xl text-slate-400">You got right</p>
                <p className="font-mono text-6xl font-bold text-amber-300">
                  {result.counts.match}
                  <span className="text-3xl text-slate-500"> / {ai.length}</span>
                </p>
                <p className="text-xl text-slate-300">
                  {ai.length === 0
                    ? "The AI found nothing in this frame"
                    : `of the objects the AI found${
                        result.counts.wrong ? `, ${result.counts.wrong} with the wrong type` : ""
                      }${result.counts.extra ? `, plus ${result.counts.extra} the AI missed` : ""}`}
                </p>
              </div>

              <div>
                <p className="mb-2 text-base text-slate-500">Show on the image</p>
                <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-800 p-1.5">
                  {[
                    ["both", "Both"],
                    ["mine", "Mine"],
                    ["ai", "AI"],
                  ].map(([k, label]) => (
                    <button
                      key={k}
                      onClick={() => setView(k)}
                      className={`rounded-xl py-2.5 text-xl font-semibold transition active:scale-95 ${
                        view === k ? "bg-amber-400 text-slate-950" : "text-slate-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-base text-slate-500">Tap a row below to find it on the image.</p>
              </div>

              <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {result.items.map((it) => {
                  const st = STATUS[it.kind];
                  const info = itemInfo(it);
                  const on = selected === it.key;
                  return (
                    <li key={it.key}>
                      <button
                        onClick={() => setSelected(on ? null : it.key)}
                        className={`flex w-full items-center gap-4 rounded-xl border-2 px-4 py-3 text-left transition active:scale-[0.98] ${
                          on ? "bg-slate-800" : "border-transparent bg-slate-800/40 hover:bg-slate-800"
                        }`}
                        style={{ borderColor: on ? st.color : undefined }}
                      >
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-lg font-bold text-slate-950"
                          style={{ background: st.color }}
                        >
                          {it.key}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xl font-semibold text-white">{info.name}</span>
                          <span className="block truncate text-base text-slate-400">{info.sub}</span>
                        </span>
                        <span className="text-sm font-semibold" style={{ color: st.color }}>
                          {st.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setSelected(null);
                    setMode("draw");
                  }}
                  className="rounded-2xl border-2 border-amber-400 py-3 text-xl font-semibold text-amber-300 transition active:scale-95"
                >
                  Edit my boxes
                </button>
                <button
                  onClick={onClose}
                  className="rounded-2xl bg-amber-400 py-3 text-xl font-bold text-slate-950 transition active:scale-95"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
};

export default ChallengeModal;