// The Case of You — Firebase AI Logic hybrid engine.
//
// Verified against the official Firebase AI Logic hybrid docs for Web:
// - getGenerativeModel MUST be called after/on a user interaction.
// - Backend: new GoogleAIBackend() — the Gemini Developer API (free to start).
// - Inference source: result.response.inferenceSource ("ON_DEVICE" | "IN_CLOUD").
// - Structured output: inCloudParams.generationConfig (responseMimeType +
//   responseSchema) + onDeviceParams.promptOptions.responseConstraint.
// - On-device inference: single-turn text generation only (not chat).
//   Conversation history is managed client-side as condensed memory.
//
// All AI inference in this game goes through Firebase AI Logic. No other
// model APIs are called directly.

import { initializeApp } from "firebase/app";
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  Schema,
} from "firebase/ai";
import { FIREBASE_CONFIG, APP_CHECK_CONFIG, isConfigured } from "./config.js";

// Cloud fallback model. Attested in the Firebase docs as the default
// cloud-hosted fallback model (JS SDK v13.0.0+). Change in one place if the
// backend ever rejects it; Gate 0 in SPEC.md verifies the real call.
export const CLOUD_MODEL = "gemini-3.5-flash-lite";

let app = null;
let ai = null;
let appCheckStatus = "not configured";
let models = null;

// ---------- Schemas (Firebase Schema helpers, per official docs) ----------

export const personalizerSchema = Schema.object({
  properties: {
    alias: Schema.string(),
    hometownEcho: Schema.string(),
    signatureMethod: Schema.string(),
    stormDetail: Schema.string(),
    companionCameo: Schema.string(),
  },
});

export const dialogueSchema = Schema.object({
  properties: {
    reply: Schema.string(),
    mood: Schema.string(),
    memoryUpdate: Schema.string(),
    clueRevealed: Schema.string(),
    trustDelta: Schema.number(),
  },
  optionalProperties: ["clueRevealed"],
});

export const consistencySchema = Schema.object({
  properties: {
    solvable: Schema.enumString({ enum: ["yes", "no"] }),
    contradictions: Schema.array({ items: Schema.string() }),
    fixes: Schema.array({ items: Schema.string() }),
  },
});

// ---------- Setup ----------

export function getAppCheckStatus() {
  return appCheckStatus;
}

export async function initFirebase() {
  if (!isConfigured()) {
    throw new Error("Firebase config is missing. Paste it into js/config.js (see README.md).");
  }
  if (app) return { app, ai };
  app = initializeApp(FIREBASE_CONFIG);
  ai = getAI(app, { backend: new GoogleAIBackend() });

  // App Check: enforced when a reCAPTCHA Enterprise site key is configured.
  // On localhost, set the debug token flag first (standard Firebase debug
  // flow); register the printed token in the Firebase console.
  try {
    const ac = await import("firebase/app-check");
    const isLocal = ["localhost", "127.0.0.1", ""].includes(location.hostname);
    if (isLocal) self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    if (APP_CHECK_CONFIG.recaptchaSiteKey) {
      ac.initializeAppCheck(app, {
        provider: new ac.ReCaptchaEnterpriseProvider(APP_CHECK_CONFIG.recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
      appCheckStatus = isLocal ? "debug token (localhost)" : "reCAPTCHA Enterprise";
    } else {
      appCheckStatus = "not configured (add a site key — see README.md)";
    }
  } catch (e) {
    appCheckStatus = "failed to initialize: " + e.message;
  }
  return { app, ai };
}

// ---------- Model instances (call ONLY after a user gesture) ----------

export function createModels() {
  if (!ai) throw new Error("Call initFirebase() before createModels().");
  if (models) return models;

  // Personalizer: ONLY_ON_DEVICE. Raw answers must never reach the cloud,
  // so this model has no cloud fallback by design — it throws if the
  // on-device model is unavailable, and the game falls back to neutral
  // story elements instead (see game.js).
  const personalizer = getGenerativeModel(ai, {
    mode: InferenceMode.ONLY_ON_DEVICE,
    onDeviceParams: { promptOptions: { responseConstraint: personalizerSchema } },
  });

  // Dialogue: PREFER_ON_DEVICE with cloud fallback, structured output both ways.
  const dialogue = getGenerativeModel(ai, {
    mode: InferenceMode.PREFER_ON_DEVICE,
    inCloudParams: {
      model: CLOUD_MODEL,
      generationConfig: { responseMimeType: "application/json", responseSchema: dialogueSchema },
    },
    onDeviceParams: { promptOptions: { responseConstraint: dialogueSchema } },
  });

  // Plotter (structured): cloud-only. Mystery generation + consistency check.
  const plotter = getGenerativeModel(ai, {
    mode: InferenceMode.ONLY_IN_CLOUD,
    inCloudParams: {
      model: CLOUD_MODEL,
      generationConfig: { responseMimeType: "application/json", responseSchema: consistencySchema },
    },
  });

  // Plotter (text): cloud-only. Endings and briefing prose.
  const plotterText = getGenerativeModel(ai, {
    mode: InferenceMode.ONLY_IN_CLOUD,
    inCloudParams: { model: CLOUD_MODEL },
  });

  models = { personalizer, dialogue, plotter, plotterText };
  return models;
}

// ---------- Calls ----------

function readSource(result) {
  const s = result && result.response && result.response.inferenceSource;
  return s === "ON_DEVICE" || s === "IN_CLOUD" ? s : "UNKNOWN";
}

function parseJSON(text) {
  const clean = String(text).replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("No JSON object in model reply.");
  return JSON.parse(clean.slice(start, end + 1));
}

export async function generateJSON(model, prompt) {
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return { data: parseJSON(text), source: readSource(result), raw: text };
}

export async function generateText(model, prompt) {
  const result = await model.generateContent(prompt);
  return { text: result.response.text(), source: readSource(result) };
}

// ---------- Environment checks (for the setup screen) ----------

export async function checkOnDeviceAvailability() {
  try {
    if (typeof LanguageModel === "undefined" || !LanguageModel.availability) {
      return "unavailable (Prompt API not present in this browser)";
    }
    return await LanguageModel.availability(); // available | downloading | downloadable | unavailable
  } catch (e) {
    return "unavailable (" + e.message + ")";
  }
}

export function getChromeInfo() {
  const m = navigator.userAgent.match(/Chrome\/(\d+)/);
  const isEdge = /Edg\//.test(navigator.userAgent);
  const isOpera = /OPR\//.test(navigator.userAgent);
  if (!m || isEdge || isOpera) return { isChrome: false, version: 0 };
  return { isChrome: true, version: Number(m[1]) };
}
