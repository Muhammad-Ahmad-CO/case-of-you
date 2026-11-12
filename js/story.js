// The Case of You — story bible (v1: one hand-written mystery, three culprits).
//
// The hand-written mystery is the guaranteed playable floor. In Phase 2,
// the cloud plotter generates new mysteries and the consistency check
// verifies them before play. Dialogue always uses these facts so suspects
// stay consistent with the evidence.

export const SETTING = {
  inn: "The Saltwind Inn",
  crime:
    "Between 8pm and 9pm, during the worst storm in twelve years, the Harrow Locket was taken from its locked display case in the lobby. The road out is flooded. No one left the inn. The case was not forced — it was opened with a key, or by someone who knew the lock.",
  timeline: [
    "6:00pm — Dinner begins. All five suspects are in the dining room.",
    "7:30pm — The storm cuts the road. The inn is sealed in.",
    "8:00pm — The locket is last seen in its case by the night porter.",
    "8:00–9:00pm — The theft. Everyone claims to have been elsewhere.",
    "9:00pm — The empty case is discovered. You are asked to investigate.",
  ],
};

export const ROOMS = [
  {
    id: "lobby",
    name: "Lobby",
    description:
      "A fireplace, the guest register, and the display case — standing open and empty. Rain hammers the windows.",
  },
  {
    id: "dining",
    name: "Dining Room",
    description:
      "Dinner interrupted: cold plates, a seating plan, and a broken glass under the table.",
  },
  {
    id: "library",
    name: "Library",
    description:
      "Letters, the inn's logbook, and shelves of salt-warped books. Someone has been reading in a hurry.",
  },
  {
    id: "cellar",
    name: "Cellar",
    description:
      "Wine racks, damp stone, and a window latch that looks wrong. The smell of mud and sea.",
  },
  {
    id: "room6",
    name: "Room 6 — Niko's room",
    description:
      "A small guest room, half-packed. A guitar case leans by the door, and one drawer stands open.",
  },
];

export const SUSPECTS = [
  {
    id: "elsa",
    name: "Elsa Harrow",
    role: "Innkeeper",
    personality:
      "Proud, tired, fiercely protective of the inn. Speaks plainly. Deflects questions about money.",
    secret: "The inn is in debt and the locket is insured. She argued with the Harrow family years ago.",
    tell: "Straightens objects on the desk when nervous.",
    opening: "The locket has been in my family for forty years. Find it, and find who did this — but mind your manners in my inn.",
    questions: [
      "Who had a key to the display case?",
      "What is the locket worth to you?",
      "Where were you between 8 and 9pm?",
    ],
  },
  {
    id: "tomas",
    name: "Tomas Rey",
    role: "Fisherman",
    personality:
      "Gruff, few words, loyal to the sea and suspicious of strangers. Answers questions with questions.",
    secret: "He owes money to a lender in the city. He repaired the display case last winter and knows its lock.",
    tell: "Mud on his boots, always. Looks at the door when the storm gusts.",
    opening: "I fish. I drink. I sleep. I don't steal from people who feed me. Ask your questions and be done.",
    questions: [
      "Where were you between 8 and 9pm?",
      "Did you repair the display case?",
      "Who do you owe money to?",
    ],
  },
  {
    id: "ada",
    name: "Ada Kline",
    role: "Travelling writer",
    personality:
      "Curious, quick, charming. Asks more questions than she answers. Takes notes on everything.",
    secret: "She is researching a scandal book about the Harrow family and photographed the logbook.",
    tell: "Her notebook is always open. She smiles when a question surprises her.",
    opening: "A locked-room theft, a storm, five suspects — I would call it a cliché if I weren't living in it. What do you want to know?",
    questions: [
      "What are you writing about the Harrows?",
      "Did you photograph the logbook?",
      "Where were you between 8 and 9pm?",
    ],
  },
  {
    id: "osei",
    name: "Father Osei",
    role: "Retired priest",
    personality:
      "Calm, kind, deliberate. Speaks in riddles when pressed. Hears more than he says.",
    secret: "Years ago he heard a confession about who really owned the locket before the Harrows.",
    tell: "Folds his hands and goes quiet before answering anything difficult.",
    opening: "I have buried two Harrows and married one. Secrets in this house are older than the storm. Ask gently.",
    questions: [
      "What do you know about the locket's history?",
      "Did anyone confess anything to you tonight?",
      "Where were you between 8 and 9pm?",
    ],
  },
  {
    id: "niko",
    name: "Niko Vane",
    role: "Musician, guest in Room 6",
    personality:
      "Young, nervous charm, talks fast when cornered. Hums when he lies.",
    secret: "Gambling debts in the city. He checked in under a false surname and plans to leave on the morning train.",
    tell: "Hums under his breath. His guitar case is too heavy for a guitar.",
    opening: "I play songs, I don't steal necklaces. Though tonight, honestly? I wish I'd never stopped here.",
    questions: [
      "Why did you check in under a false name?",
      "What is in the guitar case?",
      "Where were you between 8 and 9pm?",
    ],
  },
];

// Clues: `via` controls how a clue can be found.
// "search" = room search only. "ask" = interrogation only. "both" = either.
// Dialogue can NEVER invent clues: a model's clueRevealed is accepted only
// if the id exists here and its `via` includes "ask".
export const CLUES = [
  { id: "c1", room: "lobby", via: "both", text: "Guest register: Niko checked in under a false surname.", implicates: ["niko"] }, // "both": the perfect ending must be reachable by deterministic play alone (Gate 1 Lead decision).
  { id: "c2", room: "dining", via: "search", text: "A broken glass under the table, with a trace of lipstick.", implicates: ["ada"] },
  { id: "c3", room: "library", via: "search", text: "A torn letter about the locket's insurance value.", implicates: ["elsa"] },
  { id: "c4", room: "library", via: "both", text: "A logbook entry torn out — the night of the storm, twelve years ago.", implicates: ["elsa", "osei"] },
  { id: "c5", room: "cellar", via: "search", text: "Muddy footprints matching Tomas's boots, leading to the cellar.", implicates: ["tomas"] },
  { id: "c6", room: "cellar", via: "search", text: "The window latch was opened from inside, not forced.", implicates: ["tomas", "elsa"] },
  { id: "c7", room: "room6", via: "search", text: "One drawer searched — and only one. Someone knew what they wanted.", implicates: ["niko", "tomas"] },
  { id: "c8", room: "room6", via: "search", text: "A one-way train ticket for tomorrow morning, in Niko's coat.", implicates: ["niko"] },
  { id: "c9", room: "library", via: "search", text: "A photograph: young Elsa with the locket's first owner.", implicates: ["elsa"] },
  { id: "c10", room: "lobby", via: "search", text: "A burnt envelope corner in the fireplace, with a solicitor's seal.", implicates: ["elsa"] },
];

export const MOTIVES = [
  "To pay off debts",
  "To sell the locket",
  "To claim the insurance",
  "To protect a family secret",
  "To stop a book being written",
  "Revenge for an old wrong",
];

// Three culprit variations of the same crime. Replay picks a new one.
export const MYSTERIES = {
  tomas: {
    culprit: "tomas",
    motive: "To pay off debts",
    truth:
      "Tomas opened the case with his knowledge of the lock, meaning to hold the locket until his lender was paid. He hid it in the cellar, planning to return it once the storm passed — a theft he told himself was only a loan.",
  },
  niko: {
    culprit: "niko",
    motive: "To sell the locket",
    truth:
      "Niko took the locket to sell in the city and clear his gambling debts. The guitar case was never for a guitar. The morning train was his way out — the storm was the only thing that stopped him.",
  },
  elsa: {
    culprit: "elsa",
    motive: "To claim the insurance",
    truth:
      "Elsa staged the theft herself: the insurance would save the inn, and she knew the case better than anyone. She hid the locket where only she would look — and then the storm trapped her with her own crime.",
  },
};

export const ENDINGS = {
  perfect: {
    title: "Case Closed — Perfect Solve",
    text: "The room goes silent. The culprit's story falls apart, clue by clue, until there is nothing left but the truth. The locket is recovered before the storm breaks.",
  },
  partial: {
    title: "Case Closed — But Not Whole",
    text: "You named the right person, but the why slipped away. A confession, half-given. The locket returns — the full truth does not.",
  },
  wrong: {
    title: "The Wrong Accusation",
    text: "The accusation lands — and misses. While the inn argues, the real thief slips out with the morning tide. The case goes into the logbook as unsolved.",
  },
  cold: {
    title: "The Case Goes Cold",
    text: "You walk away from the inn as the storm breaks. The locket is never found. The Saltwind Inn keeps its secret — and so do you.",
  },
};

export function getSuspect(id) {
  return SUSPECTS.find((s) => s.id === id);
}
export function getClue(id) {
  return CLUES.find((c) => c.id === id);
}
export function getRoom(id) {
  return ROOMS.find((r) => r.id === id);
}
