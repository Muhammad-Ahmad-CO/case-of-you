# The Case of You

A detective mystery written around **you**. One storm night. One inn. One crime.

Built for **#BuildHybridAI 2026** (Firebase + Devpost) using **Firebase AI Logic hybrid inference**: on-device AI personalizes the mystery and plays the suspects, cloud AI weaves the plot and verifies every case is solvable before you play.

## How it works

1. **Five questions.** Your name, hometown, a skill, a fear, a travelling companion.
2. **On-device personalization.** The on-device model (Gemini Nano, via the Chrome Prompt API) turns your answers into story elements — paraphrased, never verbatim. **Your 5 questionnaire answers are never placed in a cloud-bound prompt by this code.** The personalizer runs in `ONLY_ON_DEVICE` mode, so it has no cloud fallback by design, and a code scrubber replaces any story element that echoes a raw answer before it can reach a later prompt. If the on-device model is unavailable, the game uses neutral story elements and says so. Note: the free-text questions you type while interrogating suspects ARE sent to the model (on-device first, cloud fallback) — only the questionnaire answers get the never-in-a-cloud-prompt guarantee.
3. **The case.** Pick one of three cases on the title screen — **The Harrow Locket**: "A priceless locket is stolen from a locked case — and no one left the inn." **The Sleeping Draught**: "The night porter drinks from a drugged decanter and will not wake until morning." **The Burned Page**: "A page is torn from the inn's logbook and burned — the record of a loan nine winters old." One crime per playthrough. Five suspects. Three acts. You interrogate, search rooms, keep a notebook, and present your case: who, why, and with what evidence. Endings change with your accusation. Each case has three possible culprits; a fresh draft game picks one at random, and replay cycles the variations within the same case — switching cases happens only on the title screen. Suspects follow strict interrogation rules in their prompts: the culprit never confesses or confirms the truth under accusation, and no suspect knows another suspect's secret — only their own secret, the case facts, and the conversation.
4. **Generated or hand-written, verified solvable.** A fresh Harrow Locket game asks cloud AI to write a new mystery; the output is validated in code (shape, references, and a solvability floor: the culprit must be provable from searching alone) and only then activated. Generated mysteries keep the same fixed crime — the Harrow Locket theft at the Saltwind Inn — with variety in culprit, motive, truth, suspects, and clues. Draft cases never generate: picking The Sleeping Draught or The Burned Page plays that case as written, and a chosen draft case is never replaced by a generated mystery. The generation schema declares two optional fields, `crime` and `timeline`, so live-generated mysteries can carry their own crime wording and get matching dialogue and consistency prompts (missing or null falls back to the hand-written wording; malformed values are rejected). If generation fails or is rejected after 3 attempts, the hand-written case plays instead, and the ledger says so. Before play, cloud AI also checks the active case for contradictions, including suspects' secrets. Both results are shown in the game.
5. **Honest hybrid.** Every AI reply carries a chip: **On-device**, **Cloud**, or **Source unknown** (from `response.inferenceSource`, whose JS SDK runtime values are `"on_device"` / `"in_cloud"` — never guessed when unreported). The privacy ledger lists every AI call, including failures, and where its data went. The case notebook can ask the notebook model for an AI summary — framed around what suspects *claimed*, never as established facts, and never naming a culprit; when that fails or the player is offline, the deterministic notes show instead, with an honest note. Offline, dialogue keeps working on-device and cloud features pause honestly.

## Setup (no command line needed)

### 1. Firebase project

1. Open the [Firebase console](https://console.firebase.google.com) and create a project. You do **not** need Google Analytics.
2. Open **Firebase AI Logic**, click **Get started**, and choose the **Gemini Developer API** (free to start). The console creates a Gemini API key for the project — **do not put that key in the code**.
3. Add a **Web app** (the `</>` icon) and copy the `firebaseConfig` values.
4. Paste the values into `js/config.js`, directly in the GitHub web editor. Never send them in chat or email.

### 2. App Check (mandatory)

Firebase AI Logic enforces App Check (mandatory since 2 Nov 2026). Without it, cloud AI calls are rejected. The setup screen reports the real App Check status and never shows a pass when it is not configured.

1. In the Firebase console, go to **Build > App Check**, open your Web app, and register it with **reCAPTCHA Enterprise**. Paste the site key into `APP_CHECK_CONFIG.recaptchaSiteKey` in `js/config.js`.
2. For local testing, the app sets the App Check debug token flag on localhost. Copy the debug token printed in the browser console and register it under **App Check > Apps > your Web app > Manage debug tokens**. Debug tokens are accepted by the contest rules.

### 3. Chrome (for on-device inference)

On-device inference works on **desktop Chrome 139+**:

1. Update Chrome: `chrome://settings/help`.
2. Enable the flag `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` and restart Chrome.
3. Optional: pre-download the model. Open DevTools > Console and run `await LanguageModel.create()`.

On other browsers the game still plays, using cloud inference.

### 4. Deploy (free)

Import this repository into [Vercel](https://vercel.com) (or any static host). No build step, no environment variables — it is a static site. Set the project to deploy from the `main` branch.

**Hosted on-device use:** for visitors to use on-device inference on the hosted site without flags, register the deployed domain for the [Chrome Prompt API Origin Trial](https://developer.chrome.com/docs/ai/prompt-api) and add the token as a meta tag in `index.html`. Without a token, hosted visitors need the Chrome flag. The demo video is recorded locally and never depends on the trial.

## Project structure

```
index.html      Screens, import map (Firebase JS SDK 12.11.0 via CDN)
styles.css      Parchment / ink / oxblood design
js/config.js    YOUR Firebase config (paste here, never in chat)
js/ai.js        Firebase AI Logic engine: models, modes, schemas, scrubber, checks
js/story.js     Story bible: rooms, suspects, clues, mysteries, endings
js/mystery.js   Generated-mystery validation, active case, generation prompt
js/notebook.js  AI notebook summary (condensed state only, never answers)
js/game.js      Screens, state, notebook, ledger, accusation, endings
SPEC.md         Full design + architecture + test gates
```

## Current status (honest)

- **Implemented:** full game flow; three cases — the hand-written Harrow Locket plus two content-draft cases, The Sleeping Draught and The Burned Page — each with three culprit variations, a title-screen case picker, and replay that cycles variations within the same case; cloud-generated mysteries (validated in code, fixed crime, hand-written fallback, Harrow Locket only); live AI dialogue with memory and trust, anti-confession and knowledge-limit prompt rules, and clue reveals tied to stated facts; AI notebook summaries with deterministic fallback; case notebook; privacy ledger (including failed calls); accusation and four endings; offline handling (paused cloud calls are logged in the privacy ledger; the consistency check resumes on reconnect); hardened save/load; small-screen CSS fix (media-block ordering, so heading/topbar scaling applies at 390px).
- **Removed:** the unused `plotterText` model and `generateText` helper were removed from the code — five models remain (personalizer, dialogue, plotter, plotterGen, notebook), and endings use hand-written text.
- **Stub-verified only:** all AI behavior so far has been verified with stubbed models in a local harness. No live Firebase call has run yet. Gate 0 (live on-device proof on the developer's laptop) is still required before the demo video or submission, and no claim here depends on it having passed. Real-browser harness: 250/250 checks passing; Gate 2 solvability probe: 16/16 (all 9 playthroughs reach Perfect Solve, plus the wrong-culprit control).
- **Next:** design polish after the user's eyeball test (Gate 4), then the demo video.
- **Not started:** Android (gated — only if the Web build passes its gates; on-device Android needs a Pixel 6+ / recent Galaxy class phone).

## Test gates

See `SPEC.md` §11: on-device proof on the developer's laptop, dialogue quality (20 scripted lines), nine full playthroughs (3 cases × 3 variations) plus a wrong-culprit control, offline play, user eyeball test, submission packet. No gate is skipped.

## License

Apache License 2.0 — see `LICENSE`.
