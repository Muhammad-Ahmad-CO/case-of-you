# The Case of You — SPEC

A personalized detective mystery game for #BuildHybridAI 2026 (Firebase + Devpost).
One storm night. One inn. One crime. The mystery is written around YOU — and
your private answers never leave your device.

## 1. Concept (one paragraph)

The player arrives at The Saltwind Inn on a storm night. A priceless locket has
been stolen from a locked case, the road out is flooded, and five suspects
remain inside. Before the case begins, the game asks five short personal
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

The crime: the Harrow Locket, belonging to the innkeeper's late wife, was
taken from the locked display case between 8pm and 9pm. No one left the inn.

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

Culprit variations (replayability): the same crime, three possible culprits
(Elsa / Tomas / Niko), each with its own motive chain and clue arrangement.
The game picks one per playthrough; the consistency check verifies it.

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

Each clue has: id, room, text, implicates[], clears[], and a "verified" flag
set by the consistency check. Clues never contradict the chosen culprit.

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
- Replay: "New case, new culprit" regenerates with a different culprit.

## 7. Personalization contract (privacy-first, enforced in code)

Inputs (5 questions): displayName, hometown, skill, fear, companion.
- The ONLY_ON_DEVICE personalizer converts answers into story elements:
  alias, hometownEcho, signatureMethod (from skill), stormDetail (from fear),
  companionCameo. Raw answers are stored ONLY in localStorage on the device.
- The cloud NEVER receives raw answers — only the fictionalized story
  elements. The privacy ledger UI lists every data flow and its destination.
- If on-device is unavailable, personalization falls back to neutral story
  elements and the UI says so honestly (no silent cloud upload of answers).

## 8. Hybrid architecture (verified against the official Firebase AI Logic hybrid docs for Web)

- Platform: Web (Chrome, Desktop) first. Static, zero-build site (no npm),
  Firebase JS SDK 12.11.0 via CDN import map. Deployed on Vercel from GitHub.
- Backend: Gemini Developer API via `new GoogleAIBackend()` (free to start).
  `getGenerativeModel` is called only after/on a user gesture (a docs
  requirement for inference modes).
- Models (Firebase AI Logic):
  - personalizer: ONLY_ON_DEVICE + onDeviceParams responseConstraint —
    personalization, never leaves device. Throws if on-device is
    unavailable; the game then uses neutral elements (never uploads answers).
  - dialogue: PREFER_ON_DEVICE — inCloudParams (model gemini-3.5-flash-lite,
    responseMimeType application/json, responseSchema) + onDeviceParams
    responseConstraint. Single-turn structured calls; conversation history
    is managed client-side (condensed memory + latest line per call),
    because on-device inference supports single-turn generation only.
  - plotter: ONLY_IN_CLOUD — mystery generation + consistency check + endings.
- Inference source: `result.response.inferenceSource` (ON_DEVICE / IN_CLOUD),
  shown as a chip on every AI reply. If the SDK does not report it, the chip
  says "Source unknown" — never guessed.
- App Check: enforced when configured. Debug provider for localhost;
  reCAPTCHA Enterprise for the hosted site. Debug tokens are accepted by the
  contest rules.
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
Dialogue (hybrid, PREFER_ON_DEVICE):
  Input: suspect card + condensed memory (<=6 bullets) + player line +
  story elements. Output JSON: { reply, mood, memoryUpdate, clueRevealed
  (id|null), trustDelta (-1|0|+1) }.
Consistency check (cloud):
  Input: mystery draft (culprit, motive, clue list, timeline). Output JSON:
  { solvable: bool, contradictions: string[], fixes: string[] }. If
  solvable=false, the plotter regenerates (max 3 attempts), else the game
  uses the hand-written fallback mystery. The check result is logged in the
  case file shown to judges in the README.
Notebook (hybrid):
  Input: clue ids found + interrogation notes. Output JSON: { summary,
  openQuestions: string[] }.

## 10. Screens

1. Setup check (Firebase config present? Chrome 139+? model status?)
2. Title / intro
3. Five questions (with privacy note)
4. Personalizing… (on-device progress + chip)
5. Case briefing (crime, storm, suspects)
6. Play: rooms, suspects, interrogation, clue search
7. Notebook drawer (clues, timeline, open questions)
8. Accusation (culprit + motive + 3 clues)
9. Ending + case summary + replay
Persistent: inference chips, online/offline indicator, privacy ledger,
save/load (localStorage; Firestore sync is a stretch goal, not v1).

## 11. Test gates (no gate skipped)

- GATE 0 — On-device proof (Fri 13 Nov): on the user's laptop, Chrome 139+,
  flag enabled, model downloaded; a personalizer call returns with an
  On-device chip. If it fails, the plan changes — no blind building.
- GATE 1 — Dialogue quality: 20 scripted interrogation lines across all 5
  suspects; >=80% in-character, on-topic, no contradictions with known
  facts. Else prompt/contract rework.
- GATE 2 — Solvability: 3 full playthroughs (one per culprit), zero plot
  holes, all endings reachable, notebook correct throughout.
- GATE 3 — Offline: airplane-mode play — dialogue + notebook work, cloud
  features pause honestly, no errors, no fake replies.
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
