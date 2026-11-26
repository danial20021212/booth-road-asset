import "./env.js";

const fail = (status, message) => Object.assign(new Error(message), { status });

const MAX_BYTES = 10 * 1024 * 1024; // the browser shrinks photos first, so real uploads are far smaller

// Accepts a data URL ("data:image/jpeg;base64,...") or bare base64, and returns the image bytes.
export function parseImageUpload(body) {
  const raw = typeof body?.image === "string" ? body.image : "";
  if (!raw) throw fail(400, "No image was sent");

  const match = raw.match(/^data:image\/[\w+.-]+;base64,([\s\S]+)$/);
  const buffer = Buffer.from(match ? match[1] : raw, "base64");

  if (buffer.length < 1000) throw fail(400, "That image is too small or damaged");
  if (buffer.length > MAX_BYTES) throw fail(413, "That image is too large");

  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const isWebp = buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  if (!isJpeg && !isPng && !isWebp) throw fail(400, "Only JPG, PNG or WebP images are supported");

  return buffer;
}

// Simple per-visitor limit so nobody can drain the Roboflow credits. In memory, so it resets on restart.
const hits = new Map(); // ip -> [timestamps]

export function allowUpload(ip, now = Date.now()) {
  const limit = Number(process.env.UPLOAD_LIMIT_PER_MIN || 6);
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  if (recent.length >= limit) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

export const uploadsEnabled = () => process.env.ALLOW_UPLOADS !== "0";