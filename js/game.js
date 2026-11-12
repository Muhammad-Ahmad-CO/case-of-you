// The Case of You — game logic, screens, and state.
//
// Privacy rule, enforced here: the player's raw answers live ONLY in
// localStorage on this device. The cloud never sees them. The on-device
// personalizer turns them into fictionalized story elements (paraphrases,
// never verbatim copies except the first name), and only those elements
// are ever sent in later prompts. The privacy ledger records every call.

import {
  initFirebase,
  createModels,
  generateJSON,
  checkOnDeviceAvailability,
  getChromeInfo,
  getAppCheckStatus,
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
  getSuspect,
  getClue,
  getRoom,
} from "./story.js";

const SAVE_KEY = "case-of-you-save-v1";
const MYSTERY_ORDER = ["tomas", "niko", "elsa"];

const NEUTRAL_ELEMENTS = {
  alias: "Detective",
  hometownEcho: "You are far from home, and the sea air feels unfamiliar.",
  signatureMethod: "You notice small details others miss.",
  stormDetail: "The storm rattles the windows like something trying to get in.",
  companionCameo: "Your travelling companion waits upstairs, asleep.",
};

function freshState() {
  return {
    phase: "title",
    answers: null,
    elements: null,
    mysteryKey: "tomas",
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
  } catch (e) {
    /* Storage full or blocked — the game still plays for this session. */
  }
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.answers) return false;
    state = Object.assign(freshState(), parsed);
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
    rows.innerHTML = '<tr><td colspan="3">No AI calls yet. Your raw answers have never left this device.</td></tr>';
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
      checks.push({ label: "Firebase App Check", pass: true, note: getAppCheckStatus() });
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
  const mystery = MYSTERIES[state.mysteryKey];
  const isCulprit = mystery.culprit === suspect.id;
  const memory = state.memory[suspect.id].slice(-6);
  const foundTexts = state.foundClues.map((id) => getClue(id).text);
  const askable = CLUES.filter((c) => c.via !== "search" && !state.foundClues.includes(c.id)).map((c) => c.id);
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
  const mystery = MYSTERIES[state.mysteryKey];
  return `Verify this mystery game case for logical solvability. Return JSON only.
CULPRIT: ${getSuspect(mystery.culprit).name}. MOTIVE: ${mystery.motive}. TRUTH: ${mystery.truth}
CLUES: ${CLUES.map((c) => c.id + ": " + c.text + " (implicates " + c.implicates.join(", ") + ")").join(" | ")}
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
  return models;
}

function renderBriefing() {
  const a = state.answers;
  const el = state.elements || NEUTRAL_ELEMENTS;
  $("briefing-text").innerHTML =
    `<p><strong>${escapeHTML(el.alias)}</strong> arrives at ${escapeHTML(SETTING.inn)} as the storm closes the road. ${escapeHTML(el.hometownEcho)} ${escapeHTML(el.companionCameo)}</p>` +
    `<p>${escapeHTML(SETTING.crime)}</p>` +
    `<p><em>${escapeHTML(el.signatureMethod)} ${escapeHTML(el.stormDetail)}</em></p>` +
    `<p><strong>Timeline</strong></p><ul>${SETTING.timeline.map((t) => "<li>" + escapeHTML(t) + "</li>").join("")}</ul>` +
    (a ? `<p class="fineprint">Playing as ${escapeHTML(a.displayName)} — your answers are stored only on this device.</p>` : "") +
    `<p id="verify-line" class="fineprint">Case verification: pending…</p>`;
  $("suspect-list").innerHTML = SUSPECTS.map(
    (s) =>
      `<div class="suspect-card"><h3>${escapeHTML(s.name)}</h3><div class="role">${escapeHTML(s.role)}</div><p>${escapeHTML(s.personality)}</p></div>`
  ).join("");
}

async function runConsistencyCheck() {
  const line = $("verify-line");
  if (!navigator.onLine) {
    state.verified = null;
    if (line) line.textContent = "Case verification: paused — you are offline. The hand-written case is playable as-is.";
    return;
  }
  try {
    const { data, source } = await generateJSON(models.plotter, consistencyPrompt());
    state.verified = data;
    logLedger("Consistency check", "ONLY_IN_CLOUD", source, "Mystery draft + clue list (fictional game data only)");
    if (line) {
      line.textContent =
        data.solvable === "yes"
          ? "Case verification: SOLVABLE — checked by cloud AI before play."
          : "Case verification: the check found problems — " + (data.contradictions || []).join("; ");
    }
    save();
  } catch (e) {
    state.verified = null;
    if (line) line.textContent = "Case verification: could not run (" + e.message + "). The hand-written case is playable as-is.";
  }
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
  $("room-list").innerHTML = ROOMS.map(
    (r) =>
      `<li><button type="button" data-room="${r.id}" class="${r.id === state.room ? "active" : ""}">${escapeHTML(r.name)}</button></li>`
  ).join("");
  $("suspect-nav").innerHTML = SUSPECTS.map(
    (s) =>
      `<li><button type="button" data-suspect="${s.id}" class="${s.id === state.suspect ? "active" : ""}">${escapeHTML(s.name)} <span class="fineprint">(${trustLabel(state.trust[s.id])})</span></button></li>`
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
  const roomClues = state.foundClues.filter((id) => getClue(id).room === state.room);
  $("scene-text").innerHTML =
    `<h2>${escapeHTML(room.name)}</h2><p>${escapeHTML(room.description)}</p>` +
    (roomClues.length
      ? `<p><strong>Evidence found here:</strong></p><ul>${roomClues.map((id) => "<li>" + escapeHTML(getClue(id).text) + "</li>").join("")}</ul>`
      : `<p class="fineprint">No evidence found here yet. Try searching the room.</p>`);

  renderDialogue();

  const suspect = getSuspect(state.suspect);
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
      return `<div class="msg"><div class="who">${escapeHTML(getSuspect(m.who).name)}${m.source ? chipHTML(m.source) : ""}</div>${escapeHTML(m.text)}</div>`;
    })
    .join("");
  $("dialogue-log").scrollTop = $("dialogue-log").scrollHeight;
}

async function askQuestion(line) {
  const suspect = getSuspect(state.suspect);
  state.log.push({ who: "player", text: line });
  state.asked[suspect.id] = (state.asked[suspect.id] || 0) + 1;
  renderDialogue();
  save();

  const input = $("ask-input");
  input.disabled = true;
  try {
    const { data, source } = await generateJSON(models.dialogue, dialoguePrompt(suspect, line));
    if (!data || typeof data.reply !== "string" || !data.reply.trim()) {
      throw new Error("The model returned an empty reply.");
    }
    state.log.push({ who: suspect.id, text: data.reply.trim(), source });
    if (data.memoryUpdate) {
      const mem = state.memory[suspect.id];
      mem.push(data.memoryUpdate);
      while (mem.length > 6) mem.shift();
    }
    if (typeof data.trustDelta === "number") {
      state.trust[suspect.id] = Math.max(-2, Math.min(2, state.trust[suspect.id] + Math.sign(data.trustDelta)));
    }
    // Clue validation: accept ONLY real clue ids that interrogation may reveal.
    if (data.clueRevealed) {
      const clue = getClue(data.clueRevealed);
      if (clue && clue.via !== "search" && !state.foundClues.includes(clue.id)) {
        state.foundClues.push(clue.id);
        toast("New evidence: " + clue.text);
      }
    }
    logLedger("Interrogation — " + suspect.name, "PREFER_ON_DEVICE", source, "Suspect card + condensed memory + your question (story elements only, no raw answers)");
    setModelPill(source === "ON_DEVICE" ? "on-device" : source === "IN_CLOUD" ? "cloud fallback" : "unknown source");
  } catch (e) {
    state.log.push({ who: "system", text: "The model could not reply: " + e.message + " Nothing was faked — try again." });
  }
  input.disabled = false;
  input.focus();
  renderPlay();
  save();
}

function searchRoom() {
  const next = CLUES.find((c) => c.room === state.room && c.via !== "ask" && !state.foundClues.includes(c.id));
  if (next) {
    state.foundClues.push(next.id);
    toast("New evidence: " + next.text);
  } else {
    toast("Nothing new here. The room has given up its secrets — for now.");
  }
  renderPlay();
  save();
}

function renderNotebook() {
  const open = [];
  SUSPECTS.forEach((s) => {
    if (!state.asked[s.id]) open.push("You have not questioned " + s.name + " yet.");
  });
  ROOMS.forEach((r) => {
    if (CLUES.some((c) => c.room === r.id && c.via !== "ask" && !state.foundClues.includes(c.id))) {
      open.push(r.name + " may still hold evidence.");
    }
  });
  $("notebook-content").innerHTML =
    `<h2>Evidence (${state.foundClues.length} of ${CLUES.length})</h2>` +
    (state.foundClues.length
      ? `<ul>${state.foundClues.map((id) => "<li>" + escapeHTML(getClue(id).text) + "</li>").join("")}</ul>`
      : "<p>No evidence yet.</p>") +
    `<h2>Timeline</h2><ul>${SETTING.timeline.map((t) => "<li>" + escapeHTML(t) + "</li>").join("")}</ul>` +
    `<h2>Open questions</h2>` +
    (open.length ? `<ul>${open.map((q) => "<li>" + escapeHTML(q) + "</li>").join("")}</ul>` : "<p>None. You are ready to present your case.</p>") +
    `<h2>What suspects remember</h2>` +
    SUSPECTS.map((s) =>
      state.memory[s.id].length
        ? `<p><strong>${escapeHTML(s.name)}:</strong> ${escapeHTML(state.memory[s.id].join(" "))}</p>`
        : ""
    ).join("");
}

// ---------- Flow: accusation + ending ----------

function renderAccusation() {
  $("accuse-culprit").innerHTML = SUSPECTS.map((s) => `<option value="${s.id}">${escapeHTML(s.name)} — ${escapeHTML(s.role)}</option>`).join("");
  $("accuse-motive").innerHTML = MOTIVES.map((m) => `<option>${escapeHTML(m)}</option>`).join("");
  $("accuse-clues").innerHTML = state.foundClues.length
    ? state.foundClues
        .map((id) => `<label><input type="checkbox" value="${id}"> ${escapeHTML(getClue(id).text)}</label>`)
        .join("")
    : "<p>You have no evidence yet. Search rooms and question suspects first.</p>";
}

function evaluateAccusation(culpritId, motive, clueIds) {
  const mystery = MYSTERIES[state.mysteryKey];
  if (culpritId !== mystery.culprit) return "wrong";
  const chainValid = clueIds.length === 3 && clueIds.every((id) => getClue(id).implicates.includes(culpritId));
  if (motive === mystery.motive && chainValid) return "perfect";
  return "partial";
}

function renderEnding(endingId) {
  const ending = ENDINGS[endingId];
  const mystery = MYSTERIES[state.mysteryKey];
  const deviceCount = state.ledger.filter((e) => e.source === "ON_DEVICE").length;
  const cloudCount = state.ledger.filter((e) => e.source === "IN_CLOUD").length;
  $("ending-title").textContent = ending.title;
  $("ending-text").innerHTML =
    `<p>${escapeHTML(ending.text)}</p>` +
    `<p><strong>The truth:</strong> ${escapeHTML(mystery.truth)}</p>` +
    (state.elements ? `<p><em>${escapeHTML(state.elements.alias)} — the inn will remember this night, and so will you.</em></p>` : "");
  $("ending-summary").innerHTML =
    `<p><strong>Case summary</strong></p><ul>` +
    `<li>Culprit: ${escapeHTML(getSuspect(mystery.culprit).name)} — ${escapeHTML(mystery.motive)}</li>` +
    `<li>Evidence found: ${state.foundClues.length} of ${CLUES.length} clues</li>` +
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
        if (state.phase === "briefing") { renderBriefing(); showScreen("screen-briefing"); runConsistencyCheck(); }
        else if (state.ended) { renderEnding(state.ended); showScreen("screen-ending"); }
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
      state.phase = "questions";
      save();
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
    try {
      const { data, source } = await generateJSON(models.personalizer, personalizerPrompt(state.answers));
      state.elements = data;
      const chipEl = $("personalize-chip");
      chipEl.className = source === "ON_DEVICE" ? "chip chip-device" : source === "IN_CLOUD" ? "chip chip-cloud" : "chip chip-unknown";
      chipEl.textContent = source === "ON_DEVICE" ? "On-device" : source === "IN_CLOUD" ? "Cloud" : "Source unknown";
      $("personalize-status").textContent = "Your mystery is written. Your answers never left this device.";
      logLedger("Personalization", "ONLY_ON_DEVICE", source, "Your 5 answers — processed on-device, never sent anywhere");
    } catch (e) {
      // Honest fallback: neutral elements. Answers are NEVER sent to the cloud.
      state.elements = NEUTRAL_ELEMENTS;
      $("personalize-status").textContent =
        "The on-device model was not available (" + e.message + "), so neutral story elements were used. Your answers stayed on this device.";
      logLedger("Personalization (fallback)", "ONLY_ON_DEVICE", "FAILED", "No data sent — neutral elements used locally");
    }
    state.phase = "briefing";
    save();
    renderBriefing();
    showScreen("screen-briefing");
    runConsistencyCheck();
  };

  $("btn-investigate").onclick = () => {
    state.phase = "play";
    const suspect = getSuspect(state.suspect);
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
    state.phase = "briefing";
    save();
    renderBriefing();
    showScreen("screen-briefing");
    runConsistencyCheck();
  };

  $("btn-title2").onclick = () => {
    state = freshState();
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
