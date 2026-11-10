// Runs every frame through the live API once and saves the results to server/cache.
// Do this before the event so the booth can run from saved results.
//   npm run warm            only frames that have no saved result yet
//   npm run warm -- --fresh redo every frame
import "./env.js";
import { detectImage, listImages } from "./detect.js";

const fresh = process.argv.includes("--fresh");
const images = await listImages();

if (images.length === 0) {
  console.log("No images found. Put frames in public/images first.");
  process.exit(1);
}

for (const { id } of images) {
  try {
    const { detections, cached } = await detectImage(id, { fresh });
    console.log(`${id}: ${detections.length} objects ${cached ? "(already saved)" : "(saved)"}`);
  } catch (e) {
    console.log(`${id}: FAILED - ${e.message}`);
  }
}
