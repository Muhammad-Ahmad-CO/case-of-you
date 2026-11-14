# The Case of You — SPEC

A personalized detective mystery game for #BuildHybridAI 2026 (Firebase + Devpost).
One storm night. One inn. One crime. The mystery is written around YOU — and
your five questionnaire answers are never placed in a cloud-bound prompt.

## 1. Concept (one paragraph)

The player arrives at The Saltwind Inn on a storm night. The road out
is flooded, and five suspects remain inside. On the title screen the
player picks one of three cases: The Harrow Locket (a priceless locket
stolen from a locked case), The Sleeping Draught (the night porter
drugged and left unconscious), or The Burned Page (a page torn from
the inn's logbook and burned). One crime per playthrough. Before the
case begins, the game asks five short personal
questions (name, hometown, a skill, a fear, a travelling companion). On-device
AI turns those answers into story elements, so the mystery references the
player by name, ties the crime to their skill, and echoes their hometown.
Cloud AI weaves the plot and verifies the mystery is logically solvable before
play starts. The player interrogates suspects, finds clues, keeps a case
notebook, and finally presents a case: who, why, and with what evidence.
Endings change with the accusation. Every reply shows whether it came from
on-device or cloud inference. Offline, dialogue keeps working on-device.

## 2. Judging alignment (BuildHybridAI criteria, equally weighted)

- Technological Implementation: real hybrid routing (PREFER_ON_DEVICE,
  ONLY_ON_DEVICE personalizer, cloud plot-weaving), structured JSON output,
  App Check enforced, visible inference-source chips, honest offline states.
- Design: a complete, coherent product — intro, questions, briefing, play,
  notebook, accusation, endings, save/load — not a tech demo.
- Potential Impact: a new kind of personal story that respects privacy:
  personalization without surveillance. Playable anywhere, including with
  weak or no connectivity.
- Quality of the Idea: the mystery is written around the player, privately,
  on-device; and every generated mystery is verified solvable before play.
  Non-obvious use of hybrid inference: privacy is the reason for on-device,
  not a decoration.

## 3. Setting (v1: one place, done deeply)

The Saltwind Inn, a seaside inn. Storm night. Road flooded. Five rooms:
1. Lobby — fireplace, guest register, the locked display case (empty).
2. Dining Room — dinner interrupted, seating plan, a broken glass.
3. Library — letters, a torn page, the inn's logbook.
4. Cellar — wine, muddy footprints, a forced window latch.
5. Room 6 (Niko's room) — an open drawer, a train ticket, a half-packed bag.

The three cases share the Saltwind Inn setting — the same five rooms,
the same five suspects, one crime per playthrough. Each case has its
own crime:
- The Harrow Locket: the locket, belonging to the innkeeper's late
  wife, was taken from the locked display case between 8pm and 9pm.
  No one left the inn.
- The Sleeping Draught: between 7pm and 8pm, someone put a sleeping
  draught in the wine decanter on the sideboard; old Bram, the night
  porter, drank from it and will not wake until morning.
- The Burned Page: between 8pm and 9pm, someone tore one page from
  the inn's logbook and burned it in the library fireplace — the page
  recording a large loan made nine winters ago.

## 4. Suspects (v1: five, each with motive + secret + tell)

1. ELSA HARROW, innkeeper. Motive: debts; the locket is insured. Secret: she
   argued with the victim's family years ago. Tell: defends the inn fiercely.
2. TOMAS REY, fisherman. Motive: debts to a lender in the city. Secret: he
   repaired the display case last winter and knows its lock. Tell: mud on
   his boots.
3. ADA KLINE, travelling writer. Motive: researching
   a scandal book about the Harrow family. Secret: photographed the logbook.
   Tell: asks more questions than she answers.
4. FATHER OSEI, retired priest. Motive: none obvious; he heard a confession
   years ago. Secret: knows who owned the locket before the Harrows. Tell:
   speaks in riddles when pressed.
5. NIKO VANE, young musician, guest in Room 6 next door. Motive: gambling
   debts in the city. Secret: climbed the cliff path at dusk. Tell: hums
   when nervous; his guitar case is too heavy.

Culprit variations (replayability): each case has three possible
culprits, each with its own motive chain and clue arrangement. The
hand-written Harrow Locket case has three culprits (Elsa / Tomas /
Niko), unchanged. The Sleeping Draught has three (Ada / Elsa /
Tomas); The Burned Page has three (Ada / Niko / Tomas). The game
picks one per playthrough; the consistency check verifies it.

## 5. Clues (v1: ten, each tied to a room and a suspect)

1. Guest register: Niko checked in under a false surname. (Lobby)
2. Broken glass: lipstick shade matching Ada's. (Dining Room)
3. Torn page: a letter about the locket's insurance value. (Library)
4. Logbook: an entry torn out for the night of the storm, 12 years ago. (Library)
5. Muddy footprints, size matching Tomas's boots, leading to the cellar. (Cellar)
6. Forced window latch: opened from inside, not broken. (Cellar)
7. Open drawer: Room 6 searched, but only one drawer. (Room 6)
8. Train ticket: tomorrow morning, one-way, in Niko's coat. (Room 6)
9. Photograph: young Elsa with the locket's first owner. (Library)
10. Fireplace ash: a burnt envelope corner with a solicitor's seal. (Lobby)

Each clue has: id, room, via ("search" | "ask" | "both"), text, and
implicates[]. Clues never contradict the chosen culprit. Clue c1 (the guest
register) is findable by searching AND by interrogation ("both"), so the
perfect ending is reachable by deterministic play alone (Gate 1 decision).

## 6. Structure: three acts + endings

- Act 1 — Arrival & crime: briefing, meet all five suspects, first lies.
- Act 2 — Investigation: interrogate (free text or suggested questions),
  search rooms, notebook auto-organizes clues, suspects remember and react.
- Act 3 — Accusation: gather everyone; player picks culprit + motive +
  evidence chain (3 clues). Endings:
  - E1 Perfect Solve: right culprit, right motive, valid chain.
  - E2 Right Person, Wrong Why: culprit confesses part, full truth escapes.
  - E3 Wrong Accusation: the real culprit leaves on the morning tide.
  - E4 The Case Goes Cold: player gives up; the inn keeps its secret.
- Replay: "New case, new culprit" cycles the three culprit variations
  WITHIN the same case, then wraps to its first variation. A fresh
  draft game picks a random variation. Switching cases happens only
  on the title screen, with the case picker. A fresh Harrow Locket
  game (not a replay) may instead ask the cloud plotter to write a
  new mystery; see §8/§9 for the validation rules. Generated
  mysteries stay hand-written-case-only: a chosen draft case is
  never replaced by a generated mystery.

## 7. Personalization contract (privacy-first, enforced in code)

Inputs (5 questions): displayName, hometown, skill, fear, companion.
- The ONLY_ON_DEVICE personalizer converts answers into story elements:
  alias, hometownEcho, signatureMethod (from skill), stormDetail (from fear),
  companionCameo. Raw answers are stored ONLY in localStorage on the device.
- The 5 questionnaire answers are never placed in a cloud-bound prompt by
  this code. Only the fictionalized story elements are sent in later
  prompts — and a code scrubber (ai.js scrubElements) replaces any element
  that echoes a raw answer with neutral text before it can reach a prompt
  that may fall back to the cloud. The no-verbatim rule is enforced in
  code, not just in the prompt.
- The free-text questions the player types while interrogating suspects ARE
  sent to the model (on-device first, cloud fallback). The UI and the
  privacy ledger say this plainly; no absolute "the cloud only ever sees
  fictionalized elements" wording is used anywhere.
- The privacy ledger UI lists every AI call, including failures, and its
  destination.
- If on-device is unavailable, personalization falls back to neutral story
  elements and the UI says so honestly (no silent cloud upload of answers).

## 8. Hybrid architecture (verified against the official Firebase AI Logic hybrid docs for Web)

- Platform: Web (Chrome, Desktop) first. Static, zero-build site (no npm),
  Firebase JS SDK 12.11.0 via CDN import map. Deployed on Vercel from GitHub.
- Backend: Gemini Developer API via `new GoogleAIBackend()` (free to start).
  `getGenerativeModel` is called only after/on a user gesture (a docs
  requirement for inference modes). Every on-device model must also have
  `initializeDeviceModel()` called after/on the gesture and before its
  first query (hybrid Step 6); game.js `ensureModels` calls ai.js
  `initDeviceModels` right after `createModels`. Init failures are
  isolated per model, reported in the privacy ledger, and never block
  the game — the call-site fallbacks handle that model's later calls.
- Models (Firebase AI Logic) — five, in contract order:
  - personalizer: ONLY_ON_DEVICE + onDeviceParams responseConstraint —
    personalization, never leaves device. A failed call returns an error
    result (never throws); the game then uses neutral elements (never
    uploads answers), scrubs the output, and logs the failure.
  - dialogue: PREFER_ON_DEVICE — inCloudParams (model gemini-3.5-flash-lite,
    responseMimeType application/json, responseSchema) + onDeviceParams
    responseConstraint. Single-turn structured calls; conversation history
    is managed client-side (condensed memory + latest line per call),
    because on-device inference supports single-turn generation only.
  - plotter: ONLY_IN_CLOUD — consistency check (structured).
  - plotterGen: ONLY_IN_CLOUD — mystery generation, with the generation
    schema from §9. Output is validated in code (js/mystery.js) before
    use; invalid output is retried (max 3 attempts) and then the
    hand-written case plays.
  - notebook: PREFER_ON_DEVICE — notebook summary (see §9). On failure the
    caller renders the notebook deterministically instead.
  Endings are hand-written text (js/story.js ENDINGS); no model writes
  ending prose. The unused plotterText model and generateText helper
  were removed from the code (they had no callers).
- Call results: generateJSON RETURNS { data, source, raw,
  error } and never throws for model or parse failures. Every call site
  checks `error` before using `data`, and logs failures to the ledger.
- Inference source: `result.response.inferenceSource`, whose JS SDK
  runtime values are "on_device" / "in_cloud" (InferenceSource constants —
  NOT the "ON_DEVICE" / "IN_CLOUD" enum member names). ai.js normalizes
  them to ON_DEVICE / IN_CLOUD / UNKNOWN, shown as a chip on every AI
  reply. If the SDK does not report it, the chip says "Source unknown" —
  never guessed.
- App Check: enforcement for Firebase AI Logic is MANDATORY (since 2 Nov
  2026); without it, cloud calls are rejected. The setup screen reports
  the real status ("configured" | "debug" | "not configured") and never
  shows a pass when it is not configured. Debug provider for localhost;
  reCAPTCHA Enterprise for the hosted site. Debug tokens are accepted by
  the contest rules.
- Hosted on-device use needs a Chrome Prompt API Origin Trial token on the
  deployed domain; without it, hosted visitors need the Chrome flag. The
  demo video is recorded locally, so it never depends on the trial.
- Offline: navigator.onLine + online/offline events. Offline forces
  on-device paths; cloud features show a "paused until reconnect" state.
  The game never pretends cloud work happened offline.
- All AI inference goes through Firebase AI Logic. No other model APIs are
  called directly. (Contest rule.)

## 9. Prompt contracts (structured JSON)

Personalizer (on-device, ONLY_ON_DEVICE):
  Input: 5 answers. Output JSON: { alias, hometownEcho, signatureMethod,
  stormDetail, companionCameo } — all strings, no raw answers echoed back.
  The prompt enforces strict rules: alias is EXACTLY the player's first
  name; paraphrase must avoid the answer's own words; hometownEcho must
  not name the town or include anything that could identify it (no
  landmarks, rivers, famous places, or local details); one sentence per
  field; empty answers get neutral text. Output is passed through the
  code scrubber before use (see §7).
Dialogue (hybrid, PREFER_ON_DEVICE):
  Input: suspect card + condensed memory (<=6 bullets) + player line +
  story elements. Output JSON: { reply, mood, memoryUpdate, clueRevealed
  (optional string id — omit when no clue is revealed), trustDelta
  (-1|0|+1) }. clueRevealed is accepted only if the id exists in the
  active case and its via includes "ask"; anything else is ignored.
  The prompt carries an anti-confession guard (under direct accusation
  the culprit denies, deflects, or demands proof — NEVER confesses or
  confirms the truth), explicit knowledge limits (a suspect knows only
  their own secret, the case facts, and the conversation — never other
  suspects' secrets), and jailbreak resistance. Revealable clues are
  listed as clue OBJECTS ("id — fact" lines), and clueRevealed may be
  set only to a clue whose fact the reply actually states. memoryUpdate
  is constrained to observable facts of THIS exchange only; trustDelta
  judges warmth only, not whether the detective is right. CASE FACTS
  use the active case's own crime text when it carries one, falling
  back to the hand-written crime wording otherwise (see the
  crime/timeline fields under Mystery generation).
Mystery generation (cloud, ONLY_IN_CLOUD):
  Input: story elements + setting + room ids (never raw answers).
  Output JSON: { key, culprit, motive, truth, suspects[5], clues[10],
  crime?, timeline? } per the frozen shape in js/mystery.js. The crime
  is PINNED by the generation prompt ("THE CRIME IS FIXED"): every
  generated mystery reuses the Harrow Locket theft at the Saltwind Inn
  — replay variety comes from the culprit, motive, truth, suspects,
  and clues, not from a new crime (Lead decision for the 16 Nov loop;
  new crimes would need further coordinated UI + prompt work). The
  validator requires exactly 5 suspects / 10 clues, 3 questions per
  suspect, unique ids, valid rooms/implicates, and at least 3
  culprit-implicating clues reachable without dialogue (via "search"
  or "both"). The frozen shape also accepts two OPTIONAL fields:
  `crime` (a non-empty string) and `timeline` (an array of non-empty
  strings), declared in the generation schema's properties and named
  in its `optionalProperties` (the same pattern as the dialogue
  schema's optional `clueRevealed`) — so live-generated mysteries CAN
  carry them, and the shape example in the generation prompt mirrors
  the schema. Missing or null is still valid — prompts then fall back
  to the hand-written crime and timeline wording; present-but-malformed
  values are rejected like any other bad field, and the hand-written
  case plays instead. Up to 3 attempts; then the hand-written case
  plays and the ledger says so. setActiveCase preserves crime/timeline
  into the active case when present; absent fields stay absent.
Consistency check (cloud):
  Input: active case draft (suspects with their secrets, culprit,
  motive, truth, clue list with room/via/implicates, timeline). Output
  JSON: { solvable: "yes" | "no", contradictions: string[], fixes:
  string[] }. The prompt forbids inventing facts or problems: a
  contradiction is listed ONLY when two stated facts genuinely
  conflict, quoting both. It also checks motive fit, secret-vs-secret
  and secret-vs-truth conflicts, that no single clue states outright
  who committed the crime, and that the truth explains HOW the crime
  was committed. The solvability rule generalizes when the case
  carries its own crime or timeline ("the timeline is consistent with
  the truth"); otherwise it keeps the hand-written 8–9pm theft-window
  wording. The result is shown on the briefing screen and logged in
  the ledger. A "no" result is displayed honestly; the validator's
  solvability floor already guarantees the case is playable.
Notebook (hybrid, PREFER_ON_DEVICE):
  Input: found clue texts + condensed memory bullets + trust values from
  the active case, anchored by the active case's crime text (with the
  hand-written crime wording as fallback). NEVER the questionnaire
  answers. Output JSON: { summary, openQuestions: string[] }. The
  prompt frames memory bullets as CLAIMS ("Elsa said..."), never as
  established facts; trust numbers show only cooperativeness, never
  evidence of guilt or innocence; the summary must not name a culprit
  or state the solution; open questions must be concrete next steps
  answerable by further searching or questioning. On any failure the
  module throws and the caller renders the notebook deterministically,
  with an honest note. The inference source is not reported for this
  call, so the stored source is UNKNOWN — never guessed.

## 10. Screens

1. Setup check (Firebase config present? Chrome 139+? model status?)
2. Title / intro
3. Five questions (with privacy note)
4. Personalizing… (on-device progress + chip)
5. Case briefing (crime, storm, suspects)
6. Play: rooms, suspects, interrogation, clue search
7. Notebook drawer (AI case summary when available, clues, timeline, open questions)
8. Accusation (culprit + motive + 3 clues)
9. Ending + case summary + replay
Persistent: inference chips, online/offline indicator, privacy ledger,
save/load (localStorage; Firestore sync is a stretch goal, not v1).
Small screens: the 30rem media block sits LAST in styles.css so its
heading and topbar scaling actually applies — it previously sat at the
top of the file, where later base rules overrode it and the small-screen
scaling never took effect (cascade-order fix, verified by computed-style
probe at 390px).

## 11. Test gates (no gate skipped)

- GATE 0 — On-device proof (Fri 13 Nov): on the user's laptop, Chrome 139+,
  flag enabled, model downloaded; a personalizer call returns with an
  On-device chip. If it fails, the plan changes — no blind building.
- GATE 1 — Dialogue quality: 20 scripted interrogation lines across all 5
  suspects; >=80% in-character, on-topic, no contradictions with known
  facts. Else prompt/contract rework.
- GATE 2 — Solvability: 9 full playthroughs (3 cases × 3 culprit
  variations), played by deterministic search-only play to PERFECT,
  zero plot holes, all endings reachable, notebook correct
  throughout. Plus a wrong-culprit control: accusing the wrong
  culprit must not reach a Perfect Solve.
- GATE 3 — Offline: airplane-mode play — dialogue + notebook work, cloud
  features pause honestly (each paused call is logged in the privacy
  ledger; the consistency check re-runs on reconnect, generation is
  not re-run), no errors, no fake replies.
- GATE 4 — User eyeball test on laptop + phone: design approved by the user
  before demo production. No approval = no video.
- GATE 5 — Submission packet: public repo + license + README, <3min demo
  video, hosted URL, submission text. Submitted >=24h before deadline.

## 12. Risks (stated, not hidden)

- On-device quality varies: Nano replies can be generic. Mitigation:
  strong character cards, condensed memory, anti-repeat rules, Gate 1.
- Plot holes kill a mystery. Mitigation: consistency check + Gate 2.
- On-device works only on Desktop Chrome 139+. Mitigation: cloud fallback
  keeps the game playable everywhere; demo is recorded on Desktop Chrome.
- Android on-device cannot be tested on the Oppo F9 (no AICore). Android
  is a gated stretch goal only; Web is the judged platform.

## 13. Schedule (deadline: Tue 1 Dec 2026, 03:00 PKT)

- Fri 13 Nov: setup + Gate 0 (Firebase project, Chrome, model, proof).
- Sat 14–Mon 16 Nov: brain — personalizer, dialogue, notebook, Gate 1.
- Tue 17–Thu 19 Nov: cloud layer — plotter, consistency check, endings.
- Fri 20–Sun 22 Nov: product polish, Gate 2 + Gate 3, user eyeball (Gate 4).
- Mon 23–Wed 25 Nov: Android decision gate (only if Web passes).
- Thu 26–Sat 28 Nov: demo video (script first), README, submission text.
- Sun 29–Mon 30 Nov: buffer + submit (Gate 5).

## 14. Submission checklist (from official rules)

- [ ] At least one platform selected (Web/Chrome).
- [ ] Text description: Firebase AI Logic use, features, value proposition.
- [ ] Public GitHub repo, open-source license visible, Firebase AI Logic
      actually called in code (not just named in README).
- [ ] Demo video <=3 minutes, public on YouTube, English.
- [ ] Hosted project URL (strongly encouraged).
- [ ] All submission materials in English. Project free of charge.
- [ ] No production keys, secrets, or PII in repo or submission.
