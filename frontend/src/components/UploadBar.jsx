import React, { useRef, useState } from "react";
import { prepareUpload } from "../lib/prepareUpload";

// The bar under the grid of frames. The upload button sits on the left; page dots and a
// "Next" arrow can go on the right later without moving it, so it stays on every page.
// onPhoto receives an image object shaped like the ones in the grid, plus upload: true.
// onPickerOpen(true/false) lets the app pause its idle timer while the file dialog is open.
const UploadBar = ({ onPhoto, onPickerOpen }) => {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const openPicker = () => {
    setError("");
    onPickerOpen(true);
    // The page gets focus back when the dialog closes (chosen or cancelled).
    window.addEventListener("focus", () => setTimeout(() => onPickerOpen(false), 1000), { once: true });
    inputRef.current?.click();
  };

  const onChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // so choosing the same file again still works
    if (!file) return;

    setBusy(true);
    try {
      const { dataUrl } = await prepareUpload(file);
      onPhoto({ id: "upload", title: "Your photo", src: dataUrl, upload: true });
    } catch {
      setError("We couldn't open that file. Please choose a JPG or PNG photo.");
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-6">
      <input ref={inputRef} type="file" accept="image/*" onChange={onChange} className="hidden" />

      <button
        onClick={openPicker}
        disabled={busy}
        className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-cyan-400/70 bg-cyan-400/10 px-8 py-4 text-3xl font-bold text-cyan-300 transition hover:bg-cyan-400/20 active:scale-95 disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
        {busy ? "Preparing photo…" : "Upload your own photo"}
      </button>

      <p className={`max-w-md text-lg ${error ? "text-red-400" : "text-slate-500"}`}>
        {error || "Your photo is sent to the AI to analyse. It is not saved."}
      </p>
    </div>
  );
};

export default UploadBar;