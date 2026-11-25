// Runs every frame through the live API once and saves the results to server/cache.
// Do this before the event so the booth can run from saved results.
//   node warm.js                  both road assets and road defects, only frames with no saved result
//   node warm.js defects          only road defects
//   node warm.js assets --fresh   redo every road asset frame (use after changing the prompt)
import "./env.js";
import { detectImage, listImages, MODE_NAMES } from "./detect.js";

const args = process.argv.slice(2);
const fresh = args.includes("--fresh");
const picked = args.find((a) => MODE_NAMES.includes(a));
const modes = picked ? [picked] : MODE_NAMES;

for (const mode of modes) {
  console.log(`\n== ${mode} ==`);
  let images;
  try {
    images = await listImages(mode);
  } catch (e) {
    console.log(`Cannot read the ${mode} images folder (${e.message})`);
    continue;
  }
  if (images.length === 0) {
    console.log("No images found.");
    continue;
  }

  for (const { id } of images) {
    try {
      const { detections, cached } = await detectImage(mode, id, { fresh });
      console.log(`${id}: ${detections.length} objects ${cached ? "(already saved)" : "(saved)"}`);
    } catch (e) {
      console.log(`${id}: FAILED - ${e.message}`);
    }
  }
}