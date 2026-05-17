// Quick sanity tests für Formatter und Notiz-Generierung.
// Run: node test_logic.mjs

import { autoFormatVerses, summarizeFormatted } from "./js/formatter.js";
import {
  processLines,
  buildNotes,
  replaceLastLetterWithUnderscore,
  keepFirstLetterOnly,
} from "./js/gen_notes.js";

let pass = 0;
let fail = 0;

function eq(label, got, want) {
  const same =
    typeof got === "object"
      ? JSON.stringify(got) === JSON.stringify(want)
      : got === want;
  if (same) {
    pass++;
    console.log(`✓ ${label}`);
  } else {
    fail++;
    console.log(`✗ ${label}`);
    console.log(`    got:  ${JSON.stringify(got)}`);
    console.log(`    want: ${JSON.stringify(want)}`);
  }
}

// --- Tests für gen_notes-Hilfsfunktionen ---
eq(
  "keep_first_letter_only: deutsches Beispiel",
  keepFirstLetterOnly(
    "Meine Brüder, verbindet den Glauben an unseren Herrn Jesus Christus,"
  ),
  "M B, v d G a u H J C,"
);

eq(
  "replace_last_letter_with_underscore: deutsches Beispiel",
  replaceLastLetterWithUnderscore(
    "Meine Brüder, verbindet den Glauben an unseren Herrn Jesus Christus,"
  ),
  "Mein_ Brüde_, verbinde_ de_ Glaube_ a_ unsere_ Herr_ Jesu_ Christu_,"
);

// --- processLines ---
const lines = processLines(
  `1 Meine Brüder, verbindet den Glauben an unseren Herrn Jesus Christus,
[den Herrn] der Herrlichkeit, nicht mit Ansehen der Person!
2 Denn wenn in eure Versammlung ein Mann käme
mit goldenen Ringen und in prächtiger Kleidung,`
);

eq("processLines: count", lines.length, 4);
eq("processLines: vers 1a verse_number", lines[0].verse_number, "1");
eq("processLines: vers 1a verse_part", lines[0].verse_part, "a");
eq(
  "processLines: vers 1a first_letters",
  lines[0].first_letters,
  "M B, v d G a u H J C,"
);
eq(
  "processLines: vers 1a answer (mit Versnummer)",
  lines[0].answer,
  "1 Meine Brüder, verbindet den Glauben an unseren Herrn Jesus Christus,"
);
eq("processLines: vers 1b verse_number", lines[1].verse_number, "1");
eq("processLines: vers 1b verse_part", lines[1].verse_part, "b");
eq(
  "processLines: vers 1b answer (ohne Versnummer)",
  lines[1].answer,
  "[den Herrn] der Herrlichkeit, nicht mit Ansehen der Person!"
);
eq("processLines: vers 2a verse_number", lines[2].verse_number, "2");
eq("processLines: vers 2a verse_part", lines[2].verse_part, "a");
eq("processLines: vers 2b verse_number", lines[3].verse_number, "2");
eq("processLines: vers 2b verse_part", lines[3].verse_part, "b");

// --- buildNotes ---
const notes = buildNotes({
  title: "Jakobus 2",
  recite: 2,
  text: `1 Meine Brüder, verbindet den Glauben an unseren Herrn Jesus Christus,
[den Herrn] der Herrlichkeit, nicht mit Ansehen der Person!
2 Denn wenn in eure Versammlung ein Mann käme
mit goldenen Ringen und in prächtiger Kleidung,`,
  table: false,
  idEpochMs: 1775233432329,
});

eq("buildNotes: count", notes.length, 4);
eq("buildNotes: alle Felder vorhanden", Object.keys(notes[0]).sort(), [
  "answer",
  "back",
  "first_letters",
  "front",
  "id",
  "last_letters",
  "table",
  "title",
  "verse_number",
  "verse_part",
]);
eq("buildNotes: id-Format", notes[0].id, "1775233432329-0");
eq("buildNotes: id-Format 4te", notes[3].id, "1775233432329-3");
eq("buildNotes: title", notes[0].title, "Jakobus 2");
eq("buildNotes: 1a front ist [Beginning]", notes[0].front, "[Beginning]");
eq("buildNotes: 1b front enthält 1a", notes[1].front.includes("1 Meine Brüder"), true);
eq("buildNotes: 1a back enthält 1a und 1b", notes[0].back.includes("Meine Brüder") && notes[0].back.includes("[den Herrn]"), true);
eq("buildNotes: table leer wenn ausgeschaltet", notes[0].table, "");

// --- Formatter ---

eq(
  "format: bereits zeilenweise → unverändert",
  autoFormatVerses(`1 Foo bar.
2 Baz qux.`),
  `1 Foo bar.\n2 Baz qux.`
);

eq(
  "format: alle in einer Zeile → in mehrere splitten",
  autoFormatVerses(`1 Foo bar. 2 Baz qux. 3 Quux quux.`),
  `1 Foo bar.\n2 Baz qux.\n3 Quux quux.`
);

eq(
  "format: Hochstellungen → splitten",
  autoFormatVerses(`¹ Foo bar. ² Baz qux.`),
  `1 Foo bar.\n2 Baz qux.`
);

eq(
  "format: Hochstellung mitten im Wort → eigener Marker",
  autoFormatVerses(`Vers eins.²Baz qux.`),
  `Vers eins.\n2 Baz qux.`
);

eq(
  "format: Zahl mitten im Text ohne Satzzeichen → NICHT splitten",
  autoFormatVerses(`Es gab 5 Brote und 2 Fische.`),
  `Es gab 5 Brote und 2 Fische.`
);

eq(
  "format: Kapitel:Vers Referenz → NICHT splitten",
  autoFormatVerses(`Wie in Galater 1:3 steht: Gnade sei mit euch.`),
  `Wie in Galater 1:3 steht: Gnade sei mit euch.`
);

eq(
  "format: idempotent",
  autoFormatVerses(autoFormatVerses(`1 Foo bar. 2 Baz qux.`)),
  `1 Foo bar.\n2 Baz qux.`
);

eq(
  "format: NBSP → space",
  autoFormatVerses(`1\u00A0Im Anfang.`),
  `1 Im Anfang.`
);

eq(
  "format: leere Eingabe",
  autoFormatVerses(``),
  ``
);

// summarizeFormatted
const sum = summarizeFormatted(`1 Foo bar.
zweite Zeile.
2 Baz.`);
eq("summarize: lines", sum.lines, 3);
eq("summarize: verses", sum.verses, 2);

// --- Tests speziell für die n+1-Heuristik ---

eq(
  "n+1: Fußnoten [1] mitten im Text werden ignoriert",
  autoFormatVerses(`1 Foo[1] bar. 2 Baz[2] qux.`),
  `1 Foo[1] bar.\n2 Baz[2] qux.`
);

eq(
  "n+1: »« vor Versmarker zählt als Satzende",
  autoFormatVerses(`1 Foo bar.« 2 Baz qux.`),
  `1 Foo bar.«\n2 Baz qux.`
);

eq(
  "n+1: Gedankenstrich vor Versmarker zählt als Übergang",
  autoFormatVerses(`1 Foo bar. – 2 Baz qux.`),
  `1 Foo bar. –\n2 Baz qux.`
);

eq(
  "n+1: 5 Brote ohne Satzzeichen davor wird NICHT als Versmarker erkannt",
  autoFormatVerses(`1 Es gab 5 Brote. 2 Sie aßen.`),
  `1 Es gab 5 Brote.\n2 Sie aßen.`
);

eq(
  "n+1: Galater 1:3 (Kapitel-Vers-Referenz) bleibt unangetastet",
  autoFormatVerses(`1 Wie in Galater 1:3 steht. 2 Lobet den Herrn.`),
  `1 Wie in Galater 1:3 steht.\n2 Lobet den Herrn.`
);

eq(
  "n+1: 2-stellige Versnummern",
  autoFormatVerses(`9 Letzter einstelliger. 10 Zehnter. 11 Elfter.`),
  `9 Letzter einstelliger.\n10 Zehnter.\n11 Elfter.`
);

eq(
  "n+1: nicht-fortlaufende Zahlen werden nicht zerschnitten",
  autoFormatVerses(`1 Foo bar. 12 Baz qux.`),
  `1 Foo bar. 12 Baz qux.`
);

// --- Nikodemus-Beispiel aus User-Anforderung ---
const nikodemusInput = `1 Einer der führenden Männer des jüdischen Volkes, ein Pharisäer namens Nikodemus, 2 suchte Jesus einmal bei Nacht auf. »Rabbi«, sagte er zu ihm, »wir wissen, dass du ein Lehrer bist, den Gott gesandt hat. Denn niemand kann solche Wunder tun wie du, wenn Gott nicht mit ihm ist.« 3 Jesus entgegnete: »Ich sage dir: Wenn jemand nicht von neuem[1] geboren wird, kann er das Reich Gottes nicht sehen.« – 4 »Wie kann ein Mensch, wenn er alt geworden ist, noch einmal geboren werden?«, wandte Nikodemus ein. »Er kann doch nicht in den Leib seiner Mutter zurückkehren und ein zweites Mal auf die Welt kommen!« 5 Jesus erwiderte: »Ich sage dir eins: Wenn jemand nicht aus Wasser und Geist geboren wird, kann er nicht ins Reich Gottes hineinkommen. 6 Natürliches Leben bringt natürliches Leben hervor; geistliches Leben wird aus dem Geist geboren.[2] 7 Darum sei nicht erstaunt, wenn ich dir sage: Ihr müsst von neuem geboren werden. 8 Der Wind weht, wo er will. Du hörst zwar sein Rauschen[3], aber woher er kommt und wohin er geht, weißt du nicht. So ist es bei jedem, der aus dem Geist geboren ist.« 9 »Aber wie kann das geschehen?«, fragte Nikodemus.`;

const nikodemus = autoFormatVerses(nikodemusInput);
const nikodemusLines = nikodemus.split("\n");

eq("Nikodemus: in 9 Zeilen gesplittet", nikodemusLines.length, 9);
eq(
  "Nikodemus: Vers 1 beginnt korrekt",
  nikodemusLines[0].startsWith("1 Einer der führenden"),
  true
);
eq(
  "Nikodemus: Vers 1 endet mit Nikodemus,",
  nikodemusLines[0].endsWith("Nikodemus,"),
  true
);
eq(
  "Nikodemus: Vers 2 beginnt mit 'suchte'",
  nikodemusLines[1].startsWith("2 suchte Jesus"),
  true
);
eq(
  "Nikodemus: Vers 3 enthält Fußnote [1] inline",
  nikodemusLines[2].includes("neuem[1] geboren"),
  true
);
eq(
  "Nikodemus: Vers 4 beginnt mit »Wie",
  nikodemusLines[3].startsWith("4 »Wie kann"),
  true
);
eq(
  "Nikodemus: Vers 6 enthält Fußnote [2] am Ende",
  nikodemusLines[5].includes("geboren.[2]"),
  true
);
eq(
  "Nikodemus: Vers 7 beginnt mit 'Darum'",
  nikodemusLines[6].startsWith("7 Darum sei nicht"),
  true
);
eq(
  "Nikodemus: Vers 8 enthält Fußnote [3] inline",
  nikodemusLines[7].includes("Rauschen[3]"),
  true
);
eq(
  "Nikodemus: Vers 9 beginnt mit »Aber",
  nikodemusLines[8].startsWith("9 »Aber wie"),
  true
);

console.log(`\n${pass} passed, ${fail} failed.`);
process.exit(fail > 0 ? 1 : 0);
