import "./env.js";
import express from "express";
import cors from "cors";
import { detectImage, listImages } from "./detect.js";

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors()); // the frontend runs on a different address

app.get("/api/health", (req, res) => {
  res.json({ ok: true, hasKey: Boolean(process.env.ROBOFLOW_API_KEY), cacheOnly: process.env.CACHE_ONLY === "1" });
});

// GET /api/images/assets  or  /api/images/defects
app.get("/api/images/:mode", async (req, res) => {
  try {
    res.json(await listImages(req.params.mode));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

async function runDetect(mode, req, res) {
  const { id } = req.params;
  const started = Date.now();
  try {
    const { detections, cached } = await detectImage(mode, id, { fresh: req.query.fresh === "1" });
    console.log(`[detect:${mode}] ${id}: ${detections.length} objects, ${cached ? "cached" : "live"}, ${Date.now() - started}ms`);
    res.json({ detections, cached });
  } catch (e) {
    console.error(`[detect:${mode}] ${id} failed:`, e.message);
    res.status(e.status || 500).json({ error: e.message });
  }
}

// POST /api/detect/assets/road-01       road assets (saved result if there is one, otherwise calls Roboflow)
// POST /api/detect/defects/defect-01    road defects
// Add ?fresh=1 to ignore the saved result and call Roboflow again.
app.post("/api/detect/:mode/:id", (req, res) => runDetect(req.params.mode, req, res));

// Old address, still works for road assets: POST /api/detect/road-01
app.post("/api/detect/:id", (req, res) => runDetect("assets", req, res));

app.listen(PORT, () => console.log(`Booth server running on http://localhost:${PORT}`));