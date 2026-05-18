# -*- coding: utf-8 -*-
"""
Bible Memorizer – Recite Chapter

Dialog for reciting a whole chapter (all notes of one import batch, identified
by the shared timestamp prefix in the `id` field) progressively.

Per verse, one of four detail levels is shown depending on the learning state
of the associated `last_letters` card (template ord 0):

    1) Verse number only
    2) First letters only
    3) Everything except the last letter of each word
    4) Full verse

This dialog does not touch cards or change their scheduling.
"""

from __future__ import annotations

import html as _html
from typing import Optional

from aqt import mw, qt
from aqt.qt import (
    QDialog,
    QVBoxLayout,
    QHBoxLayout,
    QPushButton,
    QLabel,
    QComboBox,
    QShortcut,
    QKeySequence,
    QSizePolicy,
    QTimer,
    Qt,
)
from aqt.webview import AnkiWebView


MODEL_NAME = "Bible Memorizer"

# Detail-Stages (1..4, aufsteigend nach Sichtbarkeit)
STAGE_VERSE_NUMBER = 1
STAGE_FIRST_LETTERS = 2
STAGE_LAST_LETTERS = 3
STAGE_FULL = 4

DEFAULTS = {
    "recite_initial_visible": 2,
    "recite_reveal_step": 2,
    "recite_big_step": 5,
    "recite_mature_threshold_days": 21,
    "recite_young_threshold_days": 1,
}


# ---------------------------------------------------------------------------
# Config helpers
# ---------------------------------------------------------------------------

def _get_config() -> dict:
    return mw.addonManager.getConfig(__name__) or {}


def _cfg_int(key: str) -> int:
    cfg = _get_config()
    val = cfg.get(key, DEFAULTS.get(key))
    try:
        return int(val)
    except (TypeError, ValueError):
        return int(DEFAULTS.get(key, 0))


# ---------------------------------------------------------------------------
# Card-state → initial stage
# ---------------------------------------------------------------------------

def initial_stage_for_note(note) -> int:
    """
    Determine the initial stage of a verse based on the `last_letters` card
    (template ord 0). Falls back to last_letters if no such card exists or if
    it is suspended/buried.

    Mapping:
        new/learning/relearning   -> last_letters
        review, ivl < young_thr   -> last_letters
        review, ivl < mature_thr  -> first_letters
        review, ivl >= mature_thr -> verse number only
    """
    target_card = None
    for c in note.cards():
        if c.ord == 0:  # card 1 is the last_letters card since model 1.5
            target_card = c
            break

    if target_card is None:
        return STAGE_LAST_LETTERS

    if target_card.queue < 0:  # suspended/buried
        return STAGE_LAST_LETTERS

    # Anki card.type: 0=new, 1=learning, 2=review, 3=relearning
    if target_card.type != 2:
        return STAGE_LAST_LETTERS

    young_thr = _cfg_int("recite_young_threshold_days")
    mature_thr = _cfg_int("recite_mature_threshold_days")
    ivl = target_card.ivl  # Tage für review-Karten

    if ivl < young_thr:
        return STAGE_LAST_LETTERS
    if ivl < mature_thr:
        return STAGE_FIRST_LETTERS
    return STAGE_VERSE_NUMBER


# ---------------------------------------------------------------------------
# Batch discovery
# ---------------------------------------------------------------------------

def find_batches() -> list[tuple[str, str, list[int]]]:
    """
    Returns a list of `(ts_sec, title, sorted_nids)`, sorted by title.
    Notes are grouped by (seconds-precision timestamp prefix, title).
    """
    model = mw.col.models.by_name(MODEL_NAME)
    if not model:
        return []
    mid = model["id"]
    nids = mw.col.find_notes(f"mid:{mid}")

    batches: dict[str, dict] = {}
    for nid in nids:
        note = mw.col.get_note(nid)
        raw_id = (note["id"] or "").strip()
        if "-" not in raw_id:
            continue
        ts_part, idx_str = raw_id.rsplit("-", 1)
        try:
            idx = int(idx_str)
        except ValueError:
            continue
        # Truncate ms timestamp to 10-second buckets (±5 s) so notes from the
        # same import session share a group key even on slow machines.
        ts_sec = ts_part[:9] if len(ts_part) >= 9 else ts_part
        title = note["title"] or "(untitled)"
        batch_key = f"{ts_sec}|{title}"
        b = batches.setdefault(
            batch_key,
            {"title": title, "ts": ts_sec, "items": []},
        )
        b["items"].append((idx, nid))

    result: list[tuple[str, str, list[int]]] = []
    for data in batches.values():
        items_sorted = sorted(data["items"], key=lambda x: x[0])
        result.append(
            (data["ts"], data["title"], [nid for _, nid in items_sorted])
        )

    result.sort(key=lambda x: x[1].lower())
    return result


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------

_CSS = """
body {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 21px;
    line-height: 1.55;
    margin: 0;
    padding: 18px 22px 24px 22px;
    background: #ffffff;
    color: #1a1a1a;
}
body.nightMode {
    background: #2a2a2a;
    color: #e8e8e8;
}

.verse {
    padding: 6px 10px;
    border-radius: 6px;
    margin-bottom: 6px;
    cursor: pointer;
    transition: background-color 0.12s ease;
}
.verse:hover {
    background: rgba(0, 100, 200, 0.06);
}
body.nightMode .verse:hover {
    background: rgba(120, 170, 255, 0.10);
}
.verse.last {
    background: rgba(255, 210, 0, 0.18);
}
body.nightMode .verse.last {
    background: rgba(255, 210, 0, 0.10);
}

.verse-num {
    color: #556;
    font-weight: bold;
    font-variant-numeric: tabular-nums;
    margin-right: 8px;
    display: inline-block;
    min-width: 2.4em;
}
body.nightMode .verse-num { color: #9aa; }

.first-letters {
    letter-spacing: 1px;
    color: #444;
    font-family: "Menlo", "Consolas", monospace;
    font-size: 0.95em;
}
body.nightMode .first-letters { color: #ccc; }

.last-letters { color: #333; }
body.nightMode .last-letters { color: #e0e0e0; }

.hint {
    color: #aaa;
    font-style: italic;
}
body.nightMode .hint { color: #888; }

.pending {
    margin-top: 14px;
    padding-top: 10px;
    border-top: 1px dashed #ccc;
    color: #888;
    font-style: italic;
    font-size: 0.9em;
}
body.nightMode .pending {
    border-top-color: #555;
    color: #aaa;
}

.title-row {
    color: #666;
    font-size: 0.85em;
    margin-bottom: 12px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
}
body.nightMode .title-row { color: #999; }
"""


def _render_verse_content(note, stage: int) -> str:
    """Render verse content for the given stage. Note fields may contain HTML and are used as-is."""
    if stage == STAGE_VERSE_NUMBER:
        return '<span class="hint">…</span>'
    if stage == STAGE_FIRST_LETTERS:
        return f'<span class="first-letters">{note["first_letters"]}</span>'
    if stage == STAGE_LAST_LETTERS:
        return f'<span class="last-letters">{note["last_letters"]}</span>'
    if stage == STAGE_FULL:
        return f'<span class="full">{note["answer"]}</span>'
    return ""


def render_body(notes, stages, visible_count, title: str) -> str:
    parts: list[str] = [f"<style>{_CSS}</style>"]
    if title:
        parts.append(f'<div class="title-row">{_html.escape(title)}</div>')

    for i, (note, stage) in enumerate(zip(notes, stages)):
        if i >= visible_count:
            break
        is_last = (i == visible_count - 1)
        cls = "verse last" if is_last else "verse"
        vnum = f'{note["verse_number"]}{note["verse_part"]}'
        content = _render_verse_content(note, stage)
        parts.append(
            f'<div class="{cls}" onclick="pycmd(\'upgrade:{i}\')">'
            f'<span class="verse-num">{_html.escape(vnum)}</span>'
            f'{content}'
            f'</div>'
        )

    remaining = len(notes) - visible_count
    if remaining > 0:
        parts.append(
            f'<div class="pending">… {remaining} more '
            f'{"verses" if remaining != 1 else "verse"} '
            f'(Space = +2, Shift+Space = +5)</div>'
        )

    return "".join(parts)


# ---------------------------------------------------------------------------
# Chooser dialog
# ---------------------------------------------------------------------------

class ReciteChooserDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Bible Memorizer – Recite Chapter")
        self.resize(520, 180)

        self.batches = find_batches()

        layout = QVBoxLayout(self)
        layout.addWidget(QLabel("Choose a text:"))

        self.combo = QComboBox()
        if self.batches:
            for batch_id, title, nids in self.batches:
                self.combo.addItem(f"{title}  ({len(nids)} notes)", batch_id)
        else:
            self.combo.addItem("(no Bible Memorizer notes found)", None)
            self.combo.setEnabled(False)
        layout.addWidget(self.combo)

        btns = qt.QDialogButtonBox(
            qt.QDialogButtonBox.StandardButton.Ok
            | qt.QDialogButtonBox.StandardButton.Cancel
        )
        btns.accepted.connect(self.accept)
        btns.rejected.connect(self.reject)
        layout.addWidget(btns)

        if not self.batches:
            ok_btn = btns.button(qt.QDialogButtonBox.StandardButton.Ok)
            if ok_btn:
                ok_btn.setEnabled(False)

    def selected_batch(self) -> Optional[tuple[str, str, list[int]]]:
        idx = self.combo.currentIndex()
        if idx < 0 or idx >= len(self.batches):
            return None
        return self.batches[idx]


# ---------------------------------------------------------------------------
# Main recite dialog
# ---------------------------------------------------------------------------

class ReciteDialog(QDialog):
    def __init__(self, batch_title: str, nids: list[int], parent=None):
        super().__init__(parent)
        self.batch_title = batch_title
        self.setWindowTitle(f"Recite: {batch_title}")
        self.resize(920, 720)

        # Notes & initial stages
        self.notes = [mw.col.get_note(nid) for nid in nids]
        self.initial_stages = [initial_stage_for_note(n) for n in self.notes]
        self.stages = list(self.initial_stages)

        self.step = max(1, _cfg_int("recite_reveal_step"))
        self.big_step = max(1, _cfg_int("recite_big_step"))

        initial_visible = max(1, _cfg_int("recite_initial_visible"))
        self.visible_count = min(initial_visible, len(self.notes)) if self.notes else 0
        self.default_stage = self.stages[self.visible_count - 1] if self.visible_count > 0 else STAGE_LAST_LETTERS

        self._build_ui()
        self._bind_shortcuts()
        self.refresh()

    # ----- UI -----

    def _build_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setContentsMargins(8, 8, 8, 8)
        layout.setSpacing(6)

        self.web = AnkiWebView(parent=self, title="recite_chapter")
        try:
            self.web.setFocusPolicy(Qt.FocusPolicy.NoFocus)
        except AttributeError:
            self.web.setFocusPolicy(Qt.NoFocus)  # type: ignore[attr-defined]
        self.web.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        self.web.set_bridge_command(self._on_bridge, self)
        layout.addWidget(self.web, 1)

        self.status_label = QLabel()
        self.status_label.setStyleSheet("color: #666; padding: 2px 6px;")
        layout.addWidget(self.status_label)

        btn_row = QHBoxLayout()

        self.btn_more = QPushButton(f"+{self.step}  ⎵")
        self.btn_more.setToolTip("Space / →")
        self.btn_more.clicked.connect(self.reveal_more)
        btn_row.addWidget(self.btn_more)

        self.btn_more_big = QPushButton(f"+{self.big_step}  ⇧⎵")
        self.btn_more_big.setToolTip("Shift+Space / Shift+→")
        self.btn_more_big.clicked.connect(self.reveal_more_big)
        btn_row.addWidget(self.btn_more_big)

        self.btn_upgrade = QPushButton("More detail  ↵")
        self.btn_upgrade.setToolTip("Enter: reveal more of the last visible verse")
        self.btn_upgrade.clicked.connect(self.upgrade_last)
        btn_row.addWidget(self.btn_upgrade)

        self.btn_downgrade = QPushButton("Less detail  ⇧↵")
        self.btn_downgrade.setToolTip("Shift+Enter: hide more of the last visible verse")
        self.btn_downgrade.clicked.connect(self.downgrade_last)
        btn_row.addWidget(self.btn_downgrade)

        self.btn_back = QPushButton(f"-{self.step}  ⌫")
        self.btn_back.setToolTip("Backspace / ←")
        self.btn_back.clicked.connect(self.reveal_less)
        btn_row.addWidget(self.btn_back)

        self.btn_all = QPushButton("Show all  A")
        self.btn_all.clicked.connect(self.reveal_all)
        btn_row.addWidget(self.btn_all)

        self.btn_reset = QPushButton("Reset  R")
        self.btn_reset.clicked.connect(self.reset)
        btn_row.addWidget(self.btn_reset)

        self.btn_close = QPushButton("Close  Esc")
        self.btn_close.clicked.connect(self.reject)
        btn_row.addWidget(self.btn_close)

        layout.addLayout(btn_row)

    def _bind_shortcuts(self) -> None:
        def sc(seq: str, handler) -> None:
            s = QShortcut(QKeySequence(seq), self)
            s.activated.connect(handler)

        sc("Space", self.reveal_more)
        sc("Right", self.reveal_more)
        sc("Shift+Space", self.reveal_more_big)
        sc("Shift+Right", self.reveal_more_big)
        sc("Return", self.upgrade_last)
        sc("Enter", self.upgrade_last)
        sc("Shift+Return", self.downgrade_last)
        sc("Shift+Enter", self.downgrade_last)
        sc("Backspace", self.reveal_less)
        sc("Left", self.reveal_less)
        sc("A", self.reveal_all)
        sc("R", self.reset)

    # ----- Actions -----

    def reveal_more(self) -> None:
        if not self.notes:
            return
        old_count = self.visible_count
        self.visible_count = min(self.visible_count + self.step, len(self.notes))
        for i in range(old_count):
            self.stages[i] = STAGE_FULL
        for i in range(old_count, self.visible_count):
            self.stages[i] = self.default_stage
        self.refresh(scroll_to_bottom=True)

    def reveal_more_big(self) -> None:
        if not self.notes:
            return
        old_count = self.visible_count
        self.visible_count = min(self.visible_count + self.big_step, len(self.notes))
        for i in range(old_count):
            self.stages[i] = STAGE_FULL
        for i in range(old_count, self.visible_count):
            self.stages[i] = self.default_stage
        self.refresh(scroll_to_bottom=True)

    def reveal_less(self) -> None:
        if not self.notes:
            return
        self.visible_count = max(self.visible_count - self.step, 1)
        self.refresh()

    def upgrade_last(self) -> None:
        for i in range(self.visible_count):
            if self.stages[i] < STAGE_FULL:
                self.stages[i] += 1
                self.default_stage = self.stages[i]
                self.refresh()
                return

    def downgrade_last(self) -> None:
        for i in range(self.visible_count):
            if self.stages[i] > STAGE_VERSE_NUMBER:
                self.stages[i] -= 1
                self.refresh()
                return

    def reveal_all(self) -> None:
        if not self.notes:
            return
        self.visible_count = len(self.notes)
        self.stages = [STAGE_FULL] * len(self.notes)
        self.refresh()

    def reset(self) -> None:
        if not self.notes:
            return
        initial_visible = max(1, _cfg_int("recite_initial_visible"))
        self.visible_count = min(initial_visible, len(self.notes))
        self.stages = list(self.initial_stages)
        self.default_stage = self.stages[self.visible_count - 1]
        self.refresh()

    # ----- Bridge (Klick auf Vers) -----

    def _on_bridge(self, cmd: str):
        if not isinstance(cmd, str):
            return
        if cmd.startswith("upgrade:"):
            try:
                idx = int(cmd.split(":", 1)[1])
            except ValueError:
                return
            if 0 <= idx < len(self.stages) and idx < self.visible_count:
                if self.stages[idx] < STAGE_FULL:
                    self.stages[idx] += 1
                    self.refresh()

    # ----- Render -----

    def refresh(self, scroll_to_bottom: bool = False) -> None:
        body = render_body(self.notes, self.stages, self.visible_count, self.batch_title)
        self.web.stdHtml(body)
        if scroll_to_bottom:
            QTimer.singleShot(100, lambda: self.web.eval("window.scrollTo(0, document.body.scrollHeight);"))
        total = len(self.notes)
        self.status_label.setText(
            f"Visible: {self.visible_count} / {total} verses"
        )

    # ----- Cleanup -----

    def reject(self) -> None:
        try:
            self.web.cleanup()
        except Exception:
            pass
        super().reject()

    def accept(self) -> None:
        try:
            self.web.cleanup()
        except Exception:
            pass
        super().accept()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def show_recite_dialog() -> None:
    chooser = ReciteChooserDialog(parent=mw)
    if not chooser.exec():
        return
    selected = chooser.selected_batch()
    if not selected:
        return
    _batch_id, title, nids = selected
    if not nids:
        return
    dlg = ReciteDialog(title, nids, parent=mw)
    dlg.exec()
