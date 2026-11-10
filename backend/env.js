// Loads .env from the server folder, or from the project root if it isn't there.
// Import this FIRST in every entry file so process.env is ready before anything reads it.
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(here, ".env") });
dotenv.config({ path: path.join(here, "..", ".env") }); // does not override values already set
