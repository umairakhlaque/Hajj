// Quick diagnostic — run with: node test-gemini.mjs
import { createRequire } from "module";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Manually load .env and .env.local
function loadEnv(file) {
  const p = resolve(process.cwd(), file);
  if (!existsSync(p)) return;
  const lines = readFileSync(p, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val; // don't override existing
  }
}

loadEnv(".env");
loadEnv(".env.local");

const apiKey = process.env.GEMINI_API_KEY;
console.log("\n=== Gemini Diagnostic ===");
console.log("GEMINI_API_KEY present:", !!apiKey);
if (!apiKey) {
  console.error("ERROR: GEMINI_API_KEY is not set in .env or .env.local");
  process.exit(1);
}
console.log("Key prefix:", apiKey.slice(0, 8) + "...");

const require = createRequire(import.meta.url);
let GoogleGenerativeAI;
try {
  ({ GoogleGenerativeAI } = require("@google/generative-ai"));
} catch {
  console.error("ERROR: @google/generative-ai not installed. Run: npm install");
  process.exit(1);
}

const gemini = new GoogleGenerativeAI(apiKey);
const model = gemini.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: "You are a helpful Hajj assistant. Answer briefly.",
});

console.log("\nSending test question to Gemini...");
try {
  const result = await model.generateContent("What is Hajj? Answer in 1 sentence.");
  const text = result.response.text();
  console.log("\nGemini response:", text);
  console.log("\n✅ Gemini is working correctly!\n");
} catch (err) {
  console.error("\nERROR calling Gemini:", err.message || err);
  process.exit(1);
}
