import "./env.js";
import express from "express";
import cors from "cors";
import { detectBuffer, detectImage, listImages } from "./detect.js";
import { allowUpload, parseImageUpload, uploadsEnabled } from "./uploads.js";

const app = express();
const PORT = process.env.PORT || 8000;

app.set("trust proxy", true); // behind ngrok, so the visitor's real address is used for the upload limit
app.use(cors()); // the frontend runs on a different address

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    hasKey: Boolean(process.env.ROBOFLOW_API_KEY),
    cacheOnly: process.env.CACHE_ONLY === "1",
    uploads: uploadsEnabled(),
  });
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

// POST /api/detect-upload/assets   body: { "image": "data:image/jpeg;base64,..." }
// A visitor's own photo. Always calls Roboflow live, nothing is saved. ALLOW_UPLOADS=0 switches it off.
app.post("/api/detect-upload/:mode", express.json({ limit: "15mb" }), async (req, res) => {
  const { mode } = req.params;
  const started = Date.now();
  try {
    if (!uploadsEnabled()) return res.status(403).json({ error: "Uploads are turned off" });
    if (!allowUpload(req.ip)) return res.status(429).json({ error: "Too many uploads, try again in a minute" });

    const buffer = parseImageUpload(req.body);
    const detections = await detectBuffer(mode, buffer);
    console.log(`[upload:${mode}] ${detections.length} objects, ${Math.round(buffer.length / 1024)}KB, ${Date.now() - started}ms`);
    res.json({ detections });
  } catch (e) {
    console.error(`[upload:${mode}] failed:`, e.message);
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Errors from the body parser (for example a file that is too large) come back as JSON too.
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message });
});

app.listen(PORT, () => console.log(`Booth server running on http://localhost:${PORT}`));