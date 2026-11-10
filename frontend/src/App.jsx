import React, { useCallback, useEffect, useRef, useState } from "react";
import { IMAGES } from "./data/images";
import { detect } from "./api";
import { describe, IDLE_RESET_MS, REVEAL_STEP_MS } from "./constants";
import { useIdleReset } from "./hooks/useIdleReset";
import ImageGrid from "./components/ImageGrid";
import Stage from "./components/Stage";
import ClassChips from "./components/ClassChips";
import DetectionList from "./components/DetectionList";
import Spotlight from "./components/Spotlight";

// phase: "select" -> "ready" -> "scanning" -> "result"
const App = () => {
  const [phase, setPhase] = useState("select");
  const [image, setImage] = useState(null);
  const [ratio, setRatio] = useState(16 / 9);
  const [detections, setDetections] = useState([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [activeGroups, setActiveGroups] = useState(new Set());
  const [selected, setSelected] = useState(null); // detection number (n) or null
  const [error, setError] = useState("");
  const runId = useRef(0); // lets us ignore a detection that finishes after a reset

  const clearResults = () => {
    setDetections([]);
    setVisibleCount(0);
    setActiveGroups(new Set());
    setSelected(null);
    setError("");
  };

  const reset = useCallback(() => {
    runId.current += 1;
    setPhase("select");
    setImage(null);
    setDetections([]);
    setVisibleCount(0);
    setActiveGroups(new Set());
    setSelected(null);
    setError("");
  }, []);

  useIdleReset(phase !== "select", IDLE_RESET_MS, reset);

  const pick = (img) => {
    runId.current += 1;
    clearResults();
    setImage(img);
    setPhase("ready");
  };

  const runDetection = async () => {
    const myRun = ++runId.current;
    clearResults();
    setPhase("scanning");
    try {
      const result = await detect(image.id);
      if (myRun !== runId.current) return;
      setDetections(result);
      setActiveGroups(new Set(result.map((d) => describe(d).group)));
      setPhase("result");
    } catch (e) {
      if (myRun !== runId.current) return;
      setError("Something went wrong. Please try again.");
      setPhase("ready");
    }
  };

  // Reveal detections one by one after the scan finishes.
  useEffect(() => {
    if (phase !== "result" || visibleCount >= detections.length) return;
    const t = setTimeout(() => setVisibleCount((c) => c + 1), REVEAL_STEP_MS);
    return () => clearTimeout(t);
  }, [phase, visibleCount, detections.length]);

  const revealed = detections.slice(0, visibleCount);
  const shown = revealed.filter((d) => activeGroups.has(describe(d).group));
  const selectedDet = shown.find((d) => d.n === selected) || null;

  const toggleGroup = (group) => {
    setActiveGroups((prev) => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
    if (selectedDet && describe(selectedDet).group === group) setSelected(null);
  };

  return (
    <div className="flex h-screen w-screen select-none flex-col overflow-hidden bg-slate-950 p-8 text-slate-100">
      {/* Header */}
      <header className="mb-6 flex items-end justify-between">
        <div>
          <p className="font-mono text-lg uppercase tracking-[0.3em] text-cyan-400">AI Road Asset Detection</p>
          <h1 className="text-5xl font-bold tracking-tight">
            {phase === "select" ? "Pick a dashcam frame. Watch the AI find every road asset." : image.title}
          </h1>
        </div>
        {phase !== "select" && (
          <button
            onClick={reset}
            className="rounded-full border-2 border-slate-600 px-8 py-3 text-2xl font-medium text-slate-300 transition hover:border-cyan-400 hover:text-white active:scale-95"
          >
            ← Choose another
          </button>
        )}
      </header>

      {/* Body */}
      <main className="min-h-0 flex-1">
        {phase === "select" ? (
          <ImageGrid images={IMAGES} onPick={pick} />
        ) : (
          <div className="flex h-full gap-8">
            <div className="min-h-0 min-w-0 flex-1">
              <Stage
                image={image}
                ratio={ratio}
                onRatio={setRatio}
                phase={phase}
                detections={shown}
                selected={selected}
                onSelect={setSelected}
              />
            </div>

            {/* Side panel */}
            <aside className="flex min-h-0 w-[32rem] shrink-0 flex-col gap-4 rounded-2xl bg-slate-900 p-6 ring-1 ring-slate-800">
              {phase === "ready" && (
                <>
                  <p className="text-2xl text-slate-300">
                    Our AI will scan this dashcam frame for traffic signs, traffic lights, road markings, feeder
                    pillars, bus stops and more.
                  </p>
                  {error && <p className="text-xl text-red-400">{error}</p>}
                  <div className="relative mt-auto">
                    <span className="absolute inset-0 animate-ping rounded-2xl bg-cyan-400/40" />
                    <button
                      onClick={runDetection}
                      className="relative w-full rounded-2xl bg-cyan-400 py-6 text-4xl font-bold text-slate-950 transition active:scale-95"
                    >
                      Detect assets
                    </button>
                  </div>
                </>
              )}

              {phase === "scanning" && (
                <div className="my-auto text-center">
                  <p className="font-mono text-3xl text-cyan-400">Scanning…</p>
                  <p className="mt-3 text-xl text-slate-400">Looking for signs, lights and road markings</p>
                </div>
              )}

              {phase === "result" && (
                <>
                  <div className="flex items-baseline gap-3">
                    <p className="font-mono text-6xl font-bold text-cyan-400">{revealed.length}</p>
                    <p className="text-2xl text-slate-300">road {detections.length === 1 ? "asset" : "assets"} found</p>
                  </div>

                  <ClassChips detections={revealed} activeGroups={activeGroups} onToggle={toggleGroup} />

                  {selectedDet ? (
                    <Spotlight det={selectedDet} src={image.src} ratio={ratio} />
                  ) : (
                    <p className="text-lg text-slate-500">Tap a number or a row to zoom in on it</p>
                  )}

                  <DetectionList detections={shown} selected={selected} onSelect={setSelected} />

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={runDetection}
                      className="rounded-2xl border-2 border-cyan-400 py-3 text-xl font-semibold text-cyan-300 transition active:scale-95"
                    >
                      Scan again
                    </button>
                    <button
                      onClick={reset}
                      className="rounded-2xl bg-cyan-400 py-3 text-xl font-bold text-slate-950 transition active:scale-95"
                    >
                      Try another
                    </button>
                  </div>
                </>
              )}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
