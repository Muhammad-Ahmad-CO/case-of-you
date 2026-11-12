// The Case of You — Firebase AI Logic hybrid engine.
//
// Verified against the official Firebase AI Logic hybrid docs for Web:
// - getGenerativeModel MUST be called after/on a user interaction.
// - Backend: new GoogleAIBackend() — the Gemini Developer API (free to start).
// - Inference source: result.response.inferenceSource, whose JS SDK runtime
//   values are "on_device" / "in_cloud" (InferenceSource constants — NOT the
//   "ON_DEVICE" / "IN_CLOUD" enum member names). readSource() normalizes to
//   "ON_DEVICE" / "IN_CLOUD" / "UNKNOWN" so callers never see raw values.
// - Structured output: inCloudParams.generationConfig (responseMimeType +
//   responseSchema) + onDeviceParams.promptOptions.responseConstraint.
// - On-device inference: single-turn text generation only (not chat).
//   Conversation history is managed client-side as condensed memory.
// - On-device model init (Step 6 of the hybrid docs): before ANY query,
//   each on-device model MUST have model.initializeDeviceModel(cb)
//   called after/on a user interaction. The method downloads/prepares
//   the on-device model, reports progress 0..1 via the callback, and
//   returns a promise — await it for ONLY_ON_DEVICE models so a missing
//   model surfaces before the first call. initDeviceModels() performs
//   this for personalizer, dialogue, and notebook.
//   Docs: https://firebase.google.com/docs/ai-logic/hybrid-on-device-inference
//
// All AI inference in this game goes through Firebase AI Logic. No other
// model APIs are called directly.

import { initializeApp } from "firebase/app";
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  InferenceSource,
  Schema,
} from "firebase/ai";
import { FIREBASE_CONFIG, APP_CHECK_CONFIG, isConfigured } from "./config.js";

// Cloud model, pinned deliberately together with the firebase@12.11.0 SDK
// pin in the index.html import map: gemini-3.5-flash-lite is a verified real
// GA model ID, and 12.11.0 is the SDK version whose hybrid behavior
// (inferenceSource values, responseConstraint) was verified against the
// official docs. Do not "upgrade" either without re-verifying the F1
// inference-source values against the official docs. Gate 0 in SPEC.md
// verifies the real call.
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

// Generation schema: mirrors the frozen generated-mystery JSON shape
// (GATE-1 §1) exactly. crime/timeline are optional (declared in
// properties with their types, named in optionalProperties — the same
// pattern as dialogueSchema's clueRevealed); the validator in
// js/mystery.js accepts them missing/null and re-checks counts and
// references the schema cannot express.
export const generationSchema = Schema.object({
  properties: {
    key: Schema.string(),
    culprit: Schema.string(),
    motive: Schema.string(),
    truth: Schema.string(),
    suspects: Schema.array({
      items: Schema.object({
        properties: {
          id: Schema.string(),
          name: Schema.string(),
          role: Schema.string(),
          personality: Schema.string(),
          secret: Schema.string(),
          tell: Schema.string(),
          opening: Schema.string(),
          questions: Schema.array({ items: Schema.string() }),
        },
      }),
    }),
    clues: Schema.array({
      items: Schema.object({
        properties: {
          id: Schema.string(),
          room: Schema.string(),
          via: Schema.enumString({ enum: ["search", "ask", "both"] }),
          text: Schema.string(),
          implicates: Schema.array({ items: Schema.string() }),
        },
      }),
    }),
    crime: Schema.string(),
    timeline: Schema.array({ items: Schema.string() }),
  },
  optionalProperties: ["crime", "timeline"],
});

export const notebookSchema = Schema.object({
  properties: {
    summary: Schema.string(),
    openQuestions: Schema.array({ items: Schema.string() }),
  },
});

// Neutral story elements: the safe fallback whenever personalization is
// unavailable or its output fails validation. Single source of truth —
// game.js must import this instead of keeping its own copy.
export const NEUTRAL_ELEMENTS = {
  alias: "Detective",
  hometownEcho: "You are far from home, and the sea air feels unfamiliar.",
  signatureMethod: "You notice small details others miss.",
  stormDetail: "The storm rattles the windows like something trying to get in.",
  companionCameo: "Your travelling companion waits upstairs, asleep.",
};

// Privacy scrubber (F2): the personalizer runs on-device, but its output is
// later embedded in dialogue prompts that may fall back to the cloud. A
// model echo of a raw questionnaire answer must never reach those prompts.
// Every element except alias (the first name is allowed) is replaced by its
// neutral counterpart if it contains a raw answer — the full answer, or any
// word of it at least 4 characters long, case-insensitive — or if it is
// missing, non-string, or blank. The displayName answer is ignored: the
// alias is the only place a name may appear, and it is exempt by design.
export function scrubElements(elements, answers) {
  const needles = [];
  if (answers && typeof answers === "object") {
    for (const [key, value] of Object.entries(answers)) {
      if (key === "displayName" || typeof value !== "string") continue;
      const clean = value.trim().toLowerCase();
      if (clean.length >= 4) needles.push(clean);
      for (const word of clean.split(/[^a-z0-9]+/)) {
        if (word.length >= 4) needles.push(word);
      }
    }
  }
  let scrubbed = false;
  const out = {};
  for (const field of Object.keys(NEUTRAL_ELEMENTS)) {
    const value = elements && elements[field];
    if (typeof value !== "string" || !value.trim()) {
      out[field] = NEUTRAL_ELEMENTS[field];
      scrubbed = true;
      continue;
    }
    if (field !== "alias" && needles.some((n) => value.toLowerCase().includes(n))) {
      out[field] = NEUTRAL_ELEMENTS[field];
      scrubbed = true;
      continue;
    }
    out[field] = value;
  }
  return { elements: out, scrubbed };
}

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

  // App Check: initialize whenever possible. A site key means real
  // reCAPTCHA Enterprise enforcement. On localhost the debug flag (set
  // before importing App Check, per the official debug-provider docs) makes
  // the SDK use the debug provider instead, so the debug token prints to
  // the console for registration — the site key is unused in debug mode, so
  // a placeholder is safe when no key is configured yet. Without a key on a
  // hosted origin there is nothing valid to initialize with, so the status
  // stays "not configured" and callers must not report App Check as passing.
  // Status is exactly one of: "configured" | "debug" | "not configured".
  try {
    const isLocal = ["localhost", "127.0.0.1", ""].includes(location.hostname);
    const siteKey = APP_CHECK_CONFIG.recaptchaSiteKey;
    if (isLocal) self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    if (siteKey || isLocal) {
      const ac = await import("firebase/app-check");
      ac.initializeAppCheck(app, {
        provider: new ac.ReCaptchaEnterpriseProvider(siteKey || "debug"),
        isTokenAutoRefreshEnabled: true,
      });
      appCheckStatus = isLocal ? "debug" : "configured";
    } else {
      appCheckStatus = "not configured";
    }
  } catch (e) {
    appCheckStatus = "not configured";
    console.warn("App Check failed to initialize:", e);
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

  // Plotter (generation): cloud-only. Generates a fresh mystery matching
  // the frozen JSON shape; js/mystery.js validates before use.
  const plotterGen = getGenerativeModel(ai, {
    mode: InferenceMode.ONLY_IN_CLOUD,
    inCloudParams: {
      model: CLOUD_MODEL,
      generationConfig: { responseMimeType: "application/json", responseSchema: generationSchema },
    },
  });

  // Notebook: PREFER_ON_DEVICE. Summarizes found evidence + condensed
  // memory; see js/notebook.js. On failure the caller renders the notebook
  // deterministically instead.
  const notebook = getGenerativeModel(ai, {
    mode: InferenceMode.PREFER_ON_DEVICE,
    inCloudParams: {
      model: CLOUD_MODEL,
      generationConfig: { responseMimeType: "application/json", responseSchema: notebookSchema },
    },
    onDeviceParams: { promptOptions: { responseConstraint: notebookSchema } },
  });

  models = { personalizer, dialogue, plotter, plotterGen, notebook };
  return models;
}

// On-device init (F7): hybrid Step 6 requires initializeDeviceModel()
// after/on a user interaction and before any query to the model. Called
// by game.js (ensureModels) after createModels — never from inside ai.js.
// Cloud-only models (plotter, plotterGen) have no on-device
// model and are never touched here. Each model's init is isolated: a
// failure is reported in the returned results and never throws, so one
// model's failure cannot block the others. Returns one result per
// on-device model: { key, ok, error } (error is null on success).
export async function initDeviceModels(models, onProgress) {
  const results = [];
  for (const key of ["personalizer", "dialogue", "notebook"]) {
    const model = models && models[key];
    if (!model || typeof model.initializeDeviceModel !== "function") {
      results.push({
        key,
        ok: false,
        error: new Error("initializeDeviceModel is not available on model '" + key + "'."),
      });
      continue;
    }
    try {
      await model.initializeDeviceModel((val) => {
        try {
          onProgress?.(key, val);
        } catch (e) {
          console.warn("initDeviceModels progress callback failed for '" + key + "':", e);
        }
      });
      results.push({ key, ok: true, error: null });
    } catch (e) {
      results.push({ key, ok: false, error: e });
    }
  }
  return results;
}

// ---------- Calls ----------

function readSource(result) {
  const s = result && result.response && result.response.inferenceSource;
  if (s === InferenceSource.ON_DEVICE) return "ON_DEVICE";
  if (s === InferenceSource.IN_CLOUD) return "IN_CLOUD";
  return "UNKNOWN";
}

function parseJSON(text) {
  const clean = String(text).replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("No JSON object in model reply.");
  return JSON.parse(clean.slice(start, end + 1));
}

// Call results: { data, source, raw, error }. Failures (model errors and
// malformed output) are RETURNED as error, never thrown — callers must
// check error before using data, and log failures to the privacy ledger.
// error is null on success.
export async function generateJSON(model, prompt) {
  let result = null;
  try {
    result = await model.generateContent(prompt);
    const text = result.response.text();
    return { data: parseJSON(text), source: readSource(result), raw: text, error: null };
  } catch (e) {
    return { data: null, source: readSource(result), raw: null, error: e };
  }
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
