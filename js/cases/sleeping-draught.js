// GENERATED — do not hand-edit. Source: content-drafts/sleeping-draught.json (plus the display-only `blurb`, whose text lives in the generator).
// Regenerate: node tests/generate-case-modules.mjs

export const SLEEPING_DRAUGHT = {
  "clues": [
    {
      "id": "k1",
      "implicates": [
        "elsa",
        "ada"
      ],
      "room": "dining",
      "text": "The decanter's dregs smell of laudanum — a sleeping draught, not wine.",
      "via": "search"
    },
    {
      "id": "k2",
      "implicates": [
        "elsa"
      ],
      "room": "library",
      "text": "A laudanum bottle, hidden behind the logbook shelf, with a chemist's label.",
      "via": "search"
    },
    {
      "id": "k3",
      "implicates": [
        "ada"
      ],
      "room": "library",
      "text": "A borrowed herbal on the reading desk, open to 'doses that bring sleep' — a train timetable tucked inside as a bookmark.",
      "via": "both"
    },
    {
      "id": "k4",
      "implicates": [
        "tomas"
      ],
      "room": "cellar",
      "text": "A crate of untaxed brandy behind the wine racks, still wet from the sea.",
      "via": "search"
    },
    {
      "id": "k5",
      "implicates": [
        "tomas"
      ],
      "room": "cellar",
      "text": "Muddy footprints in Bram's boot size, going to the cellar door and back, just before dinner.",
      "via": "search"
    },
    {
      "id": "k6",
      "implicates": [
        "ada"
      ],
      "room": "lobby",
      "text": "An unopened letter in the lobby pigeonhole, addressed to Ada Kline from a city inquiry agency.",
      "via": "search"
    },
    {
      "id": "k7",
      "implicates": [
        "niko"
      ],
      "room": "room6",
      "text": "A pawn ticket in Niko's coat pocket, for a silver watch, dated last week.",
      "via": "search"
    },
    {
      "id": "k8",
      "implicates": [
        "elsa"
      ],
      "room": "dining",
      "text": "The seating plan: Bram's place was moved at the last minute, next to the sideboard.",
      "via": "both"
    },
    {
      "id": "k9",
      "implicates": [
        "osei"
      ],
      "room": "library",
      "text": "A confession schedule in Father Osei's hand: 'B. — 7pm, in the library.'",
      "via": "search"
    },
    {
      "id": "k10",
      "implicates": [
        "tomas"
      ],
      "room": "lobby",
      "text": "A scrap of burnt paper in the fireplace, in Bram's hand: '...tell the revenue men...'",
      "via": "search"
    }
  ],
  "crime": "Between 7pm and 8pm, during the worst storm in twelve years, someone put a sleeping draught in the wine decanter on the sideboard — the one Bram poured from after dinner. Old Bram, the night porter, drank from it and collapsed. He breathes, but he will not wake until morning — and the road out is flooded. No one left the inn. Bram knew something about every person in this house.",
  "key": "sleeping-draught",
  "motives": [
    "To protect the inn from the revenue men",
    "To silence Bram about the smuggling",
    "To keep Bram at the inn until he talked",
    "To settle an old score",
    "To hide a theft",
    "To stop a confession being told"
  ],
  "suspects": [
    {
      "id": "elsa",
      "name": "Elsa Harrow",
      "opening": "Bram has worked this inn for thirty years. Someone in my house did this to him. Find them — but mind your manners in my inn.",
      "personality": "Proud, tired, fiercely protective of the inn. Speaks plainly. Changes the subject when Bram's name comes up.",
      "questions": [
        "Who poured Bram's wine tonight?",
        "What medicine do you keep in the library?",
        "Where were you between 7 and 8pm?"
      ],
      "role": "Innkeeper",
      "secret": "She keeps her late husband's laudanum bottle hidden in the library — and she knows about the smuggled brandy in her cellar. She moved Bram's place tonight because rain was coming through the window by his usual seat.",
      "tell": "Straightens the decanters on the sideboard when nervous."
    },
    {
      "id": "tomas",
      "name": "Tomas Rey",
      "opening": "I fish. I drink. I sleep. I don't poison old men. Ask your questions and be done.",
      "personality": "Gruff, few words, loyal to the sea and suspicious of strangers. Answers questions with questions.",
      "questions": [
        "Where were you between 7 and 8pm?",
        "What is in the cellar that shouldn't be?",
        "What did Bram say to you tonight?"
      ],
      "role": "Fisherman",
      "secret": "He lands untaxed brandy through the cellar window on storm nights. Bram found the latest crate.",
      "tell": "Checks the cellar door whenever the wind rises."
    },
    {
      "id": "ada",
      "name": "Ada Kline",
      "opening": "A drugged decanter, a storm, five suspects — I would call it a cliché if I weren't living in it. What do you want to know?",
      "personality": "Curious, quick, charming. Asks more questions than she answers. Takes notes on everything.",
      "questions": [
        "Why did you really come to the inn?",
        "What did you want from Bram?",
        "Where were you between 7 and 8pm?"
      ],
      "role": "Travelling writer",
      "secret": "A city inquiry agency hired her to find Bram — the last man known to have seen her missing father alive. She borrowed the inn's herbal to research village remedies for a story. Bram had told her he would leave at first light.",
      "tell": "She writes down everything Bram says, word for word."
    },
    {
      "id": "osei",
      "name": "Father Osei",
      "opening": "I have buried two Harrows and married one. Bram's secrets are not mine to tell. Ask gently.",
      "personality": "Calm, kind, deliberate. Speaks in riddles when pressed. Hears more than he says.",
      "questions": [
        "What did Bram confess tonight?",
        "What do you know about the wreck?",
        "Where were you between 7 and 8pm?"
      ],
      "role": "Retired priest",
      "secret": "Bram confessed to him at 7pm — something about a ship, a false light, and a wreck, twelve years ago.",
      "tell": "Goes quiet and folds his hands before answering anything about Bram."
    },
    {
      "id": "niko",
      "name": "Niko Vane",
      "opening": "I play songs, I don't poison people. Though tonight, honestly? I wish I'd never stopped here.",
      "personality": "Young, nervous charm, talks fast when cornered. Hums when he lies.",
      "questions": [
        "Where did the silver watch come from?",
        "What did Bram say when he saw you?",
        "Where were you between 7 and 8pm?"
      ],
      "role": "Musician, guest in Room 6",
      "secret": "The silver watch he pawned belonged to Bram's dead son — Niko won it in a card game and never told Bram.",
      "tell": "Hums under his breath whenever Bram's name is mentioned."
    }
  ],
  "timeline": [
    "6:00pm — Dinner begins. All five suspects are in the dining room.",
    "7:00pm — Bram confesses to Father Osei in the library.",
    "7:30pm — The storm cuts the road. The inn is sealed in.",
    "7:00–8:00pm — The decanter is drugged. Bram drinks and collapses.",
    "8:00pm — Bram is carried to his room, unconscious. You are asked to investigate."
  ],
  "title": "The Sleeping Draught",
  "variations": {
    "ada": {
      "culprit": "ada",
      "motive": "To keep Bram at the inn until he talked",
      "truth": "Ada drugged the decanter with laudanum drops of her own so he could not leave before telling her what he knew about her missing father. She meant to delay him, not to harm him."
    },
    "elsa": {
      "culprit": "elsa",
      "motive": "To protect the inn from the revenue men",
      "truth": "Elsa drugged the decanter with her late husband's laudanum so he would sleep until the brandy was moved. She meant to save the inn — and put a man to sleep to do it."
    },
    "tomas": {
      "culprit": "tomas",
      "motive": "To silence Bram about the smuggling",
      "truth": "Tomas took the laudanum bottle from its hiding place behind the library shelf — he had watched Elsa hide it years before, and he took it before Bram's 7pm confession — drugged the decanter, and put the bottle back empty. Bram had found the brandy and meant to tell the revenue men; Tomas meant only to buy one night."
    }
  },
  "blurb": "The night porter drinks from a drugged decanter and will not wake until morning."
};
