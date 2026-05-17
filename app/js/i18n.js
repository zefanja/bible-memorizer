// Mini i18n: keine Bibliothek, nur ein flaches Lookup.
// Schlüssel sind in beiden Sprachen identisch.

export const TRANSLATIONS = {
  de: {
    "lang.label": "Sprache",
    "lang.de": "Deutsch",
    "lang.en": "English",

    "header.title": "Bible Memorizer",
    "header.subtitle":
      "Erstelle in 60 Sekunden ein Anki-Paket, um Bibelverse Wort für Wort zu lernen.",

    "step.title.label": "Titel",
    "step.title.placeholder": "z.B. Jakobus 2 (ELB)",
    "step.title.hint": "Erscheint oben auf jeder Karte und wird der Deckname.",

    "step.text.label": "Bibeltext",
    "step.text.placeholder":
      "Füge hier deinen Bibeltext ein.\n\nVersnummern am Anfang einer Zeile (z.B. „1 Im Anfang…“) werden automatisch erkannt.",
    "step.text.hint":
      "Tipp: einfach den Text aus deiner Lieblingsbibel-App kopieren. Der Zeilenumbruch vor jeder Versnummer wird automatisch gesetzt.",

    "step.text.actions.format": "Verse automatisch trennen",
    "step.text.actions.example": "Beispieltext einfügen",
    "step.text.actions.clear": "Leeren",

    "step.preview.title": "Erkannte Verse",
    "step.preview.empty": "Noch nichts eingegeben.",
    "step.preview.versesFound": "{n} Zeile(n) erkannt, {v} Vers(e) insgesamt.",
    "step.preview.column.verse": "Vers",
    "step.preview.column.text": "Text",

    "advanced.toggle": "Erweiterte Einstellungen",
    "advanced.recite.label": "Kontextzeilen pro Karte",
    "advanced.recite.hint":
      "Wie viele Zeilen vor und nach dem aktuellen Vers auf der Karte mitgezeigt werden.",
    "advanced.table.label": "Übersichtstabelle als zusätzliche Karte erstellen",
    "advanced.table.hint":
      "Erzeugt eine Karte mit allen Erstbuchstaben aller Verse. Nur bei mehr als 4 Versen sinnvoll.",

    "cards.preview.title": "So sehen deine Karten aus",
    "cards.preview.hint":
      "Vorschau der ersten Notiz. Jeder Notiz erzeugt bis zu vier Karten.",
    "cards.preview.card1": "Karte 1 · Wortenden ausblenden",
    "cards.preview.card2": "Karte 2 · Nur Erstbuchstaben",
    "cards.preview.card3": "Karte 3 · Übersichtstabelle",
    "cards.preview.card4": "Karte 4 · Kontext aufsagen",
    "cards.preview.front": "Vorderseite",
    "cards.preview.back": "Rückseite",
    "cards.preview.skipped":
      "Diese Karte wird für die Vorschau-Notiz nicht erstellt (Feld leer).",

    "download.button": "Anki-Paket herunterladen",
    "download.building": "Paket wird erstellt…",
    "download.ready": "Bereit zum Download",
    "download.summary": "{n} Notizen → {c} Karten",
    "download.error": "Fehler beim Erstellen: {msg}",
    "download.errors.noTitle": "Bitte zuerst einen Titel eingeben.",
    "download.errors.noText": "Bitte zuerst einen Bibeltext eingeben.",

    "howto.title": "Was du danach in Anki tust",
    "howto.step1":
      "Datei doppelklicken oder in Anki über „Datei → Importieren…“ öffnen.",
    "howto.step2":
      "Ein neuer Deck mit dem Titel deiner Wahl erscheint – sofort lernbereit.",
    "howto.step3":
      "Wenn du das Original-Addon installierst, kannst du jederzeit weitere Verse mit gleichem Format ergänzen.",
    "howto.pluginLink": "Original-Addon auf GitHub",

    "footer.builtFor": "Offizielles Web-Tool für ",
    "footer.pluginName": "zefanja/bible-memorizer",
    "footer.source": "Quellcode dieser Seite",
  },

  en: {
    "lang.label": "Language",
    "lang.de": "Deutsch",
    "lang.en": "English",

    "header.title": "Bible Memorizer",
    "header.subtitle":
      "Build an Anki deck for word-for-word Bible memorization in under a minute.",

    "step.title.label": "Title",
    "step.title.placeholder": "e.g. James 2 (ESV)",
    "step.title.hint": "Shown on top of every card. Also used as the deck name.",

    "step.text.label": "Bible text",
    "step.text.placeholder":
      "Paste your passage here.\n\nVerse numbers at the beginning of a line (like “1 In the beginning…”) are detected automatically.",
    "step.text.hint":
      "Tip: just copy from your favourite Bible app. A line break before every verse number is added automatically.",

    "step.text.actions.format": "Auto-split verses",
    "step.text.actions.example": "Insert example text",
    "step.text.actions.clear": "Clear",

    "step.preview.title": "Detected verses",
    "step.preview.empty": "Nothing entered yet.",
    "step.preview.versesFound": "{n} line(s) detected, {v} verse(s) total.",
    "step.preview.column.verse": "Verse",
    "step.preview.column.text": "Text",

    "advanced.toggle": "Advanced settings",
    "advanced.recite.label": "Context lines per card",
    "advanced.recite.hint":
      "How many lines before and after the current verse should appear on each card.",
    "advanced.table.label": "Add overview-table card",
    "advanced.table.hint":
      "Adds a card showing first letters of every verse. Only useful with more than 4 verses.",

    "cards.preview.title": "How your cards will look",
    "cards.preview.hint":
      "Preview of the first note. Each note becomes up to four cards.",
    "cards.preview.card1": "Card 1 · Mask last letters",
    "cards.preview.card2": "Card 2 · First letters only",
    "cards.preview.card3": "Card 3 · Overview table",
    "cards.preview.card4": "Card 4 · Recite context",
    "cards.preview.front": "Front",
    "cards.preview.back": "Back",
    "cards.preview.skipped":
      "This card is not created for the preview note (field empty).",

    "download.button": "Download Anki package",
    "download.building": "Building package…",
    "download.ready": "Ready to download",
    "download.summary": "{n} notes → {c} cards",
    "download.error": "Failed to build: {msg}",
    "download.errors.noTitle": "Please enter a title first.",
    "download.errors.noText": "Please enter some Bible text first.",

    "howto.title": "What to do next in Anki",
    "howto.step1":
      "Double-click the file, or open it via “File → Import…” in Anki.",
    "howto.step2":
      "A new deck named after your title appears — ready to study right away.",
    "howto.step3":
      "Install the original add-on to add more verses to the same deck later.",
    "howto.pluginLink": "Original add-on on GitHub",

    "footer.builtFor": "Official web tool for ",
    "footer.pluginName": "zefanja/bible-memorizer",
    "footer.source": "Source of this page",
  },
};

export function detectInitialLang() {
  try {
    const saved = localStorage.getItem("bm.lang");
    if (saved === "de" || saved === "en") return saved;
  } catch {}
  const nav = (navigator.language || "en").toLowerCase();
  return nav.startsWith("de") ? "de" : "en";
}

export function saveLang(lang) {
  try {
    localStorage.setItem("bm.lang", lang);
  } catch {}
}
