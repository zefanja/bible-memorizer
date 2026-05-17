// Auto-Versformatter
// ---------------------
// Erkennt Versnummern im einkopierten Bibeltext und stellt sicher, dass jede
// Versnummer am Zeilenanfang steht. Das ist die zentrale UX-Funktion:
// Nutzer:innen kopieren oft aus YouVersion / die-Bibel.de / Bibelserver als
// Fließtext oder mit Hochstellungen, ohne dass die Versnummern auf eigenen
// Zeilen stehen.
//
// Erkannte Marker:
//   ¹ ² ³ …       Unicode-Hochstellungen      → IMMER als Versmarker behandelt
//   1 / 1. / 1)   normale Zahl mit/ohne Suffix → nur wenn Kontext klar nach
//                                                Vers aussieht (Satzzeichen
//                                                davor oder Zeilenanfang)
//
// Bewusst NICHT erkannt:
//   "1:3"               – Kapitel-Doppelpunkt-Vers-Referenz
//   "1. Mose 1"         – Buchname
//   "Es gab 5 Brote"    – Zahl mitten im Text ohne Satzzeichen davor
//
// Funktion ist idempotent.

const SUPERSCRIPT_DIGITS = {
  "\u2070": "0",
  "\u00B9": "1",
  "\u00B2": "2",
  "\u00B3": "3",
  "\u2074": "4",
  "\u2075": "5",
  "\u2076": "6",
  "\u2077": "7",
  "\u2078": "8",
  "\u2079": "9",
};

const SUPERSCRIPT_RE = /[\u2070\u00B9\u00B2\u00B3\u2074-\u2079]+/g;

// Satzzeichen, die plausibel ein Versende markieren.
// Bibelverse enden in ~99 % der Fälle auf eines davon.
// Wichtig: ":" steht NICHT in der Liste, weil "1:3" sonst zerschnitten würde
// (Kapitel-Vers-Notation).
const END_PUNCT = /[.!?,;"'»«”„‚›‹\u2018\u2019\u201C\u201D]/;

// Maximale plausible Versnummer (Psalm 119 hat 176).
const MAX_VERSE_NUM = 200;

function normalizeSuperscripts(text) {
  // Jede Hochzahl wird zu einem Newline + Ziffer(n) + Space.
  // Damit landen Hochstellungs-Versmarker garantiert auf eigener Zeile.
  return text.replace(SUPERSCRIPT_RE, (m) => {
    let digits = "";
    for (const ch of m) digits += SUPERSCRIPT_DIGITS[ch] ?? "";
    return `\n${digits} `;
  });
}

/**
 * Wandelt einen rohen Bibeltext in das Format um, das gen_notes erwartet.
 * Idempotent.
 */
export function autoFormatVerses(rawText) {
  if (!rawText) return "";

  // 1) NBSP & Co. → normale Spaces
  let text = rawText.replace(/\u00A0/g, " ");

  // 2) Hochzahlen → Newline + Ziffer + Space (immer als Versmarker)
  text = normalizeSuperscripts(text);

  // 3) Normale Versnummern mitten im Text erkennen.
  text = splitNormalVerseNumbers(text);

  // 4) Zeilen normalisieren
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .filter((l) => l.length > 0)
    .join("\n");
}

function splitNormalVerseNumbers(text) {
  // n+1-Heuristik: Wir kennen den Startvers (erste Zahl am Anfang des Texts)
  // und suchen dann gezielt die NÄCHSTE erwartete Versnummer (n+1, n+2, …).
  // Alle anderen Zahlen im Text (Fußnoten [1], "5 Brote", "Galater 1:3") werden
  // automatisch ignoriert, weil wir sie nicht gezielt suchen.
  //
  // Vorteile gegenüber "alle plausiblen Versmarker finden":
  //   - "[1]"-Fußnoten stören nicht (auch nicht "geboren.[2] 7 Darum")
  //   - "1:3"-Kapitelreferenzen stören nicht
  //   - Konflikt nur bei "Es gab 5 Brote", wenn gerade n+1 = 5 ist und das vor
  //     dem echten Versmarker 5 steht – seltener Edge-Case.

  // 1) Führende Whitespace überspringen
  let leadStart = 0;
  while (leadStart < text.length && /\s/.test(text[leadStart])) leadStart++;

  // 2) Startvers am (getrimmten) Anfang erkennen
  const startMatch = text
    .slice(leadStart)
    .match(/^(\d{1,3})\s+(?=[A-Za-zÄÖÜäöüß"„'(\[\u2018\u201C»])/);
  if (!startMatch) return text; // kein Verseinstieg → unverändert zurück

  const startNum = parseInt(startMatch[1], 10);
  if (startNum < 1 || startNum > MAX_VERSE_NUM) return text;

  // 3) Iterativ n+1 suchen
  let result = `${startNum} `;
  let expected = startNum + 1;
  let pos = leadStart + startMatch[0].length;

  while (pos < text.length && expected <= MAX_VERSE_NUM) {
    const needle = String(expected);
    const found = findVerseMarker(text, needle, pos);

    if (found === -1) {
      // expected nicht gefunden → Rest unverändert anhängen, fertig
      result += text.slice(pos);
      break;
    }

    // Whitespace direkt vor dem Marker (egal ob Space/Tab/Newline) wegtrimmen
    let endOfPrev = found - 1;
    while (endOfPrev >= pos && /\s/.test(text[endOfPrev])) endOfPrev--;

    result += text.slice(pos, endOfPrev + 1);
    result += `\n${needle} `;

    pos = found + needle.length;
    // Whitespace direkt nach der Versnummer überspringen
    while (pos < text.length && /\s/.test(text[pos])) pos++;
    expected++;
  }

  return result;
}

/**
 * Sucht das nächste Vorkommen von `needle` in `text` ab `start`, das als
 * Versmarker plausibel ist. Gibt -1 zurück, wenn keines gefunden.
 */
function findVerseMarker(text, needle, start) {
  let searchFrom = start;
  while (searchFrom < text.length) {
    const idx = text.indexOf(needle, searchFrom);
    if (idx === -1) return -1;

    const charBefore = idx > 0 ? text[idx - 1] : null;
    const charAfter = text[idx + needle.length] ?? null;

    // (a) Nicht Teil einer größeren Zahl
    if (charBefore !== null && /\d/.test(charBefore)) {
      searchFrom = idx + needle.length;
      continue;
    }
    if (charAfter !== null && /\d/.test(charAfter)) {
      // z. B. expected=2, aber Text hat "25" → 2 ist Anfang von 25, kein Marker
      searchFrom = idx + 1;
      continue;
    }

    // (b) Davor und danach muss Whitespace stehen
    if (charBefore === null || !/\s/.test(charBefore)) {
      // z. B. "[1]" – "[" davor, kein Whitespace
      searchFrom = idx + 1;
      continue;
    }
    if (charAfter === null || !/\s/.test(charAfter)) {
      // z. B. "1:3" – ":" danach, kein Whitespace
      searchFrom = idx + 1;
      continue;
    }

    // (c) Zeichen vor dem Whitespace muss Nicht-Wortzeichen sein
    //     (Satzzeichen, Klammer, Gedankenstrich, Newline oder String-Anfang).
    //     Damit fällt "Es gab 5 Brote" raus (vor " 5 " steht "b").
    let j = idx - 1;
    while (j >= 0 && (text[j] === " " || text[j] === "\t")) j--;
    const preceding = j >= 0 ? text[j] : null;
    if (preceding !== null && /[A-Za-zÄÖÜäöüß0-9]/.test(preceding)) {
      searchFrom = idx + 1;
      continue;
    }

    // (d) Nach dem Whitespace muss ein Buchstabe oder öffnendes
    //     Anführungs-/Klammer-Zeichen kommen.
    const after = text.slice(idx + needle.length);
    if (
      !/^\s+[A-Za-zÄÖÜäöüß"„'(\[\u2018\u201C\u201E\u00BB\u00AB–—-]/.test(after)
    ) {
      searchFrom = idx + 1;
      continue;
    }

    return idx;
  }
  return -1;
}

/**
 * Kurze Zusammenfassung über den formatierten Text.
 */
export function summarizeFormatted(formattedText) {
  if (!formattedText.trim()) return { lines: 0, verses: 0 };
  const lines = formattedText.split(/\r?\n/).filter((l) => l.trim());
  const verseNumbers = new Set();
  let currentVerse = "0";
  for (const line of lines) {
    const m = line.match(/^\s*(\d+)\s+(.*)/);
    if (m) currentVerse = m[1];
    verseNumbers.add(currentVerse);
  }
  return { lines: lines.length, verses: verseNumbers.size };
}

/**
 * Zerlegt den formatierten Text in {verse, part, text}-Paare für die Live-Vorschau.
 */
export function parseForPreview(formattedText) {
  const lines = formattedText.split(/\r?\n/).filter((l) => l.trim());
  let currentVerse = "0";
  let subIdx = 0;
  return lines.map((line) => {
    const m = line.match(/^\s*(\d+)\s+(.*)/);
    let body;
    if (m) {
      currentVerse = m[1];
      subIdx = 0;
      body = m[2];
    } else {
      body = line.trim();
      subIdx += 1;
    }
    return {
      verse: currentVerse,
      part: String.fromCharCode("a".charCodeAt(0) + (subIdx % 26)),
      isContinuation: !m,
      text: body,
    };
  });
}
