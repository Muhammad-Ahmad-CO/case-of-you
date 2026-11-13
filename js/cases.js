// The Case of You — shipped case registry + draft adapter.
//
// The game ships three cases: the hand-written Harrow Locket case (data
// in story.js) and two content-draft cases (data in js/cases/, generated
// from content-drafts/*.json — see tests/generate-case-modules.mjs).
// Each draft is a WRAPPER: shared suspects + clues plus a `variations`
// map (3 culprits). The adapter below turns one variation into the
// frozen single-culprit mystery shape, passing the shared suspects/clues
// verbatim and the wrapper's own crime/timeline through — nothing is
// copied, altered, or invented.
//
// PURE module: imports data modules only, touches no DOM, reads no
// storage, calls no AI. Node probes and the browser import the identical
// code. Validation stays the caller's job via setActiveCase (mystery.js),
// exactly as the generation wiring does today.

import { SLEEPING_DRAUGHT } from "./cases/sleeping-draught.js";
import { BURNED_PAGE } from "./cases/burned-page.js";

// Registry. The hand-written case is registered with draft: null — its
// data lives in story.js and the adapter path is never used for it.
// Draft titles/blurbs are read from the wrappers (single source of
// truth); draft variation orders are derived with Object.keys so a
// future reordering of the JSON cannot silently desync the registry.
// The hand-written order ["tomas", "niko", "elsa"] is the established
// rotation, hardcoded here and as the fallback in game.js.
export const CASES = [
  {
    key: "harrow-locket",
    title: "The Harrow Locket",
    blurb: "A priceless locket is stolen from a locked case — and no one left the inn.",
    variations: ["tomas", "niko", "elsa"],
    draft: null,
  },
  {
    key: "sleeping-draught",
    title: SLEEPING_DRAUGHT.title,
    blurb: SLEEPING_DRAUGHT.blurb,
    variations: Object.keys(SLEEPING_DRAUGHT.variations),
    draft: SLEEPING_DRAUGHT,
  },
  {
    key: "burned-page",
    title: BURNED_PAGE.title,
    blurb: BURNED_PAGE.blurb,
    variations: Object.keys(BURNED_PAGE.variations),
    draft: BURNED_PAGE,
  },
];

export function getCase(caseKey) {
  return CASES.find((c) => c.key === caseKey) || null;
}

export function isDraftCase(caseKey) {
  const entry = getCase(caseKey);
  return entry !== null && entry.draft !== null;
}

export function variationOrder(caseKey) {
  const entry = getCase(caseKey);
  return entry ? [...entry.variations] : null;
}

// Adapt one draft variation to the frozen mystery shape, or null for an
// unknown case/variation. Returns null for "harrow-locket" (no draft to
// adapt; callers use the story.js path). The crime/timeline pass-through
// is REQUIRED: the generalized prompts describe the active case's own
// crime and timeline when present.
export function adaptCase(caseKey, variationKey) {
  const entry = getCase(caseKey);
  if (!entry || !entry.draft) return null;
  const v = entry.draft.variations[variationKey];
  if (!v) return null;
  return {
    key: entry.draft.key + "-" + variationKey,
    culprit: v.culprit,
    motive: v.motive,
    truth: v.truth,
    suspects: entry.draft.suspects,
    clues: entry.draft.clues,
    crime: entry.draft.crime,
    timeline: entry.draft.timeline,
  };
}

// Single source of randomness for variation choice: a fixed first
// variation would make every fresh draft game the same culprit. Returns
// null for an unknown case.
export function pickVariation(caseKey) {
  const order = variationOrder(caseKey);
  if (!order) return null;
  return order[Math.floor(Math.random() * order.length)];
}

// The draft's own motive list for the accusation dropdown, or null for
// the hand-written case (the caller falls back to MOTIVES).
export function motivesForCase(caseKey) {
  const entry = getCase(caseKey);
  if (!entry || !entry.draft) return null;
  return entry.draft.motives;
}

export function caseTitle(caseKey) {
  const entry = getCase(caseKey);
  return entry ? entry.title : null;
}

export function caseBlurb(caseKey) {
  const entry = getCase(caseKey);
  return entry ? entry.blurb : null;
}
