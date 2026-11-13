// GENERATED — do not hand-edit. Source: content-drafts/burned-page.json (plus the display-only `blurb`, whose text lives in the generator).
// Regenerate: node tests/generate-case-modules.mjs

export const BURNED_PAGE = {
  "clues": [
    {
      "id": "m1",
      "implicates": [
        "ada"
      ],
      "room": "library",
      "text": "The fireplace: charred paper, and one corner unburned — the words '...nine winters...' in a clerk's hand.",
      "via": "search"
    },
    {
      "id": "m2",
      "implicates": [
        "niko"
      ],
      "room": "library",
      "text": "A lamp-oil can, half empty, standing by the fireplace. The library lamp is full — and the can's handle carries a smear of rosin.",
      "via": "search"
    },
    {
      "id": "m3",
      "implicates": [
        "tomas"
      ],
      "room": "dining",
      "text": "A singed thread on the dining chair nearest the door — wool, dyed the blue of a sailor's coat.",
      "via": "both"
    },
    {
      "id": "m4",
      "implicates": [
        "niko"
      ],
      "room": "room6",
      "text": "A folded banknote and a note in a stranger's hand, in Niko's bag: 'Burn the page. Ask nothing.'",
      "via": "search"
    },
    {
      "id": "m5",
      "implicates": [
        "niko"
      ],
      "room": "lobby",
      "text": "Niko's coat on the cloak rail, damp, smelling faintly of lamp oil.",
      "via": "search"
    },
    {
      "id": "m6",
      "implicates": [
        "ada",
        "osei"
      ],
      "room": "library",
      "text": "The logbook's neighbours of the missing page are intact — only the loan page was taken.",
      "via": "both"
    },
    {
      "id": "m7",
      "implicates": [
        "tomas",
        "elsa"
      ],
      "room": "cellar",
      "text": "A boat ledger in Tomas's hand: small payments marked 'E.H.', every season for nine years — interest only; the principal never shrank.",
      "via": "search"
    },
    {
      "id": "m8",
      "implicates": [
        "ada"
      ],
      "room": "lobby",
      "text": "The guest register: Ada asked for the library key at 7:45pm, 'to look at the old logbook.' The library key hangs on a hook behind the lobby desk, and anyone in the inn could take it.",
      "via": "both"
    },
    {
      "id": "m9",
      "implicates": [
        "osei"
      ],
      "room": "library",
      "text": "Father Osei's prayer book on the library shelf: inside, a folded copy of a logbook page, in the clerk's hand.",
      "via": "search"
    },
    {
      "id": "m10",
      "implicates": [
        "tomas"
      ],
      "room": "dining",
      "text": "A coil of net twine on the dining table, singed at one end. Tomas was mending nets here before dinner.",
      "via": "search"
    }
  ],
  "crime": "Between 8pm and 9pm, during the worst storm in twelve years, someone tore one page from the inn's logbook and burned it in the library fireplace, with a handful of letters. The fire was caught before it spread — but the page is gone: the logbook page recording a large loan made nine winters ago, naming Elsa's late brother-in-law as the borrower — a man who vanished owing the inn everything, and never repaid it. The road out is flooded. No one left the inn.",
  "key": "burned-page",
  "motives": [
    "To erase the debt he never repaid",
    "To protect her father's name",
    "He was paid to destroy the page",
    "To bury a family shame",
    "To keep a witness silent",
    "To hide a second set of books"
  ],
  "suspects": [
    {
      "id": "elsa",
      "name": "Elsa Harrow",
      "opening": "That logbook is forty years of this house. Someone tried to burn its memory. Find them — but mind your manners in my inn.",
      "personality": "Proud, tired, fiercely protective of the inn. Speaks plainly. Deflects questions about the past.",
      "questions": [
        "Who had the library key tonight?",
        "What was on the burned page?",
        "Where were you between 8 and 9pm?"
      ],
      "role": "Innkeeper",
      "secret": "The loan was made to her late husband's brother, who vanished owing the inn everything. She keeps the library key.",
      "tell": "Locks and unlocks the library door when she passes it."
    },
    {
      "id": "tomas",
      "name": "Tomas Rey",
      "opening": "I fish. I drink. I sleep. I don't burn books. Ask your questions and be done.",
      "personality": "Gruff, few words, loyal to the sea and suspicious of strangers. Answers questions with questions.",
      "questions": [
        "Where were you between 8 and 9pm?",
        "Who lent you the money for your first boat?",
        "What were you mending in the dining room?"
      ],
      "role": "Fisherman",
      "secret": "He borrowed the inn's money himself, nine winters ago, for his first boat — the loan page names Elsa's late brother-in-law, who fronted the loan and then vanished, and Tomas told everyone his father lent it to him.",
      "tell": "Mud on his boots, always. Looks at the library door when the storm gusts."
    },
    {
      "id": "ada",
      "name": "Ada Kline",
      "opening": "A burned page, a storm, five suspects — I would call it a cliché if I weren't living in it. What do you want to know?",
      "personality": "Curious, quick, charming. Asks more questions than she answers. Takes notes on everything.",
      "questions": [
        "Why did you ask for the library key?",
        "What was your father to this inn?",
        "Where were you between 8 and 9pm?"
      ],
      "role": "Travelling writer",
      "secret": "Her father was the inn's clerk who wrote the loan page. She came to learn whether he stole the money or only recorded it.",
      "tell": "Her notebook is always open. She smiles when a question surprises her."
    },
    {
      "id": "osei",
      "name": "Father Osei",
      "opening": "I have buried two Harrows and married one. Paper burns, but memory does not. Ask gently.",
      "personality": "Calm, kind, deliberate. Speaks in riddles when pressed. Hears more than he says.",
      "questions": [
        "What did the loan page say?",
        "Why do you keep a copy of it?",
        "Where were you between 8 and 9pm?"
      ],
      "role": "Retired priest",
      "secret": "He witnessed the loan and kept his own copy of the page, folded in his prayer book, for nine years.",
      "tell": "Folds his hands and goes quiet before answering anything difficult."
    },
    {
      "id": "niko",
      "name": "Niko Vane",
      "opening": "I play songs, I don't burn libraries. Though tonight, honestly? I wish I'd never stopped here.",
      "personality": "Young, nervous charm, talks fast when cornered. Hums when he lies.",
      "questions": [
        "Who paid you to come here?",
        "Why does your coat smell of lamp oil?",
        "Where were you between 8 and 9pm?"
      ],
      "role": "Musician, guest in Room 6",
      "secret": "A stranger in the city paid him to find the loan page and destroy it. He never asked why.",
      "tell": "Hums under his breath. His coat smells of lamp oil."
    }
  ],
  "timeline": [
    "6:00pm — Dinner begins. All five suspects are in the dining room.",
    "7:30pm — The storm cuts the road. The inn is sealed in.",
    "7:45pm — Ada asks for the library key.",
    "8:00–9:00pm — The fire in the library. The loan page burns.",
    "9:00pm — The fire is found; Tomas beats it out with his coat and helps carry water. You are asked to investigate."
  ],
  "title": "The Burned Page",
  "variations": {
    "ada": {
      "culprit": "ada",
      "motive": "To protect her father's name",
      "truth": "Ada burned the page to bury the question of whether her father stole the loan money. She came to the inn for the truth — and chose to destroy it instead. Niko, paid for the same job, had handled the oil can but had not yet struck a match when the fire started. She did not know Father Osei kept a copy of the page in his prayer book."
    },
    "niko": {
      "culprit": "niko",
      "motive": "He was paid to destroy the page",
      "truth": "A stranger in the city paid Niko to find the loan page and burn it. He never asked why — and the storm trapped him with the job half-understood. He did not know Father Osei kept a copy of the page in his prayer book — the job was never truly done."
    },
    "tomas": {
      "culprit": "tomas",
      "motive": "To erase the debt he never repaid",
      "truth": "Tomas borrowed the inn's money nine winters ago and told everyone his father lent it to him. He burned the page so the lie would die with it — the page was the inn's only proof of the debt, whatever name stood on it. Niko, paid for the same job, had handled the oil can but had not yet struck a match when the fire started. He did not know Father Osei kept a copy of the page in his prayer book."
    }
  },
  "blurb": "A page is torn from the inn's logbook and burned — the record of a loan nine winters old."
};
