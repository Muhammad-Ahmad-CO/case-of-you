// The Case of You — detective's notebook summary.
//
// Single-turn call on the notebook model (PREFER_ON_DEVICE). Input is
// condensed game state only: found clue texts, condensed memory bullets,
// trust values, and the active case's crime line (game data from
// story.js / the active case — never questionnaire answers). This module
// MUST NEVER read state.answers — the questionnaire answers are not an
// input here, and the prompt below is built only from the fields listed
// above.
//
// On any failure (model error or malformed output) this throws; the caller
// falls back to deterministic notebook rendering.

import { generateJSON } from "./ai.js";
import { getActiveCase } from "./mystery.js";
import { SETTING } from "./story.js";

export async function summarizeNotebook(models, state) {
  const { suspects, clues, mystery } = getActiveCase();
  const byId = (list, id) => list.find((x) => x.id === id);
  // Same fallback rule as game.js: a case with its own crime describes
  // itself; otherwise the hand-written crime line anchors the summary.
  const crimeText =
    mystery && typeof mystery.crime === "string" && mystery.crime.trim().length > 0
      ? mystery.crime
      : SETTING.crime;

  const foundClues = state.foundClues || [];
  const evidence = foundClues.length
    ? foundClues
        .map((id) => {
          const clue = byId(clues, id);
          return clue ? `- ${clue.text} (${clue.room})` : `- ${id}`;
        })
        .join("\n")
    : "None yet.";

  const memory = state.memory || {};
  const memoryLines = suspects
    .map((s) => ({ name: s.name, bullets: memory[s.id] || [] }))
    .filter((s) => s.bullets.length)
    .map((s) => `- ${s.name}: ${s.bullets.join(" | ")}`);
  const memoryText = memoryLines.length ? memoryLines.join("\n") : "No conversations yet.";

  const trust = state.trust || {};
  const trustText = suspects.map((s) => `${s.name}: ${trust[s.id] || 0}`).join(", ");

  const prompt =
    `You are summarizing a detective's notebook for a mystery game at The Saltwind Inn. ` +
    `CASE: ${crimeText}\n` +
    `Write a short case summary (2-4 sentences) and list the open questions (short strings, at most 5). ` +
    `RULES: Base everything ONLY on the evidence below; do not invent clues, suspects, or facts. ` +
    `Memory bullets are what suspects CLAIMED — report them as claims ("Elsa said..."), never as established facts. ` +
    `Trust numbers show only who is cooperative or hostile; never treat trust as evidence of guilt or innocence. ` +
    `Do not name a culprit. Do not conclude who did it or state the solution. ` +
    `Open questions must be concrete next steps answerable by further searching or questioning — not rhetorical questions.\n` +
    `EVIDENCE FOUND:\n${evidence}\n` +
    `WHAT EACH SUSPECT SAID (condensed memory — claims, not facts):\n${memoryText}\n` +
    `TRUST (from -2 hostile to +2 friendly): ${trustText}\n` +
    `Return JSON only: summary, openQuestions.`;

  const { data, error } = await generateJSON(models.notebook, prompt);
  if (error) throw error instanceof Error ? error : new Error(String(error));
  if (
    !data ||
    typeof data.summary !== "string" ||
    !data.summary.trim() ||
    !Array.isArray(data.openQuestions) ||
    !data.openQuestions.every((q) => typeof q === "string")
  ) {
    throw new Error("Notebook summary was malformed.");
  }
  return { summary: data.summary, openQuestions: data.openQuestions };
}
