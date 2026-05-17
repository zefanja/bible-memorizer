// APKG-Builder
// Erzeugt eine collection.anki2 (SQLite v11) und verpackt sie zu einem .apkg.
// Verwendet das Legacy-Format, das von allen Anki-Versionen importiert wird.
//
// Externe Abhängigkeiten (über CDN als globals erwartet):
//   - window.initSqlJs (sql.js)
//   - window.JSZip
//
// Anki-Schema-Referenz: https://github.com/ankitects/anki/blob/main/docs/legacy_apkg.md

import {
  MODEL_NAME,
  FIELD_NAMES,
  SORT_FIELD_INDEX,
  buildModelJSON,
} from "./model.js";
import { buildNotes } from "./gen_notes.js";
import { sha1Hex, randomUint32 } from "./sha1.js";

// ---------- Hilfsfunktionen ----------

function nowMs() {
  return Date.now();
}
function nowSec() {
  return Math.floor(Date.now() / 1000);
}

// strip_html – simple Variante. Anki's strip_html entfernt Tags und
// behandelt Sound-/Image-Tags. Da unser erstes Feld (`answer`) reiner Text ist,
// reicht eine Tag-Entfernung.
function stripHtml(s) {
  return (s || "").replace(/<[^>]*>/g, "");
}

// csum = int(sha1(strip_html(field0))[:8], 16)
// Synchron via pure-JS-SHA-1 (funktioniert auch in file:// und nicht-https-Kontexten,
// wo crypto.subtle nicht verfügbar ist).
function notesCsum(firstField) {
  const hex = sha1Hex(stripHtml(firstField));
  return parseInt(hex.slice(0, 8), 16);
}

// GUID-Generator wie genanki: 10 Zeichen aus dem Anki-Base91-Alphabet
const GUID_ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&()*+,-./:;<=>?@[]^_`{|}~";
function randomGuid(len = 10) {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += GUID_ALPHABET[randomUint32() % GUID_ALPHABET.length];
  }
  return out;
}

// ---------- Default-Conf / Default-Deck-Conf ----------

function defaultConf() {
  return {
    activeDecks: [1],
    curDeck: 1,
    newSpread: 0,
    collapseTime: 1200,
    timeLim: 0,
    estTimes: true,
    dueCounts: true,
    curModel: null, // wird gesetzt
    nextPos: 1,
    sortType: "noteFld",
    sortBackwards: false,
    addToCur: true,
    dayLearnFirst: false,
    schedVer: 2,
  };
}

function defaultDeckConfig() {
  return {
    1: {
      id: 1,
      mod: 0,
      name: "Default",
      usn: 0,
      maxTaken: 60,
      autoplay: true,
      timer: 0,
      replayq: true,
      new: {
        bury: false,
        delays: [1.0, 10.0],
        initialFactor: 2500,
        ints: [1, 4, 0],
        order: 1,
        perDay: 20,
      },
      rev: {
        bury: false,
        ease4: 1.3,
        ivlFct: 1.0,
        maxIvl: 36500,
        perDay: 200,
        hardFactor: 1.2,
      },
      lapse: {
        delays: [10.0],
        leechAction: 1,
        leechFails: 8,
        minInt: 1,
        mult: 0.0,
      },
      dyn: false,
      newMix: 0,
      newPerDayMinimum: 0,
      interdayLearningMix: 0,
      reviewOrder: 0,
      newSortOrder: 0,
      newGatherPriority: 0,
      buryInterdayLearning: false,
    },
  };
}

function buildDeck({ deckId, deckName }) {
  return {
    1: {
      id: 1,
      mod: 0,
      name: "Default",
      usn: 0,
      lrnToday: [0, 0],
      revToday: [0, 0],
      newToday: [0, 0],
      timeToday: [0, 0],
      collapsed: true,
      browserCollapsed: true,
      desc: "",
      dyn: 0,
      conf: 1,
      extendNew: 0,
      extendRev: 0,
    },
    [deckId]: {
      id: deckId,
      mod: nowSec(),
      name: deckName,
      usn: -1,
      lrnToday: [0, 0],
      revToday: [0, 0],
      newToday: [0, 0],
      timeToday: [0, 0],
      collapsed: false,
      browserCollapsed: false,
      desc: "",
      dyn: 0,
      conf: 1,
      extendNew: 0,
      extendRev: 0,
    },
  };
}

// ---------- DDL für collection.anki2 (Schema v11) ----------

const SCHEMA_SQL = `
CREATE TABLE col (
  id integer PRIMARY KEY,
  crt integer NOT NULL,
  mod integer NOT NULL,
  scm integer NOT NULL,
  ver integer NOT NULL,
  dty integer NOT NULL,
  usn integer NOT NULL,
  ls integer NOT NULL,
  conf text NOT NULL,
  models text NOT NULL,
  decks text NOT NULL,
  dconf text NOT NULL,
  tags text NOT NULL
);

CREATE TABLE notes (
  id integer PRIMARY KEY,
  guid text NOT NULL,
  mid integer NOT NULL,
  mod integer NOT NULL,
  usn integer NOT NULL,
  tags text NOT NULL,
  flds text NOT NULL,
  sfld integer NOT NULL,
  csum integer NOT NULL,
  flags integer NOT NULL,
  data text NOT NULL
);

CREATE TABLE cards (
  id integer PRIMARY KEY,
  nid integer NOT NULL,
  did integer NOT NULL,
  ord integer NOT NULL,
  mod integer NOT NULL,
  usn integer NOT NULL,
  type integer NOT NULL,
  queue integer NOT NULL,
  due integer NOT NULL,
  ivl integer NOT NULL,
  factor integer NOT NULL,
  reps integer NOT NULL,
  lapses integer NOT NULL,
  left integer NOT NULL,
  odue integer NOT NULL,
  odid integer NOT NULL,
  flags integer NOT NULL,
  data text NOT NULL
);

CREATE TABLE revlog (
  id integer PRIMARY KEY,
  cid integer NOT NULL,
  usn integer NOT NULL,
  ease integer NOT NULL,
  ivl integer NOT NULL,
  lastIvl integer NOT NULL,
  factor integer NOT NULL,
  time integer NOT NULL,
  type integer NOT NULL
);

CREATE TABLE graves (
  usn integer NOT NULL,
  oid integer NOT NULL,
  type integer NOT NULL
);

CREATE INDEX ix_notes_csum ON notes (csum);
CREATE INDEX ix_notes_usn ON notes (usn);
CREATE INDEX ix_cards_usn ON cards (usn);
CREATE INDEX ix_cards_nid ON cards (nid);
CREATE INDEX ix_cards_sched ON cards (did, queue, due);
CREATE INDEX ix_revlog_usn ON revlog (usn);
CREATE INDEX ix_revlog_cid ON revlog (cid);
`;

// ---------- Hauptfunktion ----------

let _sqlJsPromise = null;
function loadSqlJs() {
  if (_sqlJsPromise) return _sqlJsPromise;
  _sqlJsPromise = window.initSqlJs({
    locateFile: (file) =>
      `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`,
  });
  return _sqlJsPromise;
}

// Preload starten sobald das Modul geladen wird
export function preloadSqlJs() {
  loadSqlJs().catch(() => {
    // bei Fehler später nochmal versuchen
    _sqlJsPromise = null;
  });
}

/**
 * Baut ein vollständiges .apkg im Speicher und liefert einen Blob zurück.
 *
 * @param {Object} input
 * @param {string} input.title       Titel / Notenüberschrift (z.B. "Jakobus 2")
 * @param {string} input.deckName    Deckname (Default = title)
 * @param {string} input.text        Bibeltext
 * @param {number} input.recite      Zeilen Kontext (1..10)
 * @param {boolean} input.table      Tabelle erzeugen?
 * @returns {Promise<{blob: Blob, noteCount: number, cardCount: number}>}
 */
export async function buildApkg({
  title,
  deckName,
  text,
  recite,
  table,
}) {
  if (!title || !title.trim()) throw new Error("title required");
  if (!text || !text.trim()) throw new Error("text required");

  const SQL = await loadSqlJs();
  const db = new SQL.Database();
  db.exec(SCHEMA_SQL);

  // ---- IDs ----
  const baseMs = nowMs();
  const baseSec = nowSec();
  const modelId = baseMs; // gleich Notentyp-ID
  const deckId = baseMs + 1;

  // ---- col-Row ----
  const modelJson = buildModelJSON({
    modelId,
    deckId,
    nowSec: baseSec,
  });
  const modelsObj = {};
  modelsObj[modelId] = modelJson;

  const conf = defaultConf();
  conf.curModel = modelId;
  conf.curDeck = deckId;
  conf.activeDecks = [deckId];

  const decks = buildDeck({ deckId, deckName: deckName || title });
  const dconf = defaultDeckConfig();

  // crt: Tagesbeginn (Mitternacht lokal) in Sekunden – Anki nutzt das
  // als "rollover"-Anker. Für unseren Import ist's egal, solange's gesetzt ist.
  const crt = Math.floor(
    new Date(new Date().setHours(0, 0, 0, 0)).getTime() / 1000
  );

  db.run(
    `INSERT INTO col (id, crt, mod, scm, ver, dty, usn, ls, conf, models, decks, dconf, tags)
     VALUES (1, ?, ?, ?, 11, 0, 0, 0, ?, ?, ?, ?, '{}')`,
    [
      crt,
      baseMs,
      baseMs,
      JSON.stringify(conf),
      JSON.stringify(modelsObj),
      JSON.stringify(decks),
      JSON.stringify(dconf),
    ]
  );

  // ---- Notizen + Karten ----
  const notes = buildNotes({
    title,
    recite,
    text,
    table,
    idEpochMs: baseMs,
  });

  if (notes.length === 0) {
    db.close();
    throw new Error("no_notes");
  }

  // Helper: welche Karten-Ordinals existieren für eine Notiz?
  // Card 1 (ord=0): nur wenn last_letters nicht leer
  // Card 2 (ord=1): immer
  // Card 3 (ord=2): nur wenn table nicht leer
  // Card 4 (ord=3): immer
  function cardOrdsForNote(n) {
    const ords = [];
    if (n.last_letters && n.last_letters.trim()) ords.push(0);
    ords.push(1);
    if (n.table && n.table.trim()) ords.push(2);
    ords.push(3);
    return ords;
  }

  const insertNote = db.prepare(
    `INSERT INTO notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data)
     VALUES (?, ?, ?, ?, -1, '', ?, ?, ?, 0, '')`
  );
  const insertCard = db.prepare(
    `INSERT INTO cards
       (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data)
     VALUES (?, ?, ?, ?, ?, -1, 0, 0, ?, 0, 0, 0, 0, 0, 0, 0, 0, '')`
  );

  let nextNoteId = baseMs;
  let nextCardId = baseMs;
  let cardCount = 0;

  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    const flds = FIELD_NAMES.map((f) => n[f] ?? "").join("\x1f");
    const sfld = n[FIELD_NAMES[SORT_FIELD_INDEX]] ?? "";
    const csum = notesCsum(n.answer);
    const guid = randomGuid();

    // Note-IDs müssen unique sein und werden in Anki als Millisekunden interpretiert.
    const noteId = nextNoteId++;

    insertNote.run([noteId, guid, modelId, baseSec, flds, String(sfld), csum]);

    for (const ord of cardOrdsForNote(n)) {
      const cardId = nextCardId++;
      // due = neue Karten-Reihenfolge (1-basiert) – einfach hochzählen
      insertCard.run([cardId, noteId, deckId, ord, baseSec, cardCount + 1]);
      cardCount += 1;
    }
  }

  insertNote.free();
  insertCard.free();

  // ---- DB als Bytes exportieren ----
  const dbBytes = db.export();
  db.close();

  // ---- ZIP zusammenstellen ----
  const zip = new window.JSZip();
  zip.file("collection.anki2", dbBytes);
  // Leere Media-Map (kein Bild, kein Audio)
  zip.file("media", "{}");

  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    mimeType: "application/octet-stream",
  });

  return { blob, noteCount: notes.length, cardCount };
}
