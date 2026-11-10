import "./env.js";
import { DETECT_PROMPT } from "./prompt.js";

const DEFAULT_URL = "https://serverless.roboflow.com/danial-lja5y/workflows/gemini-4-argon-open-prompt";

// Sends one image (base64) through the Roboflow workflow and returns the raw JSON response.
export async function runWorkflow(base64) {
  const key = process.env.ROBOFLOW_API_KEY;
  if (!key) throw new Error("ROBOFLOW_API_KEY is missing from .env");

  const inputs = { image: { type: "base64", value: base64 } };

  // Name of the workflow input that receives the prompt. Set ROBOFLOW_PROMPT_INPUT= (empty)
  // in .env if the prompt is already saved inside the workflow itself.
  const promptInput = process.env.ROBOFLOW_PROMPT_INPUT ?? "prompt";
  if (promptInput) inputs[promptInput] = DETECT_PROMPT;

  const res = await fetch(process.env.ROBOFLOW_URL || DEFAULT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: key, inputs }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Roboflow ${res.status}: ${text.slice(0, 400)}`);
  return JSON.parse(text);
}

// ---- Pulling the detections out of the response ----
// Gemini returns its answer as text, so it can sit anywhere in the workflow output,
// often as a string wrapped in ```json fences. We search the whole response for it.

const looksLikeDetections = (v) =>
  Array.isArray(v) && v.length > 0 && v.every((x) => x && typeof x === "object" && Array.isArray(x.box_2d));

const parseMaybeJson = (s) => {
  const cleaned = s.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\[[\s\S]*\]/); // last resort: grab the first [...] block
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        /* fall through */
      }
    }
  }
  return undefined;
};

function walk(node) {
  if (node == null) return null;

  if (typeof node === "string") {
    const parsed = parseMaybeJson(node);
    if (Array.isArray(parsed) && parsed.length === 0) return []; // Gemini said "nothing found"
    return parsed === undefined ? null : walk(parsed);
  }

  if (Array.isArray(node)) {
    if (looksLikeDetections(node)) return node;
    for (const item of node) {
      const found = walk(item);
      if (found) return found;
    }
    return null;
  }

  if (typeof node === "object") {
    for (const value of Object.values(node)) {
      const found = walk(value);
      if (found) return found;
    }
  }
  return null;
}

export function extractDetections(response) {
  const found = walk(response);
  if (!found) {
    const preview = JSON.stringify(response).slice(0, 600);
    throw new Error(`Could not find detections in the Roboflow response. Start of response: ${preview}`);
  }
  return found.filter((d) => d && Array.isArray(d.box_2d) && d.box_2d.length === 4);
}
