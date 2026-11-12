// The Case of You — game logic, screens, and state.
//
// Privacy rule: the player's questionnaire answers live ONLY in
// localStorage on this device, and are never placed in a cloud-bound
// prompt by this code. The on-device personalizer turns them into
// fictionalized story elements (paraphrases, never verbatim copies except
// the first name), and only those elements are sent in later prompts —
// after a code scrubber (see ai.js) replaces any echoed answer text.
// The free-text questions the player types while interrogating suspects
// ARE sent to the model (on-device first, cloud fallback). The privacy
// ledger records every AI call, including failures.
//
// AI call results (see ai.js): generateJSON/generateText RETURN
// { data, source, raw, error } and never throw for model or parse
// failures. Every call site below checks `error` before using `data`.

import {
  initFirebase,
  createModels,
  initDeviceModels,
  generateJSON,
  checkOnDeviceAvailability,
  getChromeInfo,
  getAppCheckStatus,
  NEUTRAL_ELEMENTS,
  scrubElements,
} from "./ai.js";
import { isConfigured } from "./config.js";
import {
  SETTING,
  ROOMS,
  SUSPECTS,
  CLUES,
  MOTIVES,
  MYSTERIES,
  ENDINGS,
  getRoom,
} from "./story.js";
import {
  getActiveCase,
  setActiveCase,
  generateMystery,
  buildGenerationPrompt,
} from "./mystery.js";
import { summarizeNotebook } from "./notebook.js";

const SAVE_KEY = "case-of-you-save-v1";
const MYSTERY_ORDER = ["tomas", "niko", "elsa"];

function freshState() {
  return {
    phase: "title",
    answers: null,
    elements: null,
    mysteryKey: "tomas",
    generatedCase: false,
    generatedMystery: null,
    generationTried: false,
    notebookSummary: null,
    room: "lobby",
    suspect: "elsa",
    foundClues: [],
    memory: { elsa: [], tomas: [], ada: [], osei: [], niko: [] },
    trust: { elsa: 0, tomas: 0, ada: 0, osei: 0, niko: 0 },
    asked: {},
    log: [],
    ledger: [],
    verified: null,
    ended: null,
  };
}

let state = freshState();
let models = null;
let firebaseReady = false;
// On-device init results, logged to the ledger once state is ready (the
// fresh-game flow replaces state after ensureModels runs, so logging
// inside ensureModels would be wiped).
let deviceInitResults = [];

// ---------- Active case ----------
//
// The hand-written case has three culprit variations (MYSTERIES); a
// generated case replaces suspects, clues, and mystery wholesale. This
// helper is the single read path: hand-written play reads the story.js
// consts plus the current variation, generated play reads the validated
// active case from js/mystery.js. Behavior for the hand-written case is
// identical to reading the consts directly.

function currentCase() {
  if (state.generatedCase) return getActiveCase();
  const m = MYSTERIES[state.mysteryKey] || MYSTERIES.tomas;
  return {
    suspects: SUSPECTS,
    clues: CLUES,
    mystery: { key: state.mysteryKey, culprit: m.culprit, motive: m.motive, truth: m.truth },
  };
}

function caseSuspect(id) {
  return currentCase().suspects.find((s) => s.id === id);
}

function caseClue(id) {
  return currentCase().clues.find((c) => c.id === id);
}

// The hand-written case in generated-mystery shape, so the module-level
// active case can be reset to it (validated shape — always accepted).
function handwrittenMystery(key) {
  const m = MYSTERIES[key] || MYSTERIES.tomas;
  return {
    key,
    culprit: m.culprit,
    motive: m.motive,
    truth: m.truth,
    suspects: SUSPECTS,
    clues: CLUES,
  };
}

function resetToHandwritten(key) {
  setActiveCase(handwrittenMystery(key));
}

// Every active suspect needs a memory array and a trust number, including
// suspects from a generated case and saves missing nested keys.
function ensureMemoryTrust() {
  if (!state.memory || typeof state.memory !== "object") state.memory = {};
  if (!state.trust || typeof state.trust !== "object") state.trust = {};
  currentCase().suspects.forEach((s) => {
    if (!Array.isArray(state.memory[s.id])) state.memory[s.id] = [];
    if (typeof state.trust[s.id] !== "number") state.trust[s.id] = 0;
  });
}

// ---------- Small helpers ----------

const $ = (id) => document.getElementById(id);

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => (s.hidden = true));
  $(id).hidden = false;
  window.scrollTo(0, 0);
}

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    setSaveWarning(false);
  } catch (e) {
    /* Storage full or blocked — the game still plays for this session,
       but the player must be told progress is not being saved. */
    setSaveWarning(true);
  }
}

// The warning banner lives outside the screens, so it stays visible on
// every screen until a save succeeds again.
function setSaveWarning(failed) {
  const el = $("save-warning");
  if (el) el.hidden = !failed;
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
    if (!parsed.answers || typeof parsed.answers !== "object" || Array.isArray(parsed.answers)) return false;
    // Wrong shapes are rejected outright; missing nested keys fall back
    // to freshState defaults below. Never crash on a corrupt save.
    const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
    if (parsed.memory !== undefined && !isObj(parsed.memory)) return false;
    if (parsed.trust !== undefined && !isObj(parsed.trust)) return false;
    if (parsed.asked !== undefined && !isObj(parsed.asked)) return false;
    if (parsed.elements !== undefined && parsed.elements !== null && !isObj(parsed.elements)) return false;

    const merged = freshState();
    if (typeof parsed.phase === "string") merged.phase = parsed.phase;
    if (typeof parsed.mysteryKey === "string") merged.mysteryKey = parsed.mysteryKey;
    if (typeof parsed.room === "string") merged.room = parsed.room;
    if (typeof parsed.suspect === "string") merged.suspect = parsed.suspect;
    merged.answers = parsed.answers;
    if (isObj(parsed.elements)) merged.elements = parsed.elements;
    if (Array.isArray(parsed.foundClues)) merged.foundClues = parsed.foundClues.filter((id) => typeof id === "string");
    if (Array.isArray(parsed.log)) merged.log = parsed.log.filter(isObj);
    if (Array.isArray(parsed.ledger)) merged.ledger = parsed.ledger.filter(isObj);
    if (isObj(parsed.memory)) {
      for (const [k, v] of Object.entries(parsed.memory)) {
        if (Array.isArray(v)) merged.memory[k] = v.filter((x) => typeof x === "string");
      }
    }
    if (isObj(parsed.trust)) {
      for (const [k, v] of Object.entries(parsed.trust)) {
        if (typeof v === "number") merged.trust[k] = Math.max(-2, Math.min(2, v));
      }
    }
    if (isObj(parsed.asked)) {
      for (const [k, v] of Object.entries(parsed.asked)) {
        if (typeof v === "number") merged.asked[k] = v;
      }
    }
    merged.verified = parsed.verified !== undefined ? parsed.verified : null;
    merged.ended = typeof parsed.ended === "string" ? parsed.ended : null;
    merged.generatedCase = parsed.generatedCase === true;
    merged.generatedMystery = isObj(parsed.generatedMystery) ? parsed.generatedMystery : null;
    merged.generationTried = parsed.generationTried === true;
    merged.notebookSummary = isObj(parsed.notebookSummary) ? parsed.notebookSummary : null;
    state = merged;

    // Restore the active case to match the save. A generated case only
    // plays if its stored mystery still validates; otherwise fall back
    // to the hand-written case.
    if (state.generatedCase && state.generatedMystery) {
      if (!setActiveCase(state.generatedMystery)) {
        state.generatedCase = false;
        state.generatedMystery = null;
        state.mysteryKey = "tomas";
        resetToHandwritten("tomas");
      }
    } else {
      state.generatedCase = false;
      state.generatedMystery = null;
      if (!MYSTERIES[state.mysteryKey]) state.mysteryKey = "tomas";
      resetToHandwritten(state.mysteryKey);
    }
    ensureMemoryTrust();
    if (!caseSuspect(state.suspect)) state.suspect = currentCase().suspects[0].id;
    if (!getRoom(state.room)) state.room = "lobby";
    state.foundClues = state.foundClues.filter((id) => caseClue(id));
    return true;
  } catch (e) {
    return false;
  }
}

function chipHTML(source) {
  if (source === "ON_DEVICE") return '<span class="chip chip-device">On-device</span>';
  if (source === "IN_CLOUD") return '<span class="chip chip-cloud">Cloud</span>';
  return '<span class="chip chip-unknown">Source unknown</span>';
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function logLedger(feature, mode, source, dataSent) {
  state.ledger.push({ feature, mode, source, dataSent, at: new Date().toISOString() });
  renderLedger();
  save();
}

function renderLedger() {
  const rows = $("ledger-rows");
  if (!state.ledger.length) {
    rows.innerHTML = '<tr><td colspan="3">No AI calls yet. The 5 questionnaire answers stay on this device.</td></tr>';
    return;
  }
  rows.innerHTML = state.ledger
    .map(
      (e) =>
        `<tr><td>${escapeHTML(e.feature)}</td><td>${escapeHTML(e.mode)} · ${escapeHTML(e.source)}</td><td>${escapeHTML(e.dataSent)}</td></tr>`
    )
    .join("");
}

function setOnlinePill() {
  const pill = $("status-online");
  const online = navigator.onLine;
  pill.textContent = online ? "Online" : "Offline — on-device only";
  pill.className = "pill " + (online ? "ok" : "warn");
}

function setModelPill(text) {
  $("status-model").textContent = "Model: " + text;
}

function toast(text) {
  const el = $("clue-toast");
  el.textContent = text;
  el.hidden = false;
}

// ---------- Setup checks ----------

async function runSetupChecks() {
  const list = $("setup-list");
  const chrome = getChromeInfo();
  const availability = await checkOnDeviceAvailability();
  const checks = [
    {
      label: "Firebase config present in js/config.js",
      pass: isConfigured(),
      note: isConfigured() ? "Found." : "Missing — follow the steps below.",
    },
    {
      label: "Desktop Chrome 139 or newer (for on-device inference)",
      pass: chrome.isChrome && chrome.version >= 139,
      note: chrome.isChrome ? "Chrome " + chrome.version + " detected." : "Not Chrome, or version unknown — the game will use cloud inference.",
    },
    {
      label: "On-device model (Gemini Nano via the Chrome Prompt API)",
      pass: availability === "available",
      note: "Status: " + availability + ". If downloadable, open DevTools Console and run: await LanguageModel.create()",
    },
    { label: "Internet connection", pass: navigator.onLine, note: navigator.onLine ? "Online." : "Offline — only on-device features will work." },
  ];

  if (isConfigured()) {
    try {
      await initFirebase();
      firebaseReady = true;
      // App Check status is exactly one of "configured" | "debug" |
      // "not configured". Never report a pass when it is not configured:
      // Firebase AI Logic enforces App Check, and cloud calls are
      // rejected without it.
      const appCheck = getAppCheckStatus();
      checks.push({
        label: "Firebase App Check",
        pass: appCheck === "configured" || appCheck === "debug",
        note:
          appCheck === "configured"
            ? "Active (reCAPTCHA Enterprise)."
            : appCheck === "debug"
              ? "Debug mode on localhost — register the debug token printed in the browser console (see README). Cloud calls work from this browser only."
              : "NOT configured — cloud AI calls will be rejected. Add a reCAPTCHA Enterprise site key (see README).",
      });
    } catch (e) {
      checks.push({ label: "Firebase initialization", pass: false, note: e.message });
    }
  }

  list.innerHTML = checks
    .map((c) => `<li class="${c.pass ? "pass" : "fail"}"><strong>${escapeHTML(c.label)}</strong><br>${escapeHTML(c.note)}</li>`)
    .join("");

  $("setup-instructions").innerHTML = isConfigured()
    ? "<p><strong>Setup looks ready.</strong> If the on-device model is still downloading, the game will use the cloud until it is available — and say so on every reply.</p>"
    : `<p><strong>Firebase config is missing.</strong></p>
       <ol>
         <li>Open the <a href="https://console.firebase.google.com" target="_blank" rel="noopener">Firebase console</a> and create a project (no Google Analytics needed).</li>
         <li>Open <strong>Firebase AI Logic</strong>, click <strong>Get started</strong>, and choose the <strong>Gemini Developer API</strong>.</li>
         <li>Add a <strong>Web app</strong> (&lt;/&gt;) and copy the firebaseConfig values.</li>
         <li>Paste them into <strong>js/config.js</strong> in the GitHub web editor. Never send them in chat.</li>
         <li>Enable the Chrome flag <strong>chrome://flags/#prompt-api-for-gemini-nano-multimodal-input</strong> and restart Chrome.</li>
       </ol>
       <p>Full guide: README.md in this repository.</p>`;

  $("btn-recheck").textContent = isConfigured() ? "Continue to the game" : "Check again";
  $("btn-recheck").onclick = () => {
    if (isConfigured()) showScreen("screen-title");
    else runSetupChecks();
  };

  setModelPill(availability === "available" ? "on-device ready" : "cloud fallback");
  return isConfigured();
}

// ---------- Prompts ----------

function personalizerPrompt(a) {
  return `You turn a player's private answers into fictional story elements for a mystery game.
RULE: never copy any answer verbatim, except the player's first name for the alias. Paraphrase everything else into story flavor. Do not reveal the raw answers.
Player answers:
- name: ${a.displayName}
- hometown: ${a.hometown}
- skill: ${a.skill}
- fear: ${a.fear}
- companion: ${a.companion}
Return JSON only with: alias (detective name from the first name), hometownEcho (one sentence tying the inn to a faraway hometown, WITHOUT naming the town), signatureMethod (a detective method inspired by the skill, paraphrased), stormDetail (one eerie storm detail inspired by the fear, paraphrased), companionCameo (one sentence about the travelling companion waiting upstairs, WITHOUT naming them).`;
}

function dialoguePrompt(suspect, playerLine) {
  const { clues, mystery } = currentCase();
  const isCulprit = mystery.culprit === suspect.id;
  const memory = (state.memory[suspect.id] || []).slice(-6);
  const foundTexts = state.foundClues.map((id) => caseClue(id)).filter(Boolean).map((c) => c.text);
  const askable = clues.filter((c) => c.via !== "search" && !state.foundClues.includes(c.id)).map((c) => c.id);
  const el = state.elements || NEUTRAL_ELEMENTS;
  return `You are ${suspect.name}, ${suspect.role} at The Saltwind Inn, in a detective mystery game.
PERSONALITY: ${suspect.personality}
SECRET (never reveal directly; deflect if asked): ${suspect.secret}
TELL: ${suspect.tell}
TRUTH (never state it outright): ${isCulprit ? "You stole the Harrow Locket. " + mystery.truth : "You did not steal the locket. You are innocent, but you are hiding your secret."}
CASE FACTS: ${SETTING.crime}
WHAT THE DETECTIVE HAS FOUND: ${foundTexts.length ? foundTexts.join(" | ") : "Nothing yet."}
YOUR MEMORY OF THIS DETECTIVE: ${memory.length ? memory.join(" | ") : "You just met."}
THE DETECTIVE: ${el.alias}. ${el.signatureMethod} ${el.hometownEcho}
THE DETECTIVE SAYS: "${playerLine}"
Reply in character, 1-3 sentences. Stay consistent with the case facts and your memory. If asked about something you cannot know, say so in character.
Return JSON only: reply, mood (one word), memoryUpdate (one short sentence about what you learned from this exchange, or ""), clueRevealed (only one of these ids if the conversation naturally reveals it: ${askable.join(", ") || "none"} — otherwise omit), trustDelta (-1, 0, or 1: -1 if the detective was rude or accusing without proof, 1 if kind or clever, else 0).`;
}

function consistencyPrompt() {
  const { suspects, clues, mystery } = currentCase();
  const culprit = caseSuspect(mystery.culprit);
  return `Verify this mystery game case for logical solvability. Return JSON only.
SUSPECTS: ${suspects.map((s) => s.name + " (" + s.role + ")").join(", ")}
CULPRIT: ${culprit ? culprit.name : mystery.culprit}. MOTIVE: ${mystery.motive}. TRUTH: ${mystery.truth}
CLUES: ${clues.map((c) => c.id + ": " + c.text + " (implicates " + c.implicates.join(", ") + ")").join(" | ")}
TIMELINE: ${SETTING.timeline.join(" | ")}
A case is solvable if: the culprit is among the suspects, at least three clues implicate the culprit, no clue contradicts the truth, and the timeline allows the theft between 8pm and 9pm.
Return JSON: solvable ("yes" or "no"), contradictions (array of strings, empty if none), fixes (array of strings, empty if none).`;
}

// ---------- Flow: title -> questions -> personalizing -> briefing ----------

async function ensureModels() {
  if (models) return models;
  await initFirebase();
  firebaseReady = true;
  models = createModels(); // Must run on/after a user gesture (docs requirement).
  // F7: on-device models MUST have initializeDeviceModel() called after/on
  // the gesture and before the first query. initDeviceModels never throws
  // and isolates failures per model; a failed init is reported in the
  // ledger, and the existing call-site fallbacks (neutral elements, cloud
  // fallback, honest errors) handle that model's later calls.
  deviceInitResults = await initDeviceModels(models, () => setModelPill("preparing on-device model…"));
  setModelPill(deviceInitResults.every((r) => r.ok) ? "on-device ready" : "on-device partial (see ledger)");
  return models;
}

// Log any on-device init failures to the ledger. Called after state is
// ready (fresh state for a new game, loaded state for Continue).
function logDeviceInitResults() {
  deviceInitResults.forEach((r) => {
    if (!r.ok) {
      const msg = r.error && r.error.message ? r.error.message : String(r.error);
      logLedger("On-device init — " + r.key, "ONLY_ON_DEVICE", "FAILED", "Device-model init failed (" + msg + "); calls to this model will fail honestly or fall back.");
    }
  });
  deviceInitResults = [];
}

function renderBriefing() {
  const a = state.answers;
  const el = state.elements || NEUTRAL_ELEMENTS;
  const { suspects } = currentCase();
  $("briefing-text").innerHTML =
    `<p><strong>${escapeHTML(el.alias)}</strong> arrives at ${escapeHTML(SETTING.inn)} as the storm closes the road. ${escapeHTML(el.hometownEcho)} ${escapeHTML(el.companionCameo)}</p>` +
    `<p>${escapeHTML(SETTING.crime)}</p>` +
    `<p><em>${escapeHTML(el.signatureMethod)} ${escapeHTML(el.stormDetail)}</em></p>` +
    `<p><strong>Timeline</strong></p><ul>${SETTING.timeline.map((t) => "<li>" + escapeHTML(t) + "</li>").join("")}</ul>` +
    (a ? `<p class="fineprint">Playing as ${escapeHTML(a.displayName)} — your answers are stored only on this device.</p>` : "") +
    `<p id="verify-line" class="fineprint">Case verification: pending…</p>`;
  $("suspect-list").innerHTML = suspects.map(
    (s) =>
      `<div class="suspect-card"><h3>${escapeHTML(s.name)}</h3><div class="role">${escapeHTML(s.role)}</div><p>${escapeHTML(s.personality)}</p></div>`
  ).join("");
}

// A fresh game may ask the cloud plotter to write a new mystery. Only
// validator-passing output is ever activated; on any failure the
// hand-written case plays, with an honest ledger note. Runs at most once
// per playthrough (generationTried), and only while online.
async function runGenerationAttempt() {
  if (state.generatedCase || state.generationTried) return false;
  if (!navigator.onLine || !models || !models.plotterGen) return false;
  state.generationTried = true;
  const line = $("verify-line");
  if (line) line.textContent = "Writing a fresh mystery in the cloud…";
  let mystery = null;
  try {
    mystery = await generateMystery(generateJSON, models.plotterGen, buildGenerationPrompt(state.elements));
  } catch (e) {
    mystery = null; // generateMystery never throws; this is a safety net.
  }
  if (!mystery || !setActiveCase(mystery)) {
    logLedger("Mystery generation", "ONLY_IN_CLOUD", "FAILED", "Generation failed or was rejected after 3 attempts — playing the hand-written case.");
    save();
    return false;
  }
  state.generatedCase = true;
  state.generatedMystery = mystery;
  state.mysteryKey = mystery.key;
  state.memory = {};
  state.trust = {};
  state.asked = {};
  state.foundClues = [];
  state.log = [];
  state.suspect = mystery.suspects[0].id;
  state.notebookSummary = null;
  ensureMemoryTrust();
  // The plotterGen model is ONLY_IN_CLOUD, so a successful generation
  // necessarily ran in the cloud — this is the mode guarantee, not a guess.
  logLedger("Mystery generation", "ONLY_IN_CLOUD", "IN_CLOUD", "Story elements + setting sent to the cloud-only plotter; output validated before play.");
  save();
  renderBriefing();
  return true;
}

async function runConsistencyCheck() {
  const line = $("verify-line");
  if (!navigator.onLine) {
    state.verified = null;
    if (line) line.textContent = "Case verification: paused — you are offline. The case is playable as-is.";
    return;
  }
  let res;
  try {
    res = await generateJSON(models.plotter, consistencyPrompt());
  } catch (e) {
    res = { data: null, source: "UNKNOWN", raw: null, error: e };
  }
  if (res.error || !res.data || (res.data.solvable !== "yes" && res.data.solvable !== "no")) {
    state.verified = null;
    const msg = res.error ? res.error.message || String(res.error) : "the check returned an unusable result";
    logLedger("Consistency check (failed)", "ONLY_IN_CLOUD", "FAILED", "Check failed (" + msg + "); the playable case is unchanged.");
    if (line) line.textContent = "Case verification: could not run (" + msg + "). The case is playable as-is.";
    save();
    return;
  }
  state.verified = res.data;
  logLedger("Consistency check", "ONLY_IN_CLOUD", res.source, "Active case draft + clue list (fictional game data only)");
  if (line) {
    line.textContent =
      res.data.solvable === "yes"
        ? "Case verification: SOLVABLE — checked by cloud AI before play."
        : "Case verification: the check found problems — " + (res.data.contradictions || []).join("; ");
  }
  save();
}

// ---------- Flow: play ----------

function trustLabel(v) {
  if (v <= -2) return "hostile";
  if (v === -1) return "wary";
  if (v === 0) return "neutral";
  if (v === 1) return "warming";
  return "trusting";
}

function renderPlay() {
  const { suspects } = currentCase();
  if (!caseSuspect(state.suspect)) state.suspect = suspects[0].id;
  if (!getRoom(state.room)) state.room = "lobby";
  $("room-list").innerHTML = ROOMS.map(
    (r) =>
      `<li><button type="button" data-room="${r.id}" class="${r.id === state.room ? "active" : ""}">${escapeHTML(r.name)}</button></li>`
  ).join("");
  $("suspect-nav").innerHTML = suspects.map(
    (s) =>
      `<li><button type="button" data-suspect="${s.id}" class="${s.id === state.suspect ? "active" : ""}">${escapeHTML(s.name)} <span class="fineprint">(${trustLabel(state.trust[s.id] || 0)})</span></button></li>`
  ).join("");
  document.querySelectorAll("[data-room]").forEach((b) => (b.onclick = () => { state.room = b.dataset.room; save(); renderPlay(); }));
  document.querySelectorAll("[data-suspect]").forEach(
    (b) =>
      (b.onclick = () => {
        state.suspect = b.dataset.suspect;
        save();
        renderPlay();
      })
  );

  const room = getRoom(state.room);
  const roomClues = state.foundClues.map((id) => caseClue(id)).filter((c) => c && c.room === state.room);
  $("scene-text").innerHTML =
    `<h2>${escapeHTML(room.name)}</h2><p>${escapeHTML(room.description)}</p>` +
    (roomClues.length
      ? `<p><strong>Evidence found here:</strong></p><ul>${roomClues.map((c) => "<li>" + escapeHTML(c.text) + "</li>").join("")}</ul>`
      : `<p class="fineprint">No evidence found here yet. Try searching the room.</p>`);

  renderDialogue();

  const suspect = caseSuspect(state.suspect);
  $("suggested-questions").innerHTML = suspect.questions
    .map((q) => `<button type="button">${escapeHTML(q)}</button>`)
    .join("");
  document.querySelectorAll("#suggested-questions button").forEach(
    (b) =>
      (b.onclick = () => {
        $("ask-input").value = b.textContent;
        $("form-ask").requestSubmit();
      })
  );
}

function renderDialogue() {
  $("dialogue-log").innerHTML = state.log
    .map((m) => {
      if (m.who === "player") return `<div class="msg player"><div class="who">You</div>${escapeHTML(m.text)}</div>`;
      if (m.who === "system") return `<div class="msg"><div class="who">Note</div>${escapeHTML(m.text)}</div>`;
      const speaker = caseSuspect(m.who);
      return `<div class="msg"><div class="who">${speaker ? escapeHTML(speaker.name) : "Suspect"}${m.source ? chipHTML(m.source) : ""}</div>${escapeHTML(m.text)}</div>`;
    })
    .join("");
  $("dialogue-log").scrollTop = $("dialogue-log").scrollHeight;
}

async function askQuestion(line) {
  const suspect = caseSuspect(state.suspect);
  if (!suspect) {
    state.log.push({ who: "system", text: "No suspect is selected. Pick someone to question." });
    renderPlay();
    save();
    return;
  }
  state.log.push({ who: "player", text: line });
  state.asked[suspect.id] = (state.asked[suspect.id] || 0) + 1;
  renderDialogue();
  save();

  const input = $("ask-input");
  input.disabled = true;
  try {
    const res = await generateJSON(models.dialogue, dialoguePrompt(suspect, line));
    if (res.error) {
      const msg = res.error.message || String(res.error);
      state.log.push({ who: "system", text: "The model could not reply: " + msg + " Nothing was faked — try again." });
      logLedger("Interrogation — " + suspect.name + " (failed)", "PREFER_ON_DEVICE", "FAILED", "Call failed (" + msg + "); nothing was faked.");
    } else if (!res.data || typeof res.data.reply !== "string" || !res.data.reply.trim()) {
      state.log.push({ who: "system", text: "The model returned an empty reply. Nothing was faked — try again." });
      logLedger("Interrogation — " + suspect.name + " (empty reply)", "PREFER_ON_DEVICE", res.source, "Model returned an empty reply; nothing was faked.");
    } else {
      const data = res.data;
      const source = res.source;
      state.log.push({ who: suspect.id, text: data.reply.trim(), source });
      if (data.memoryUpdate) {
        if (!Array.isArray(state.memory[suspect.id])) state.memory[suspect.id] = [];
        const mem = state.memory[suspect.id];
        mem.push(data.memoryUpdate);
        while (mem.length > 6) mem.shift();
      }
      if (typeof data.trustDelta === "number") {
        const current = typeof state.trust[suspect.id] === "number" ? state.trust[suspect.id] : 0;
        state.trust[suspect.id] = Math.max(-2, Math.min(2, current + Math.sign(data.trustDelta)));
      }
      // Clue validation: accept ONLY real clue ids that interrogation may reveal.
      if (data.clueRevealed) {
        const clue = caseClue(data.clueRevealed);
        if (clue && clue.via !== "search" && !state.foundClues.includes(clue.id)) {
          state.foundClues.push(clue.id);
          toast("New evidence: " + clue.text);
        }
      }
      logLedger("Interrogation — " + suspect.name, "PREFER_ON_DEVICE", source, "Suspect card + condensed memory + story elements + your typed question (sent to the model; your 5 questionnaire answers are not)");
      setModelPill(source === "ON_DEVICE" ? "on-device" : source === "IN_CLOUD" ? "cloud fallback" : "unknown source");
    }
  } catch (e) {
    // Safety net: generateJSON returns errors instead of throwing, so this
    // only runs for unexpected failures elsewhere in the block.
    state.log.push({ who: "system", text: "The model could not reply: " + e.message + " Nothing was faked — try again." });
    logLedger("Interrogation — " + suspect.name + " (failed)", "PREFER_ON_DEVICE", "FAILED", "Unexpected failure (" + e.message + "); nothing was faked.");
  }
  input.disabled = false;
  input.focus();
  renderPlay();
  save();
}

function searchRoom() {
  const { clues } = currentCase();
  const next = clues.find((c) => c.room === state.room && c.via !== "ask" && !state.foundClues.includes(c.id));
  if (next) {
    state.foundClues.push(next.id);
    toast("New evidence: " + next.text);
  } else {
    toast("Nothing new here. The room has given up its secrets — for now.");
  }
  renderPlay();
  save();
}

// Notebook: deterministic notes always render immediately; the AI summary
// is attempted on top and replaces its placeholder. A token guards
// against a slow call overwriting a newer render.
let notebookToken = 0;

function setNotebookAI(token, html) {
  if (token !== notebookToken) return;
  const el = $("notebook-ai");
  if (el) el.innerHTML = html;
}

async function renderNotebook() {
  const token = ++notebookToken;
  const { suspects, clues } = currentCase();
  const open = [];
  suspects.forEach((s) => {
    if (!state.asked[s.id]) open.push("You have not questioned " + s.name + " yet.");
  });
  ROOMS.forEach((r) => {
    if (clues.some((c) => c.room === r.id && c.via !== "ask" && !state.foundClues.includes(c.id))) {
      open.push(r.name + " may still hold evidence.");
    }
  });
  $("notebook-content").innerHTML =
    `<h2>AI case summary</h2><div id="notebook-ai"><p class="fineprint">Writing a summary of your case…</p></div>` +
    `<h2>Evidence (${state.foundClues.length} of ${clues.length})</h2>` +
    (state.foundClues.length
      ? `<ul>${state.foundClues.map((id) => caseClue(id)).filter(Boolean).map((c) => "<li>" + escapeHTML(c.text) + "</li>").join("")}</ul>`
      : "<p>No evidence yet.</p>") +
    `<h2>Timeline</h2><ul>${SETTING.timeline.map((t) => "<li>" + escapeHTML(t) + "</li>").join("")}</ul>` +
    `<h2>Open questions</h2>` +
    (open.length ? `<ul>${open.map((q) => "<li>" + escapeHTML(q) + "</li>").join("")}</ul>` : "<p>None. You are ready to present your case.</p>") +
    `<h2>What suspects remember</h2>` +
    suspects.map((s) =>
      (state.memory[s.id] || []).length
        ? `<p><strong>${escapeHTML(s.name)}:</strong> ${escapeHTML(state.memory[s.id].join(" "))}</p>`
        : ""
    ).join("");

  if (!navigator.onLine) {
    setNotebookAI(token, `<p class="fineprint">AI summary paused — you are offline. Your notes below are complete as written.</p>`);
    return;
  }
  if (!models || !models.notebook) {
    setNotebookAI(token, `<p class="fineprint">AI summary is not available in this session. Your notes below are complete as written.</p>`);
    return;
  }
  try {
    const summary = await summarizeNotebook(models, state);
    if (token !== notebookToken) return;
    // summarizeNotebook does not report the inference source, so the
    // stored source is UNKNOWN — never guessed.
    state.notebookSummary = { summary: summary.summary, openQuestions: summary.openQuestions, source: "UNKNOWN" };
    logLedger("Notebook summary", "PREFER_ON_DEVICE", "UNKNOWN", "Found evidence + condensed memory (no questionnaire answers)");
    save();
    setNotebookAI(
      token,
      `<div class="note-ai"><p>${escapeHTML(summary.summary)}</p>` +
        (summary.openQuestions.length
          ? `<p><strong>Open questions:</strong></p><ul>${summary.openQuestions.map((q) => "<li>" + escapeHTML(q) + "</li>").join("")}</ul>`
          : "") +
        `</div><p class="fineprint">Summary written by the notebook model. ${chipHTML("UNKNOWN")}</p>`
    );
  } catch (e) {
    if (token !== notebookToken) return;
    state.notebookSummary = null;
    logLedger("Notebook summary (fallback)", "PREFER_ON_DEVICE", "FAILED", "AI summary failed (" + e.message + ") — deterministic notes shown instead.");
    save();
    setNotebookAI(token, `<p class="fineprint">The AI summary could not be written (${escapeHTML(e.message)}). Your notes below are complete as written — nothing was faked.</p>`);
  }
}

// ---------- Flow: accusation + ending ----------

function renderAccusation() {
  const { suspects, mystery } = currentCase();
  $("accuse-culprit").innerHTML = suspects.map((s) => `<option value="${s.id}">${escapeHTML(s.name)} — ${escapeHTML(s.role)}</option>`).join("");
  // The active motive must always be pickable — a generated case may use
  // a motive outside the hand-written list.
  const motiveOptions = MOTIVES.includes(mystery.motive) ? MOTIVES : [...MOTIVES, mystery.motive];
  $("accuse-motive").innerHTML = motiveOptions.map((m) => `<option>${escapeHTML(m)}</option>`).join("");
  $("accuse-clues").innerHTML = state.foundClues.length
    ? state.foundClues
        .map((id) => caseClue(id))
        .filter(Boolean)
        .map((c) => `<label><input type="checkbox" value="${c.id}"> ${escapeHTML(c.text)}</label>`)
        .join("")
    : "<p>You have no evidence yet. Search rooms and question suspects first.</p>";
}

function evaluateAccusation(culpritId, motive, clueIds) {
  const { mystery } = currentCase();
  if (culpritId !== mystery.culprit) return "wrong";
  const chainValid =
    clueIds.length === 3 &&
    clueIds.every((id) => {
      const c = caseClue(id);
      return c && c.implicates.includes(culpritId);
    });
  if (motive === mystery.motive && chainValid) return "perfect";
  return "partial";
}

function renderEnding(endingId) {
  const ending = ENDINGS[endingId];
  const { clues, mystery } = currentCase();
  const culprit = caseSuspect(mystery.culprit);
  const deviceCount = state.ledger.filter((e) => e.source === "ON_DEVICE").length;
  const cloudCount = state.ledger.filter((e) => e.source === "IN_CLOUD").length;
  $("ending-title").textContent = ending.title;
  $("ending-text").innerHTML =
    `<p>${escapeHTML(ending.text)}</p>` +
    `<p><strong>The truth:</strong> ${escapeHTML(mystery.truth)}</p>` +
    (state.elements ? `<p><em>${escapeHTML(state.elements.alias)} — the inn will remember this night, and so will you.</em></p>` : "");
  $("ending-summary").innerHTML =
    `<p><strong>Case summary</strong></p><ul>` +
    `<li>Culprit: ${escapeHTML(culprit ? culprit.name : mystery.culprit)} — ${escapeHTML(mystery.motive)}</li>` +
    `<li>Evidence found: ${state.foundClues.length} of ${clues.length} clues</li>` +
    `<li>Questions asked: ${Object.values(state.asked).reduce((a, b) => a + b, 0)}</li>` +
    `<li>AI replies: ${deviceCount} on-device, ${cloudCount} in the cloud (see the privacy ledger)</li>` +
    `<li>Case verified solvable before play: ${state.verified && state.verified.solvable === "yes" ? "yes" : "not verified"}</li></ul>`;
}

// ---------- Wiring ----------

function wire() {
  window.addEventListener("online", setOnlinePill);
  window.addEventListener("offline", setOnlinePill);
  setOnlinePill();
  renderLedger();

  $("btn-ledger").onclick = () => { $("ledger-panel").hidden = false; };
  $("btn-close-ledger").onclick = () => { $("ledger-panel").hidden = true; };

  // Continue button (only when a save exists).
  if (load()) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-secondary btn-large";
    btn.textContent = "Continue your case";
    btn.style.marginLeft = "0.6rem";
    btn.onclick = async () => {
      try {
        await ensureModels();
        logDeviceInitResults();
        if (state.phase === "briefing") {
          renderBriefing();
          showScreen("screen-briefing");
          await runGenerationAttempt();
          runConsistencyCheck();
        } else if (state.ended) { renderEnding(state.ended); showScreen("screen-ending"); }
        else { renderPlay(); showScreen("screen-play"); }
      } catch (e) {
        alert("Could not start: " + e.message);
      }
    };
    $("btn-begin").after(btn);
  }

  $("btn-begin").onclick = async () => {
    try {
      await ensureModels();
      state = freshState();
      resetToHandwritten("tomas");
      state.phase = "questions";
      save();
      logDeviceInitResults();
      showScreen("screen-questions");
    } catch (e) {
      alert("Could not start: " + e.message + " Check the setup screen.");
      showScreen("screen-setup");
    }
  };

  $("form-questions").onsubmit = async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    state.answers = {
      displayName: String(fd.get("displayName")).trim(),
      hometown: String(fd.get("hometown")).trim(),
      skill: String(fd.get("skill")).trim(),
      fear: String(fd.get("fear")).trim(),
      companion: String(fd.get("companion")).trim(),
    };
    state.phase = "personalizing";
    save();
    showScreen("screen-personalizing");
    $("personalize-status").textContent = "Turning your answers into story — on this device.";
    let res;
    try {
      res = await generateJSON(models.personalizer, personalizerPrompt(state.answers));
    } catch (e) {
      res = { data: null, source: "UNKNOWN", raw: null, error: e };
    }
    if (res.error || !res.data) {
      // Honest fallback: neutral elements. Answers are NEVER sent to the cloud.
      state.elements = NEUTRAL_ELEMENTS;
      const chipEl = $("personalize-chip");
      chipEl.className = "chip chip-unknown";
      chipEl.textContent = "Neutral fallback";
      const msg = res.error ? res.error.message || String(res.error) : "the model returned nothing usable";
      $("personalize-status").textContent =
        "The on-device model was not available (" + msg + "), so neutral story elements were used. Your answers stayed on this device.";
      logLedger("Personalization (fallback)", "ONLY_ON_DEVICE", "FAILED", "No data sent — neutral elements used locally");
    } else {
      // The scrubber enforces the no-verbatim rule in code: any element
      // echoing a raw answer is replaced with neutral text before it can
      // reach a later prompt that may fall back to the cloud.
      const { elements, scrubbed } = scrubElements(res.data, state.answers);
      state.elements = elements;
      const chipEl = $("personalize-chip");
      chipEl.className = res.source === "ON_DEVICE" ? "chip chip-device" : res.source === "IN_CLOUD" ? "chip chip-cloud" : "chip chip-unknown";
      chipEl.textContent = res.source === "ON_DEVICE" ? "On-device" : res.source === "IN_CLOUD" ? "Cloud" : "Source unknown";
      $("personalize-status").textContent = "Your mystery is written. Your answers never left this device.";
      logLedger("Personalization", "ONLY_ON_DEVICE", res.source, "Your 5 answers — processed on-device, never sent anywhere");
      if (scrubbed) {
        logLedger("Personalization — output scrubbed", "ONLY_ON_DEVICE", res.source, "Model output echoed raw answers or was malformed; affected elements replaced with neutral text locally.");
      }
    }
    state.phase = "briefing";
    save();
    renderBriefing();
    showScreen("screen-briefing");
    await runGenerationAttempt();
    runConsistencyCheck();
  };

  $("btn-investigate").onclick = () => {
    state.phase = "play";
    let suspect = caseSuspect(state.suspect);
    if (!suspect) {
      suspect = currentCase().suspects[0];
      state.suspect = suspect.id;
    }
    if (!state.log.length) state.log.push({ who: suspect.id, text: suspect.opening, source: null });
    save();
    renderPlay();
    showScreen("screen-play");
  };

  $("form-ask").onsubmit = (ev) => {
    ev.preventDefault();
    const line = $("ask-input").value.trim();
    if (!line) return;
    $("ask-input").value = "";
    askQuestion(line);
  };

  $("btn-search").onclick = searchRoom;
  $("btn-notebook").onclick = () => { renderNotebook(); showScreen("screen-notebook"); };
  $("btn-close-notebook").onclick = () => { renderPlay(); showScreen("screen-play"); };
  $("btn-accuse").onclick = () => { renderAccusation(); showScreen("screen-accusation"); };

  // Abandon button on the accusation screen (the "cold case" ending).
  const abandon = document.createElement("button");
  abandon.type = "button";
  abandon.className = "btn btn-ghost";
  abandon.textContent = "Abandon the case";
  abandon.onclick = () => {
    state.ended = "cold";
    state.phase = "ending";
    save();
    renderEnding("cold");
    showScreen("screen-ending");
  };
  $("form-accuse").appendChild(abandon);

  $("form-accuse").onsubmit = (ev) => {
    ev.preventDefault();
    const picked = [...document.querySelectorAll("#accuse-clues input:checked")].map((el) => el.value);
    if (picked.length !== 3) {
      alert("Pick exactly three clues — the three that prove your case.");
      return;
    }
    const endingId = evaluateAccusation($("accuse-culprit").value, $("accuse-motive").value, picked);
    state.ended = endingId;
    state.phase = "ending";
    save();
    renderEnding(endingId);
    showScreen("screen-ending");
  };

  $("btn-replay").onclick = () => {
    const idx = MYSTERY_ORDER.indexOf(state.mysteryKey);
    const nextKey = MYSTERY_ORDER[(idx + 1) % MYSTERY_ORDER.length];
    const answers = state.answers;
    const elements = state.elements;
    const ledger = state.ledger;
    state = freshState();
    state.answers = answers;
    state.elements = elements;
    state.ledger = ledger;
    state.mysteryKey = nextKey;
    // Replay cycles the hand-written culprit variations; no new
    // generation attempt, so the rotation always works.
    state.generationTried = true;
    resetToHandwritten(nextKey);
    ensureMemoryTrust();
    state.phase = "briefing";
    save();
    renderBriefing();
    showScreen("screen-briefing");
    runConsistencyCheck();
  };

  $("btn-title2").onclick = () => {
    state = freshState();
    resetToHandwritten("tomas");
    save();
    showScreen("screen-title");
  };
}

// ---------- Boot ----------

wire();
runSetupChecks().then((configured) => {
  if (configured) showScreen("screen-title");
  else showScreen("screen-setup");
});
