// The Case of You — generated mysteries (Phase 2).
//
// The cloud plotter generates a new mystery as JSON. This module validates
// that JSON against the frozen shape, holds the active case, and builds the
// generation prompt. The hand-written story.js case is always the default
// and the fallback: bad model output never breaks the game, it just means
// the hand-written case is played instead.
//
// Privacy: buildGenerationPrompt receives story elements only. It never
// reads the player's raw answers — it has no access to game state at all.

import { SETTING, ROOMS, SUSPECTS, CLUES, MYSTERIES } from "./story.js";

const VIA_VALUES = ["search", "ask", "both"];
const DEFAULT_MYSTERY_KEY = "tomas";

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

// The hand-written case, in the same shape a generated mystery takes, so
// the rest of the game never cares which one is active.
function handwrittenCase() {
  const mystery = MYSTERIES[DEFAULT_MYSTERY_KEY];
  return {
    suspects: SUSPECTS,
    clues: CLUES,
    mystery: {
      key: DEFAULT_MYSTERY_KEY,
      culprit: mystery.culprit,
      motive: mystery.motive,
      truth: mystery.truth,
    },
  };
}

let activeCase = handwrittenCase();

export function getActiveCase() {
  return { ...activeCase };
}

export function setActiveCase(mystery) {
  if (!validateMystery(mystery).ok) return false;
  activeCase = {
    suspects: mystery.suspects,
    clues: mystery.clues,
    mystery: {
      key: mystery.key,
      culprit: mystery.culprit,
      motive: mystery.motive,
      truth: mystery.truth,
    },
  };
  return true;
}

export function validateMystery(obj) {
  const errors = [];
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return { ok: false, errors: ["Mystery must be a JSON object."] };
  }
  if (!isNonEmptyString(obj.key)) errors.push("key must be a non-empty string.");
  if (!isNonEmptyString(obj.motive)) errors.push("motive must be a non-empty string.");
  if (!isNonEmptyString(obj.truth)) errors.push("truth must be a non-empty string.");

  const suspectIds = new Set();
  if (!Array.isArray(obj.suspects) || obj.suspects.length !== 5) {
    errors.push("suspects must be an array of exactly 5 suspects.");
  } else {
    obj.suspects.forEach((suspect, i) => {
      const where = "suspects[" + i + "]";
      if (!suspect || typeof suspect !== "object" || Array.isArray(suspect)) {
        errors.push(where + " must be an object.");
        return;
      }
      if (!isNonEmptyString(suspect.id)) {
        errors.push(where + ".id must be a non-empty string.");
      } else if (suspectIds.has(suspect.id)) {
        errors.push("Duplicate suspect id: " + suspect.id + ".");
      } else {
        suspectIds.add(suspect.id);
      }
      ["name", "role", "personality", "secret", "tell", "opening"].forEach((field) => {
        if (!isNonEmptyString(suspect[field])) {
          errors.push(where + "." + field + " must be a non-empty string.");
        }
      });
      if (
        !Array.isArray(suspect.questions) ||
        suspect.questions.length !== 3 ||
        !suspect.questions.every(isNonEmptyString)
      ) {
        errors.push(where + ".questions must be an array of exactly 3 non-empty strings.");
      }
    });
  }

  if (!isNonEmptyString(obj.culprit)) {
    errors.push("culprit must be a non-empty string.");
  } else if (suspectIds.size > 0 && !suspectIds.has(obj.culprit)) {
    errors.push("culprit must be one of the suspect ids.");
  }

  const roomIds = new Set(ROOMS.map((room) => room.id));
  const clueIds = new Set();
  let reachableForCulprit = 0;
  if (!Array.isArray(obj.clues) || obj.clues.length !== 10) {
    errors.push("clues must be an array of exactly 10 clues.");
  } else {
    obj.clues.forEach((clue, i) => {
      const where = "clues[" + i + "]";
      if (!clue || typeof clue !== "object" || Array.isArray(clue)) {
        errors.push(where + " must be an object.");
        return;
      }
      if (!isNonEmptyString(clue.id)) {
        errors.push(where + ".id must be a non-empty string.");
      } else if (clueIds.has(clue.id)) {
        errors.push("Duplicate clue id: " + clue.id + ".");
      } else {
        clueIds.add(clue.id);
      }
      if (!roomIds.has(clue.room)) {
        errors.push(where + ".room must be a valid room id.");
      }
      if (!VIA_VALUES.includes(clue.via)) {
        errors.push(where + ".via must be one of: search, ask, both.");
      }
      if (!isNonEmptyString(clue.text)) {
        errors.push(where + ".text must be a non-empty string.");
      }
      if (!Array.isArray(clue.implicates)) {
        errors.push(where + ".implicates must be an array of suspect ids.");
      } else {
        clue.implicates.forEach((id) => {
          if (!suspectIds.has(id)) {
            errors.push(where + ".implicates contains unknown suspect id: " + id + ".");
          }
        });
        if (
          clue.implicates.includes(obj.culprit) &&
          (clue.via === "search" || clue.via === "both")
        ) {
          reachableForCulprit++;
        }
      }
    });
  }

  // Solvability floor: the culprit must be provable from searching alone,
  // so the perfect ending never depends on the dialogue model cooperating.
  if (
    isNonEmptyString(obj.culprit) &&
    suspectIds.has(obj.culprit) &&
    Array.isArray(obj.clues) &&
    obj.clues.length === 10 &&
    reachableForCulprit < 3
  ) {
    errors.push(
      "Culprit must have at least 3 implicating clues reachable without dialogue (via search or both); found " +
        reachableForCulprit +
        "."
    );
  }

  return { ok: errors.length === 0, errors };
}

// Retries generation up to `attempts` times. Returns null when every
// attempt fails or produces an invalid mystery — the caller then plays the
// hand-written case. Never throws for bad model output.
export async function generateMystery(generateFn, model, prompt, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      const result = await generateFn(model, prompt);
      if (!result || typeof result !== "object" || result.error) continue;
      const candidate = "data" in result ? result.data : result;
      if (validateMystery(candidate).ok) return candidate;
    } catch {
      // Failed call or unusable output: retry, then fall back.
    }
  }
  return null;
}

// Prompt for the cloud plotter. Takes story elements only — never raw
// answers — and pins the exact JSON shape plus the solvability rule.
export function buildGenerationPrompt(elements) {
  const el = elements || {};
  const elementLines = [];
  if (isNonEmptyString(el.alias)) elementLines.push("The detective is known as: " + el.alias + ".");
  if (isNonEmptyString(el.hometownEcho)) elementLines.push("Hometown echo: " + el.hometownEcho);
  if (isNonEmptyString(el.signatureMethod)) elementLines.push("The detective's signature method: " + el.signatureMethod);
  if (isNonEmptyString(el.stormDetail)) elementLines.push("Storm detail: " + el.stormDetail);
  if (isNonEmptyString(el.companionCameo)) elementLines.push("Companion cameo: " + el.companionCameo);
  const roomList = ROOMS.map((room) => room.id + " (" + room.name + ")").join(", ");

  return [
    "Write a NEW solvable detective mystery for the game The Case of You.",
    "Setting: " + SETTING.inn + ". " + SETTING.crime,
    "Clues may only use these room ids: " + roomList + ".",
    elementLines.length > 0
      ? "Weave in these fictionalized story elements (never invent other personal details about the player):\n" + elementLines.join("\n")
      : "No personal story elements were provided; keep the mystery neutral.",
    "Return ONLY a JSON object with this exact shape:",
    JSON.stringify(
      {
        key: "a unique string id for this mystery",
        culprit: "one suspect id",
        motive: "why the culprit did it",
        truth: "1-2 sentences explaining what really happened",
        suspects: [
          {
            id: "string",
            name: "string",
            role: "string",
            personality: "string",
            secret: "string",
            tell: "string",
            opening: "string",
            questions: ["string", "string", "string"],
          },
        ],
        clues: [
          {
            id: "string",
            room: "a room id from the list above",
            via: "search | ask | both",
            text: "string",
            implicates: ["suspect ids"],
          },
        ],
      },
      null,
      2
    ),
    "Rules: exactly 5 suspects and exactly 10 clues; every suspect id and clue id unique; every implicates entry a suspect id from this mystery; each suspect has exactly 3 questions; the culprit must be implicated by at least 3 clues reachable without dialogue (via search or both), so the case is solvable by searching alone.",
  ].join("\n\n");
}
