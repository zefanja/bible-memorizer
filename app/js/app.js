// App – Hauptlogik
// ---------------
// Bindet die UI-Elemente an die fachliche Logik (Formatter, Notiz-Generator,
// APKG-Builder). Bewusst Vanilla-JS, kein Framework, keine Build-Schritte.

import { TRANSLATIONS, detectInitialLang, saveLang } from "./i18n.js";
import {
  autoFormatVerses,
  summarizeFormatted,
  parseForPreview,
} from "./formatter.js";
import { buildNotes } from "./gen_notes.js";
import { CARD_CSS, TEMPLATES } from "./model.js";
import { buildApkg, preloadSqlJs } from "./apkg.js";

// ---------- State ----------

const state = {
  lang: detectInitialLang(),
  title: "",
  text: "",
  recite: 2,
  table: false,
  building: false,
};

// ---------- DOM-Refs ----------

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const els = {
  langSelect: $("#lang-select"),
  titleInput: $("#title-input"),
  textArea: $("#text-area"),
  formatBtn: $("#format-btn"),
  exampleBtn: $("#example-btn"),
  clearBtn: $("#clear-btn"),
  previewBody: $("#preview-body"),
  previewMeta: $("#preview-meta"),
  reciteInput: $("#recite-input"),
  tableCheckbox: $("#table-checkbox"),
  downloadBtn: $("#download-btn"),
  downloadStatus: $("#download-status"),
  cardsPreview: $("#cards-preview"),
};

// ---------- i18n ----------

function t(key, vars = {}) {
  const dict = TRANSLATIONS[state.lang] || TRANSLATIONS.en;
  let str = dict[key] ?? key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replaceAll(`{${k}}`, String(v));
  }
  return str;
}

function applyTranslations() {
  document.documentElement.lang = state.lang;
  $$("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
  $$("[data-i18n-placeholder]").forEach((el) => {
    el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder));
  });
  $$("[data-i18n-aria-label]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel));
  });
  document.title = t("header.title");
  updatePreview();
  updateCardsPreview();
}

// ---------- Beispieltext ----------

const EXAMPLE_TEXT = `1 Meine Brüder, verbindet den Glauben an unseren Herrn Jesus Christus,
[den Herrn] der Herrlichkeit, nicht mit Ansehen der Person!
2 Denn wenn in eure Versammlung ein Mann käme
mit goldenen Ringen und in prächtiger Kleidung,
es käme aber auch ein Armer in unsauberer Kleidung,
3 und ihr sähet auf den, der die prächtige Kleidung trägt,
und sprächet: Setze du dich bequem hierher!
und sprächet zu dem Armen: Stehe du dort, oder setze dich hier unter meinen Fußschemel! —
4 habt ihr nicht unter euch selbst einen Unterschied gemacht
und seid Richter mit bösen Gedanken geworden?`;

// ---------- Live-Vorschau der erkannten Verse ----------

function updatePreview() {
  const rows = parseForPreview(state.text);
  els.previewBody.innerHTML = "";

  if (rows.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="2" class="preview-empty">${escapeHtml(
      t("step.preview.empty")
    )}</td>`;
    els.previewBody.appendChild(row);
    els.previewMeta.textContent = "";
    return;
  }

  for (const r of rows) {
    const tr = document.createElement("tr");
    if (r.isContinuation) tr.classList.add("preview-continuation");
    tr.innerHTML = `
      <td class="preview-vn">${escapeHtml(r.verse)}<span class="preview-part">${escapeHtml(
        r.part
      )}</span></td>
      <td class="preview-text">${escapeHtml(r.text)}</td>
    `;
    els.previewBody.appendChild(tr);
  }

  const sum = summarizeFormatted(state.text);
  els.previewMeta.textContent = t("step.preview.versesFound", {
    n: sum.lines,
    v: sum.verses,
  });
}

// ---------- Kartenvorschau ----------

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Mini-Mustache-Renderer für die Template-Vorschau.
// Unterstützt {{field}} und {{#field}}…{{/field}} sowie {{FrontSide}}.
function renderTemplate(tmpl, fields, frontRendered) {
  // Conditional blocks zuerst
  let out = tmpl.replace(
    /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_, name, body) => {
      const val = fields[name];
      return val && String(val).trim() ? body : "";
    }
  );
  // {{FrontSide}}
  out = out.replaceAll("{{FrontSide}}", frontRendered ?? "");
  // {{field}}
  out = out.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    const val = fields[name];
    return val == null ? "" : String(val);
  });
  return out;
}

function updateCardsPreview() {
  if (!state.text.trim() || !state.title.trim()) {
    els.cardsPreview.innerHTML = `<div class="cards-preview-empty">${escapeHtml(
      t("step.preview.empty")
    )}</div>`;
    return;
  }

  // Wir nehmen die ERSTE Notiz für die Vorschau.
  const notes = buildNotes({
    title: state.title || "—",
    recite: state.recite,
    text: state.text,
    table: state.table,
    idEpochMs: Date.now(),
  });
  if (notes.length === 0) {
    els.cardsPreview.innerHTML = `<div class="cards-preview-empty">${escapeHtml(
      t("step.preview.empty")
    )}</div>`;
    return;
  }
  const note = notes[0];

  const cardLabels = [
    t("cards.preview.card1"),
    t("cards.preview.card2"),
    t("cards.preview.card3"),
    t("cards.preview.card4"),
  ];

  // Welche Karten werden tatsächlich erzeugt?
  const isShown = [
    !!(note.last_letters && note.last_letters.trim()), // Card 1
    true, // Card 2
    !!(note.table && note.table.trim()), // Card 3
    true, // Card 4
  ];

  els.cardsPreview.innerHTML = "";

  TEMPLATES.forEach((tmpl, idx) => {
    // Card 3 ist die Übersichtstabelle – die wird nicht in der Vorschau gezeigt,
    // weil sie für alle Verse gleich aussieht und nur die markierte Zeile wechselt.
    if (idx === 2) return;

    const wrap = document.createElement("article");
    wrap.className = "card-preview";

    const head = document.createElement("h3");
    head.className = "card-preview-title";
    head.textContent = cardLabels[idx];
    wrap.appendChild(head);

    if (!isShown[idx]) {
      const skipped = document.createElement("p");
      skipped.className = "card-preview-skipped";
      skipped.textContent = t("cards.preview.skipped");
      wrap.appendChild(skipped);
      els.cardsPreview.appendChild(wrap);
      return;
    }

    const sides = document.createElement("div");
    sides.className = "card-sides";

    const frontHtml = renderTemplate(tmpl.qfmt, note, "");
    const backHtml = renderTemplate(tmpl.afmt, note, frontHtml);

    sides.appendChild(makeSide(t("cards.preview.front"), frontHtml));
    sides.appendChild(makeSide(t("cards.preview.back"), backHtml));
    wrap.appendChild(sides);

    els.cardsPreview.appendChild(wrap);
  });
}

function makeSide(label, innerHtml) {
  const side = document.createElement("div");
  side.className = "card-side";
  const lab = document.createElement("div");
  lab.className = "card-side-label";
  lab.textContent = label;
  side.appendChild(lab);
  const frame = document.createElement("div");
  frame.className = "card-frame";
  // Inneres CSS wird per Shadow DOM isoliert, damit das card-CSS aus dem
  // Plugin nicht den Rest unserer Seite beeinflusst.
  const shadowHost = document.createElement("div");
  shadowHost.className = "card-shadow-host";
  const shadow = shadowHost.attachShadow({ mode: "open" });
  shadow.innerHTML = `<style>${CARD_CSS}</style><div class="card">${innerHtml}</div>`;
  frame.appendChild(shadowHost);
  side.appendChild(frame);
  return side;
}

// ---------- Download ----------

async function handleDownload() {
  if (state.building) return;

  if (!state.title.trim()) {
    setDownloadStatus(t("download.errors.noTitle"), "error");
    els.titleInput.focus();
    return;
  }
  if (!state.text.trim()) {
    setDownloadStatus(t("download.errors.noText"), "error");
    els.textArea.focus();
    return;
  }

  state.building = true;
  els.downloadBtn.disabled = true;
  setDownloadStatus(t("download.building"), "info");

  try {
    const { blob, noteCount, cardCount } = await buildApkg({
      title: state.title.trim(),
      deckName: state.title.trim(),
      text: state.text,
      recite: state.recite,
      table: state.table,
    });

    const filename = `${safeFilename(state.title.trim())}.apkg`;
    triggerDownload(blob, filename);

    setDownloadStatus(
      `${t("download.ready")} · ${t("download.summary", {
        n: noteCount,
        c: cardCount,
      })}`,
      "success"
    );
  } catch (err) {
    console.error(err);
    setDownloadStatus(t("download.error", { msg: err.message || err }), "error");
  } finally {
    state.building = false;
    els.downloadBtn.disabled = false;
  }
}

function setDownloadStatus(message, kind) {
  els.downloadStatus.textContent = message || "";
  els.downloadStatus.dataset.kind = kind || "";
}

function safeFilename(name) {
  return (
    name
      .replace(/[^\p{L}\p{N}\s\-_.]/gu, "")
      .replace(/\s+/g, "_")
      .slice(0, 80) || "deck"
  );
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- Event-Bindings ----------

function init() {
  // Sprache initial
  els.langSelect.value = state.lang;
  applyTranslations();

  els.langSelect.addEventListener("change", (e) => {
    state.lang = e.target.value;
    saveLang(state.lang);
    applyTranslations();
  });

  els.titleInput.addEventListener("input", (e) => {
    state.title = e.target.value;
    updateCardsPreview();
  });

  // Textarea: nicht auto-formatieren bei jeder Eingabe,
  // sondern beim Paste-Event (für instant feedback) und auf Klick "format".
  els.textArea.addEventListener("input", (e) => {
    state.text = e.target.value;
    updatePreview();
    updateCardsPreview();
  });

  els.textArea.addEventListener("paste", (e) => {
    // Wir lassen den Paste passieren und formatieren NACH dem Paste,
    // sodass die Cursorposition kein Problem ist.
    setTimeout(() => {
      const formatted = autoFormatVerses(els.textArea.value);
      if (formatted !== els.textArea.value) {
        els.textArea.value = formatted;
        state.text = formatted;
        updatePreview();
        updateCardsPreview();
      }
    }, 0);
  });

  els.formatBtn.addEventListener("click", () => {
    const formatted = autoFormatVerses(els.textArea.value);
    els.textArea.value = formatted;
    state.text = formatted;
    updatePreview();
    updateCardsPreview();
    els.textArea.focus();
  });

  els.exampleBtn.addEventListener("click", () => {
    if (els.textArea.value.trim() && !confirm(t("step.text.actions.example") + "?")) {
      return;
    }
    els.textArea.value = EXAMPLE_TEXT;
    state.text = EXAMPLE_TEXT;
    if (!state.title.trim()) {
      els.titleInput.value = "Jakobus 2";
      state.title = "Jakobus 2";
    }
    updatePreview();
    updateCardsPreview();
  });

  els.clearBtn.addEventListener("click", () => {
    els.textArea.value = "";
    state.text = "";
    updatePreview();
    updateCardsPreview();
    els.textArea.focus();
  });

  els.reciteInput.addEventListener("input", (e) => {
    const v = parseInt(e.target.value, 10);
    if (!isNaN(v) && v >= 1 && v <= 10) {
      state.recite = v;
      updateCardsPreview();
    }
  });

  els.tableCheckbox.addEventListener("change", (e) => {
    state.table = e.target.checked;
    updateCardsPreview();
  });

  els.downloadBtn.addEventListener("click", handleDownload);

  // sql.js im Hintergrund preloaden, damit der erste Klick auf "Download"
  // sich nicht laggy anfühlt.
  preloadSqlJs();
}

document.addEventListener("DOMContentLoaded", init);
