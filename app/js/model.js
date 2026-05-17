// Bible Memorizer note type
// Portiert 1:1 aus model.py des Anki-Addons:
// https://github.com/zefanja/bible-memorizer/blob/main/src/model.py
//
// Feldreihenfolge entspricht _field_names aus model.py
// Templates entsprechen den final-version-Templates (current_version "1.5")

export const MODEL_NAME = "Bible Memorizer";
export const MODEL_VERSION = "1.5";

export const FIELD_NAMES = [
  "answer",
  "verse_number",
  "verse_part",
  "table",
  "front",
  "back",
  "first_letters",
  "last_letters",
  "title",
  "id",
];

export const SORT_FIELD = "id";
export const SORT_FIELD_INDEX = FIELD_NAMES.indexOf(SORT_FIELD);

// CSS exakt aus _styling in model.py (nach dedent().strip())
export const CARD_CSS = `.card {
    font-family: arial;
    font-size: 20px;
    text-align: center;
    color: black;
    background-color: white;
}

.back {
    color: blue;
    font-style: italic;
}

.table {
    font-size: 16px;
    margin: auto;
    max-width: 600px;
}

table {
    table-layout: fixed; 
    width: 100%; 
    border-collapse: collapse; 
    border: 1x solid;
}

td {
    word-wrap: break-word; 
    vertical-align: top; 
    padding:.3em;
}

td:last-child {
    background-color: orange;
}

.highlight {
    background-color: yellow;
}

.card.nightMode {
    background-color: #333;
}

.nightMode .back {
    color: yellow;
}

.passage {
    font-size: .8em
}

.front, .back {
   font-family: serif
}`;

// Card 1: Last-Letters-Übung (nur erzeugt wenn last_letters nicht leer)
const CARD1_FRONT = '{{#last_letters}}\n<div id="card">\n<div>{{title}}</div>\n<div class="passage">{{verse_number}}{{verse_part}}</div>\n<br>\n<div class="front">{{front}}\n{{last_letters}}</div>\n</div>\n{{/last_letters}}';
const CARD1_BACK = '{{FrontSide}}\n<br>\n<hr id="answer">\n<div class="back">{{answer}}</div>\n';

// Card 2: First-Letters-Übung
const CARD2_FRONT = '<div id="card">\n<div>{{title}}</div>\n<div class="passage">{{verse_number}}{{verse_part}}</div>\n<br>\n<div class="front">{{front}}\n{{first_letters}}</div>\n</div>';
const CARD2_BACK = '{{FrontSide}}\n<br>\n<hr id="answer">\n<div class="back">{{answer}}</div>\n';

// Card 3: Übersichtstabelle (nur wenn table nicht leer)
const CARD3_FRONT = '{{#table}}\n<div id="card">\n<div>{{title}}</div>\n<div class="passage">{{verse_number}}{{verse_part}}</div>\n<br>\n<div class="table">{{table}}</div>\n</div>\n{{/table}}';
const CARD3_BACK = '{{FrontSide}}\n<br>\n<hr id="answer">\n<div class="back">{{answer}}</div>\n';

// Card 4: Kontext-Karte (front -> back)
const CARD4_FRONT = '<div id="card">\n<div>{{title}}</div>\n<div class="passage">{{verse_number}}{{verse_part}}</div>\n<br>\n<div class="front">{{front}}</div>\n</div>';
const CARD4_BACK = '{{FrontSide}}\n<br>\n<hr id="answer">\n<div class="back">{{back}}</div>';

export const TEMPLATES = [
  { name: "Card 1", qfmt: CARD1_FRONT, afmt: CARD1_BACK },
  { name: "Card 2", qfmt: CARD2_FRONT, afmt: CARD2_BACK },
  { name: "Card 3", qfmt: CARD3_FRONT, afmt: CARD3_BACK },
  { name: "Card 4", qfmt: CARD4_FRONT, afmt: CARD4_BACK },
];

// req-Array für Anki: bestimmt, welche Karten überhaupt erzeugt werden.
// Format: [ord, "all"|"any"|"none", [feldindizes]]
//   "all"  = alle genannten Felder müssen befüllt sein
//   "any"  = mindestens eins
// Wir spiegeln die {{#feld}}-Conditionals der Templates wider.
export const TEMPLATE_REQ = [
  [0, "all", [FIELD_NAMES.indexOf("last_letters")]], // Card 1: nur wenn last_letters
  [1, "any", [FIELD_NAMES.indexOf("front"), FIELD_NAMES.indexOf("first_letters")]], // Card 2
  [2, "all", [FIELD_NAMES.indexOf("table")]], // Card 3: nur wenn table
  [3, "any", [FIELD_NAMES.indexOf("front"), FIELD_NAMES.indexOf("back"), FIELD_NAMES.indexOf("answer")]], // Card 4
];

/**
 * Erzeugt das JSON-Objekt für das Bible Memorizer Notetype,
 * passend für die collection.anki2-Spalte `models`.
 */
export function buildModelJSON({ modelId, deckId, nowSec }) {
  const flds = FIELD_NAMES.map((name, ord) => ({
    name,
    ord,
    sticky: false,
    rtl: false,
    font: "Arial",
    size: 20,
    description: "",
    plainText: false,
    collapsed: false,
    excludeFromSearch: false,
  }));

  const tmpls = TEMPLATES.map((t, ord) => ({
    name: t.name,
    ord,
    qfmt: t.qfmt,
    afmt: t.afmt,
    bqfmt: "",
    bafmt: "",
    did: null,
    bfont: "",
    bsize: 0,
  }));

  return {
    id: modelId,
    name: MODEL_NAME,
    type: 0, // 0 = standard, 1 = cloze
    mod: nowSec,
    usn: -1,
    sortf: SORT_FIELD_INDEX,
    did: deckId,
    tmpls,
    flds,
    css: CARD_CSS,
    latexPre:
      "\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n",
    latexPost: "\\end{document}",
    latexsvg: false,
    req: TEMPLATE_REQ,
    tags: [],
    vers: [],
  };
}
