import "./env.js";
import express from "express";
import cors from "cors";
import { detectImage, listImages } from "./detect.js";

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors()); // the Vite dev server runs on a different port

app.get("/api/health", (req, res) => {
  res.json({ ok: true, hasKey: Boolean(process.env.ROBOFLOW_API_KEY), cacheOnly: process.env.CACHE_ONLY === "1" });
});

app.get("/api/images", async (req, res) => {
  try {
    res.json(await listImages());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/detect/road-01          -> saved result if there is one, otherwise calls Roboflow
// POST /api/detect/road-01?fresh=1  -> ignores the saved result and calls Roboflow again
app.post("/api/detect/:id", async (req, res) => {
  const started = Date.now();
  try {
    const { detections, cached } = await detectImage(req.params.id, { fresh: req.query.fresh === "1" });
    console.log(`[detect] ${req.params.id}: ${detections.length} objects, ${cached ? "cached" : "live"}, ${Date.now() - started}ms`);
    res.json({ detections, cached });
  } catch (e) {
    console.error(`[detect] ${req.params.id} failed:`, e.message);
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`Booth server running on http://localhost:${PORT}`));
