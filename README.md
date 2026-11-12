# The Case of You

A detective mystery written around **you**. One storm night. One inn. One crime.

Built for **#BuildHybridAI 2026** (Firebase + Devpost) using **Firebase AI Logic hybrid inference**: on-device AI personalizes the mystery and plays the suspects, cloud AI weaves the plot and verifies every case is solvable before you play.

## How it works

1. **Five questions.** Your name, hometown, a skill, a fear, a travelling companion.
2. **On-device personalization.** The on-device model (Gemini Nano, via the Chrome Prompt API) turns your answers into story elements — paraphrased, never verbatim. **Your raw answers never leave your device.** The personalizer runs in `ONLY_ON_DEVICE` mode, so it has no cloud fallback by design. If the on-device model is unavailable, the game uses neutral story elements and says so.
3. **The case.** The Harrow Locket is stolen from a locked case. Five suspects. Three acts. You interrogate, search rooms, keep a notebook, and present your case: who, why, and with what evidence. Endings change with your accusation.
4. **Verified solvable.** Before play, cloud AI checks the mystery for contradictions and confirms it can be solved. The check result is shown in the game.
5. **Honest hybrid.** Every AI reply carries a chip: **On-device** or **Cloud** (from `response.inferenceSource`). The privacy ledger lists every AI call and where its data went. Offline, dialogue keeps working on-device and cloud features pause honestly.

## Setup (no command line needed)

### 1. Firebase project

1. Open the [Firebase console](https://console.firebase.google.com) and create a project. You do **not** need Google Analytics.
2. Open **Firebase AI Logic**, click **Get started**, and choose the **Gemini Developer API** (free to start). The console creates a Gemini API key for the project — **do not put that key in the code**.
3. Add a **Web app** (the `</>` icon) and copy the `firebaseConfig` values.
4. Paste the values into `js/config.js`, directly in the GitHub web editor. Never send them in chat or email.

### 2. App Check

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
js/ai.js        Firebase AI Logic engine: models, modes, schemas, checks
js/story.js     Story bible: rooms, suspects, clues, mysteries, endings
js/game.js      Screens, state, notebook, ledger, accusation, endings
SPEC.md         Full design + architecture + test gates
```

## Current status (honest)

- **Scaffold complete:** full game flow, one hand-written mystery with three culprit variations, live AI dialogue with memory and trust, case notebook, privacy ledger, accusation and four endings, offline handling, save/load.
- **Next phase:** cloud-generated mysteries (the plotter writes new cases; the consistency check verifies them), AI notebook summaries, design polish, and the demo video.
- **Not started:** Android (gated — only if the Web build passes its gates; on-device Android needs a Pixel 6+ / recent Galaxy class phone).

## Test gates

See `SPEC.md` §11: on-device proof on the developer's laptop, dialogue quality (20 scripted lines), three full playthroughs (one per culprit), offline play, user eyeball test, submission packet. No gate is skipped.

## License

Apache License 2.0 — see `LICENSE`.
