// Integrationstest – erzeugt ein echtes .apkg in Node und prüft, ob die
// Struktur (Schema, Modell, Notizen, Karten) mit dem Beispiel-Apkg übereinstimmt.
//
// Wir müssen `window.initSqlJs` und `window.JSZip` simulieren, weil apkg.js
// die Browser-Globals erwartet.

import { readFile, writeFile } from "node:fs/promises";
import initSqlJs from "sql.js";
import JSZip from "jszip";

// Browser-Globals simulieren
globalThis.window = globalThis;
globalThis.window.initSqlJs = initSqlJs;
globalThis.window.JSZip = JSZip;
// crypto ist in Node 18+ als globalThis.crypto verfügbar

// Wenn locateFile aufgerufen wird, geht das gegen CDN – wir patchen das,
// damit es lokal aus node_modules/sql.js/dist liest.
const origInit = globalThis.window.initSqlJs;
globalThis.window.initSqlJs = (opts = {}) => {
  return origInit({
    ...opts,
    locateFile: (file) =>
      new URL(`./node_modules/sql.js/dist/${file}`, import.meta.url).pathname,
  });
};

const { buildApkg } = await import("./js/apkg.js");

const EXAMPLE_TEXT = `1 Meine Brüder, verbindet den Glauben an unseren Herrn Jesus Christus,
[den Herrn] der Herrlichkeit, nicht mit Ansehen der Person!
2 Denn wenn in eure Versammlung ein Mann käme
mit goldenen Ringen und in prächtiger Kleidung,
es käme aber auch ein Armer in unsauberer Kleidung,
3 und ihr sähet auf den, der die prächtige Kleidung trägt,
und sprächet: Setze du dich bequem hierher!
und sprächet zu dem Armen: Stehe du dort, oder setze dich hier unter meinen Fußschemel!
4 habt ihr nicht unter euch selbst einen Unterschied gemacht
und seid Richter mit bösen Gedanken geworden?
5 Höret, meine geliebten Brüder!`;

console.log("→ Building APKG…");
const { blob, noteCount, cardCount } = await buildApkg({
  title: "Jakobus 2",
  deckName: "Jakobus 2",
  text: EXAMPLE_TEXT,
  recite: 2,
  table: true,
});

const buf = Buffer.from(await blob.arrayBuffer());
await writeFile("./out-test.apkg", buf);
console.log(`✓ APKG built: ${buf.length} bytes, ${noteCount} notes, ${cardCount} cards`);

// Jetzt aus der Datei wieder auspacken und gegen das Schema prüfen
const zip = await JSZip.loadAsync(buf);
const filenames = Object.keys(zip.files).sort();
console.log(`\n→ APKG enthält: ${filenames.join(", ")}`);

// Pflichtdateien für Legacy-Format
const expected = ["collection.anki2", "media"];
for (const e of expected) {
  if (!filenames.includes(e)) throw new Error(`fehlt: ${e}`);
}
console.log("✓ Pflichtdateien vorhanden");

// media muss "{}" sein
const mediaContent = await zip.file("media").async("string");
if (mediaContent !== "{}") throw new Error(`media ist nicht '{}': ${mediaContent}`);
console.log("✓ media = '{}'");

// collection.anki2 in SQLite öffnen
const dbBytes = await zip.file("collection.anki2").async("uint8array");
const SQL = await initSqlJs({
  locateFile: (file) =>
    new URL(`./node_modules/sql.js/dist/${file}`, import.meta.url).pathname,
});
const db = new SQL.Database(dbBytes);

// Schema check
function tableCount(table) {
  const res = db.exec(`SELECT COUNT(*) FROM ${table}`);
  return res[0].values[0][0];
}

console.log(`\n→ DB-Inhalt:`);
console.log(`   col rows:    ${tableCount("col")}`);
console.log(`   notes:       ${tableCount("notes")}`);
console.log(`   cards:       ${tableCount("cards")}`);
console.log(`   revlog:      ${tableCount("revlog")}`);
console.log(`   graves:      ${tableCount("graves")}`);

if (tableCount("col") !== 1) throw new Error("col muss genau 1 Zeile haben");
if (tableCount("notes") !== noteCount) throw new Error("notes-Zähler stimmt nicht");
if (tableCount("cards") !== cardCount) throw new Error("cards-Zähler stimmt nicht");
console.log("✓ Zähler stimmen");

// col-Row: ver=11
const colRow = db.exec("SELECT ver, conf, models, decks, dconf, tags FROM col")[0]
  .values[0];
const [ver, conf, models, decks, dconf, tags] = colRow;
if (ver !== 11) throw new Error(`Schema-Version ist ${ver}, erwartet 11`);
console.log("✓ Schema-Version = 11");

// models prüfen
const modelsObj = JSON.parse(models);
const modelKeys = Object.keys(modelsObj);
if (modelKeys.length !== 1)
  throw new Error(`Erwartet 1 Modell, gefunden ${modelKeys.length}`);
const model = modelsObj[modelKeys[0]];
if (model.name !== "Bible Memorizer")
  throw new Error(`Modell-Name: ${model.name}`);
console.log(`✓ Modellname: "${model.name}"`);

const fieldNames = model.flds.map((f) => f.name);
const expectedFields = [
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
if (JSON.stringify(fieldNames) !== JSON.stringify(expectedFields))
  throw new Error(`Felder weichen ab: ${JSON.stringify(fieldNames)}`);
console.log(`✓ Felder (exakt + Reihenfolge): ${fieldNames.join(", ")}`);

const tmplNames = model.tmpls.map((t) => t.name);
if (JSON.stringify(tmplNames) !== JSON.stringify(["Card 1", "Card 2", "Card 3", "Card 4"]))
  throw new Error(`Templates weichen ab: ${JSON.stringify(tmplNames)}`);
console.log(`✓ Templates (exakt + Reihenfolge): ${tmplNames.join(", ")}`);

// Templates exakt gegen Plugin-Quelltext prüfen
const card1Front = '{{#last_letters}}\n<div id="card">\n<div>{{title}}</div>\n<div class="passage">{{verse_number}}{{verse_part}}</div>\n<br>\n<div class="front">{{front}}\n{{last_letters}}</div>\n</div>\n{{/last_letters}}';
if (model.tmpls[0].qfmt !== card1Front)
  throw new Error("Card 1 qfmt weicht vom Plugin ab");
console.log("✓ Card 1 qfmt exakt wie im Plugin");

// CSS-Snippet prüfen
if (!model.css.includes(".highlight") || !model.css.includes("background-color: yellow"))
  throw new Error("CSS unvollständig");
if (!model.css.includes("font-family: arial"))
  throw new Error("CSS unvollständig");
console.log("✓ CSS aus _styling übernommen");

// sortf = Index von "id"
if (model.sortf !== 9) throw new Error(`sortf ist ${model.sortf}, erwartet 9`);
console.log("✓ sortf zeigt auf 'id' (Index 9)");

// Decks prüfen
const decksObj = JSON.parse(decks);
const customDeck = Object.values(decksObj).find((d) => d.name === "Jakobus 2");
if (!customDeck) throw new Error("Custom-Deck 'Jakobus 2' fehlt");
console.log(`✓ Custom-Deck "Jakobus 2" angelegt (id=${customDeck.id})`);

// Notizen inspizieren
const noteRows = db.exec(
  "SELECT id, guid, mid, flds, sfld, csum, tags FROM notes ORDER BY id"
)[0].values;

const firstFlds = noteRows[0][3].split("\x1f");
if (firstFlds.length !== 10)
  throw new Error(`flds hat ${firstFlds.length} Werte, erwartet 10`);
console.log(`✓ flds-Separator korrekt (10 Felder pro Notiz)`);

// Erste Notiz inhaltlich prüfen
const firstNote = Object.fromEntries(
  expectedFields.map((name, i) => [name, firstFlds[i]])
);
console.log(`\n→ Erste Notiz:`);
console.log(`   verse_number: ${firstNote.verse_number}`);
console.log(`   verse_part:   ${firstNote.verse_part}`);
console.log(`   answer:       ${firstNote.answer.slice(0, 60)}…`);
console.log(`   first_letters:${firstNote.first_letters.slice(0, 60)}`);
console.log(`   last_letters: ${firstNote.last_letters.slice(0, 60)}`);
console.log(`   title:        ${firstNote.title}`);
console.log(`   id:           ${firstNote.id}`);

if (firstNote.verse_number !== "1")
  throw new Error("Erster Vers muss Nummer 1 haben");
if (firstNote.verse_part !== "a")
  throw new Error("Erster Vers-Part muss 'a' sein");
if (firstNote.title !== "Jakobus 2")
  throw new Error("title falsch");
if (firstNote.first_letters !== "M B, v d G a u H J C,")
  throw new Error(`first_letters falsch: "${firstNote.first_letters}"`);
console.log("✓ Erste Notiz inhaltlich exakt wie erwartet");

// csum-Sanity (muss eine 32-bit unsigned-Zahl < 2^32 sein)
for (const row of noteRows) {
  const csum = row[5];
  if (typeof csum !== "number" || csum < 0 || csum > 0xffffffff)
    throw new Error(`csum out of range: ${csum}`);
}
console.log("✓ csum für alle Notizen plausibel");

// Karten prüfen: Anzahl ord-Werte stimmt mit Conditionals überein
const cardOrds = db.exec(
  "SELECT nid, ord FROM cards ORDER BY nid, ord"
)[0].values;
const ordsByNote = new Map();
for (const [nid, ord] of cardOrds) {
  if (!ordsByNote.has(nid)) ordsByNote.set(nid, []);
  ordsByNote.get(nid).push(ord);
}

// Bei recite=2, table=true, 5 Versen → table-Feld ist befüllt für alle Notizen
// → jede Notiz sollte ord 0, 1, 2, 3 haben (last_letters ist auch immer befüllt)
let allHave4 = true;
for (const ords of ordsByNote.values()) {
  if (JSON.stringify(ords) !== "[0,1,2,3]") {
    allHave4 = false;
    console.log(`   Notiz ohne 4 Karten: ords=${JSON.stringify(ords)}`);
  }
}
if (!allHave4) throw new Error("Nicht alle Notizen haben 4 Karten");
console.log(`✓ Alle ${ordsByNote.size} Notizen erzeugen 4 Karten`);

// Mit table=false soll ord=2 fehlen
console.log(`\n→ Build mit table=false:`);
const r2 = await buildApkg({
  title: "TestNoTable",
  deckName: "TestNoTable",
  text: EXAMPLE_TEXT,
  recite: 2,
  table: false,
});
const zip2 = await JSZip.loadAsync(Buffer.from(await r2.blob.arrayBuffer()));
const db2 = new SQL.Database(
  await zip2.file("collection.anki2").async("uint8array")
);
const ords2 = db2.exec("SELECT DISTINCT ord FROM cards ORDER BY ord")[0]
  .values.map((r) => r[0]);
if (ords2.includes(2))
  throw new Error("ord=2 darf bei table=false NICHT vorkommen");
console.log(`✓ ord-Werte bei table=false: ${ords2.join(", ")} (keine 2)`);

// Sehr kurzer Text (1 Vers) → ord=2 nicht, ord=0 ja
console.log(`\n→ Build mit nur 1 Vers (table darf nicht erzeugt werden):`);
const r3 = await buildApkg({
  title: "Single",
  deckName: "Single",
  text: "1 Im Anfang war das Wort.",
  recite: 2,
  table: true,
});
const zip3 = await JSZip.loadAsync(Buffer.from(await r3.blob.arrayBuffer()));
const db3 = new SQL.Database(
  await zip3.file("collection.anki2").async("uint8array")
);
const ords3 = db3.exec("SELECT DISTINCT ord FROM cards ORDER BY ord")[0]
  .values.map((r) => r[0]);
if (ords3.includes(2))
  throw new Error("ord=2 darf bei nur 1 Vers NICHT vorkommen (kein table)");
console.log(`✓ ord-Werte bei 1 Vers: ${ords3.join(", ")} (kein table)`);

console.log("\n✅ ALLE INTEGRATIONS-CHECKS BESTANDEN");
