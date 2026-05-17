# Bible Memorizer · Web

Ein Browser-Tool zum Erstellen von Anki-Paketen für Bibelvers-Memorierung,
basierend auf dem Anki-Addon
**[zefanja/bible-memorizer](https://github.com/zefanja/bible-memorizer)**.

Nutzer:innen müssen kein Plugin installieren – einfach Titel + Bibeltext
eintippen, Vorschau prüfen, `.apkg` herunterladen und in Anki importieren.

## Features

- 100 % Client-Side, keine Server-Komponente, keine Tracking-Skripte
- Automatischer Zeilenumbruch vor jeder Versnummer beim Einfügen
  (auch bei Hochzahlen-Versnummern: ¹ ² ³ …)
- Live-Vorschau aller erkannten Verse
- Vorschau aller vier Kartentypen vor dem Download
- Deutsch- und Englisch-Oberfläche (umschaltbar, in `localStorage` gemerkt)
- Fertige `.apkg` wird im Browser erzeugt (sql.js + JSZip)
- Identisches Modell wie das Original-Plugin: 10 Felder, 4 Kartentypen,
  exakt das CSS und die Templates aus `model.py`

## Hosten

Es gibt keinen Build-Schritt. Alle Dateien einfach auf jedem statischen
Hosting ablegen:

- **GitHub Pages**: Repo erstellen, Dateien pushen, Pages aktivieren – fertig.
- **Netlify / Cloudflare Pages**: Drag-and-drop des Ordners.
- **Lokal testen**: nicht direkt per `file://` öffnen (ES-Modules brauchen
  einen HTTP-Origin). Stattdessen z. B.:

  ```bash
  python3 -m http.server 8000
  ```

  und dann `http://localhost:8000/` öffnen.

Funktioniert auch in unsicheren Kontexten (HTTP ohne TLS, LAN-IPs), weil
SHA-1 in pure JS implementiert ist und nicht von `crypto.subtle` abhängt.

## Projektstruktur

```
.
├── index.html              # Single-Page-Layout
├── css/
│   └── styles.css
├── js/
│   ├── app.js              # UI-Bindings, Live-Vorschau, Download
│   ├── formatter.js        # Auto-Versformatter (n+1-Heuristik)
│   ├── gen_notes.js        # 1:1-Port von gen_notes.py
│   ├── model.js            # Notetype-Felder, Templates, CSS aus model.py
│   ├── apkg.js             # SQLite-DB + ZIP zu .apkg
│   ├── sha1.js             # Pure-JS SHA-1 (kein crypto.subtle nötig)
│   └── i18n.js             # DE/EN-Übersetzungen
└── README.md
```

Es gibt zusätzlich zwei Test-Skripte (`test_logic.mjs`,
`test_integration.mjs`), die nur für die Entwicklung gebraucht werden.

## Technische Details

### APKG-Format

Erzeugt wird das **Legacy-APKG-Format** mit `collection.anki2` (SQLite
Schema v11) und einer `"{}"`-`media`-Datei. Dieses Format wird von **allen
Anki-Versionen** (auch der neuesten) ohne Probleme importiert und vermeidet
die zstd-Kompression der `collection.anki21b`-Variante, die im Browser
schwer zu erzeugen wäre.

### Treue zum Plugin

- Felder, Sortfeld und CSS sind 1:1 aus `model.py` übernommen.
- Templates Card 1–4 mit ihren `{{#last_letters}}`/`{{#table}}`-Conditionals
  sind exakt die Strings aus dem Quellcode.
- `gen_notes.js` ist eine direkte Übersetzung von `gen_notes.py` (Tokenisierung,
  Versnummer-Erkennung, Erstbuchstaben, last-letter-Maske, Tabellen-HTML,
  front/back-Kontext).
- Die Karten-Generierungs-Logik in `apkg.js` spiegelt die Template-Conditionals
  (`{{#last_letters}}…` und `{{#table}}…`): Karte 1 wird nicht erzeugt, wenn
  `last_letters` leer ist; Karte 3 nicht, wenn keine Tabelle gewünscht ist
  oder ≤4 Verse vorhanden sind.

### Auto-Versformatter

Der Formatter (in `js/formatter.js`) ist absichtlich konservativ und nutzt
eine **n+1-Heuristik** für normale Zahlen:

1. Die erste Versnummer wird am Textanfang erkannt (z. B. "1 Im Anfang...").
2. Der nächste Vers ist immer n+1. Es wird gezielt nach `n+1` mit
   Versmarker-Kontext gesucht: Whitespace und Nicht-Wort-Zeichen davor
   (Satzzeichen, »«, Klammer, Gedankenstrich – aber nicht Buchstabe/Zahl),
   Whitespace und Buchstabe danach.
3. Wenn `n+1` gefunden wird, wird gesplittet und mit `n+2` weitergesucht.
   Wenn nicht, ist das Ende erreicht.

Damit werden automatisch ignoriert:
- Fußnoten wie `[1]`, `[2]` (haben kein Whitespace vor der Zahl)
- "1:3" als Kapitel-Vers-Referenz (Doppelpunkt direkt nach der Zahl)
- "5 Brote" (vor der `5` steht ein Buchstabe, kein Satzzeichen)
- Zahlen, die nicht der Versnummer-Reihenfolge entsprechen

Unicode-Hochstellungen (¹²³…) werden separat behandelt und **immer** als
Versmarker interpretiert.

Idempotent: ein bereits formatierter Text bleibt unverändert.

### Tests ausführen (nur Entwicklung)

```bash
# Logik-Tests (Formatter, gen_notes – pure JS, kein Browser nötig)
node test_logic.mjs

# Integrationstest (echtes APKG erzeugen + Struktur validieren)
npm init -y && npm install sql.js jszip
node test_integration.mjs
```

## Lizenz

Das Original-Plugin
[zefanja/bible-memorizer](https://github.com/zefanja/bible-memorizer) liegt
unter dessen eigener Lizenz. Dieses Web-Tool ist inoffiziell und basiert auf
dem öffentlich zugänglichen Quellcode des Plugins.
