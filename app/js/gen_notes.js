// Notiz-Generierung – 1:1 portiert aus gen_notes.py
// https://github.com/zefanja/bible-memorizer/blob/main/src/gen_notes.py

// Tokenizer: Wörter (\w+) | Einzelzeichen | Whitespace
// JavaScript \w bezieht sich standardmäßig nur auf ASCII-Wörter,
// während Python re.findall mit \w Unicode-Wörter matcht.
// Wir verwenden \p{L}\p{N}_ + den 'u'-Flag für Unicode-Parität.
const TOKEN_RE = /[\p{L}\p{N}_]+|[^\p{L}\p{N}_\s]|\s+/gu;
const WORD_RE = /^[\p{L}\p{N}_]+$/u;

/**
 * Ersetzt den letzten Buchstaben jedes Wortes durch '_'.
 * Original: replace_last_letter_with_underscore(text)
 */
export function replaceLastLetterWithUnderscore(text) {
  return tokenize(text)
    .map((t) => (WORD_RE.test(t) ? (t.length > 0 ? t.slice(0, -1) + "_" : "") : t))
    .join("");
}

/**
 * Behält nur den ersten Buchstaben jedes Wortes.
 * Original: keep_first_letter_only(text)
 */
export function keepFirstLetterOnly(text) {
  return tokenize(text)
    .map((t) => (WORD_RE.test(t) ? (t.length > 0 ? t[0] : "") : t))
    .join("");
}

function tokenize(text) {
  return text.match(TOKEN_RE) || [];
}

const LOWER_AZ = "abcdefghijklmnopqrstuvwxyz";

/**
 * Zerlegt den Eingabetext in Zeilen, erkennt Versnummern am Anfang
 * und produziert pro Zeile ein Datenobjekt.
 * Original: process_lines(text)
 */
export function processLines(text) {
  const lines = text.split(/\r?\n/);
  let currentVerse = "0";
  let sublineIndex = 0;
  const result = [];

  // Regex wie im Python-Original: r'^\s*(\d+)\s+(.*)'
  const verseLineRe = /^\s*(\d+)\s+(.*)$/;

  for (const line of lines) {
    const stripped = line.trim();
    if (!stripped) continue; // leere Zeilen überspringen

    let content;
    const m = line.match(verseLineRe);
    if (m) {
      currentVerse = m[1];
      sublineIndex = 0;
      content = m[2];
    } else {
      content = stripped;
    }

    const letter = LOWER_AZ[sublineIndex % 26];

    result.push({
      first_letters: keepFirstLetterOnly(content),
      last_letters: replaceLastLetterWithUnderscore(content),
      verse_number: currentVerse,
      verse_part: letter,
      answer: line.trim(),
    });

    sublineIndex += 1;
  }

  return result;
}

/**
 * Gruppiert die Verse nach verse_number.
 * Original: sort_by_verse_number(data)
 */
export function sortByVerseNumber(data) {
  const map = new Map();
  for (const d of data) {
    if (!map.has(d.verse_number)) map.set(d.verse_number, []);
    map.get(d.verse_number).push(d);
  }
  return map;
}

/**
 * Erzeugt die HTML-Übersichtstabelle für Karte 3.
 * Original: create_html_table(data, verse_number, verse_part="a")
 *
 * `groupedData` ist die Map aus sortByVerseNumber.
 */
export function createHtmlTable(groupedData, verseNumber, versePart = "a") {
  const columns = 5;
  const width = Math.floor(100 / columns);
  const verseNumbers = Array.from(groupedData.keys());
  let html = "<table border=1>";
  let counter = 0;

  for (const vn of verseNumbers) {
    if (counter % columns === 0) {
      if (counter === 0) html += "<tr>";
      else if (counter < verseNumbers.length) html += "<tr>";
    }

    let td = `<td style='width:${width}%;'>`;
    const verseRows = groupedData.get(vn);

    verseRows.forEach((vers, idx) => {
      const vnSpan = `<span><strong>${vers.verse_number} </strong></span>`;
      if (idx === 0) td += vnSpan;

      let highlight = "";
      if (vers.verse_number === verseNumber && vers.verse_part === versePart) {
        highlight = "class='highlight'";
      }
      td += `<span ${highlight}>${vers.first_letters} </span>`;
    });

    td += "</td>";
    html += td;

    if (counter % columns === 4 && counter !== 0) {
      html += "</tr>";
    }
    counter += 1;
  }

  while (counter % columns !== 0) {
    html += "<td></td>";
    counter += 1;
  }

  html += "</tr></table>";
  return html;
}

/**
 * Berechnet front/back-Kontext (n Zeilen davor/danach inkl. aktueller).
 * Original: get_verses(data, verse_number, verse_part, amount=2)
 */
export function getVerses(data, verseNumber, versePart, amount = 2) {
  let front = "";
  let back = "";

  for (let idx = 0; idx < data.length; idx++) {
    const d = data[idx];
    if (d.verse_number !== verseNumber || d.verse_part !== versePart) continue;

    front = "";
    back = "";

    let counter = 0;
    while (counter < amount && idx + counter < data.length) {
      back += `${data[idx + counter].answer}<br>`;
      counter += 1;
    }

    counter = 0;
    while (counter < amount && idx - counter - 1 >= 0) {
      front = `${data[idx - counter - 1].answer}<br>${front}`;
      counter += 1;
    }
  }

  if (front === "") front = "[Beginning]";
  return { front, back };
}

/**
 * Wandelt einen freien Bibeltext in eine Liste von Note-Datenobjekten
 * (mit allen Feldern, die der Bible-Memorizer-Notetype braucht).
 *
 * Entspricht dem Python-`add_notes`, nur ohne Anki-Collection-Seiteneffekte.
 *
 * @param {Object} opts
 * @param {string} opts.title    – Titel (z.B. "Jakobus 2")
 * @param {number} opts.recite   – wie viele Zeilen Kontext vorne/hinten
 * @param {string} opts.text     – der Bibeltext
 * @param {boolean} opts.table   – Tabelle erzeugen?
 * @param {number}  opts.idEpochMs – Basiszeit in ms, für `id`-Feld
 * @returns {Array<Object>} Liste von Notizen (Felder als JS-Objekt)
 */
export function buildNotes({ title, recite, text, table, idEpochMs }) {
  const data = processLines(text);
  const grouped = sortByVerseNumber(data);

  const notes = [];
  data.forEach((d, idx) => {
    let html = "";
    if (grouped.size > 4 && table) {
      html = createHtmlTable(grouped, d.verse_number, d.verse_part);
    }

    const { front, back } = getVerses(data, d.verse_number, d.verse_part, recite);

    notes.push({
      answer: d.answer,
      verse_number: String(d.verse_number),
      verse_part: d.verse_part,
      table: html,
      front,
      back,
      first_letters: d.first_letters,
      last_letters: d.last_letters,
      title,
      id: `${idEpochMs}-${idx}`,
    });
  });

  return notes;
}
