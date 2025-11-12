# -*- coding: utf-8 -*-
# Fill last_letters from answer (only if last_letters is empty)
#
# Adds:
#  - Tools → Fill last_letters from answer
#  - Browser right-click (context menu) → Fill last_letters from answer (selected)
#
# The add-on reads the `answer` field, generates a mask and writes it to `last_letters`
# if (and only if) `last_letters` is effectively empty.
#
# Tested on recent 2.1 builds using gui_hooks.

from __future__ import annotations

import re
import html
from typing import List, Tuple

from aqt import mw

from anki.utils import strip_html


# =========================
# ===== Configuration =====
# =========================
# Adjust these defaults; you can also prompt the user at runtime.
SOURCE_FIELD = "answer"
TARGET_FIELD = "last_letters"
MODE = "word"     # 'word' = mask last letter of each word; 'string' = mask final letter of the whole string

# If True: when deciding if TARGET_FIELD is empty, we remove HTML and whitespace.
CONSIDER_HTML_EMPTY = True

# =========================
# ====== Core Logic  ======
# =========================

def is_effectively_empty_field(value: str) -> bool:
    """Consider field empty when, after removing HTML and whitespace, nothing remains."""
    if value is None:
        return True
    if CONSIDER_HTML_EMPTY:
        # strip_html removes tags; then we strip whitespace
        text = strip_html(value or "")
        return text.strip() == ""
    else:
        return (value or "").strip() == ""


def mask_last_letter_each_word(text: str) -> str:
    """
    Replace the last alphabetic letter of EACH word with '_'.
    Words are \\w spans; only replace the last alphabetic char inside each span.
    """
    # Work on plain text (answer may contain HTML; we’ll strip for computation)
    chars = list(text)
    for m in re.finditer(r"\b\w+\b", text, flags=re.UNICODE):
        start, end = m.start(), m.end()
        i = end - 1
        while i >= start and not chars[i].isalpha():
            i -= 1
        if i >= start and chars[i].isalpha():
            chars[i] = "_"
    return "".join(chars)


def mask_final_letter_of_string(text: str) -> str:
    """Replace the last alphabetic letter of the entire string with '_'."""
    chars = list(text)
    i = len(chars) - 1
    while i >= 0 and not chars[i].isalpha():
        i -= 1
    if i >= 0 and chars[i].isalpha():
        chars[i] = "_"
    return "".join(chars)


def transform(text: str, mode: str) -> str:
    if mode == "word":
        return mask_last_letter_each_word(text)
    elif mode == "string":
        return mask_final_letter_of_string(text)
    else:
        raise ValueError("MODE must be 'word' or 'string'.")


def compute_mask_from_answer(raw_answer: str, mode: str) -> str:
    """
    Convert `answer` content to text for transformation.
    We remove HTML tags (to operate on visible text), unescape entities,
    and then apply the selected masking mode.
    """
    # Convert to visible-ish text
    txt = strip_html(raw_answer or "")
    txt = html.unescape(txt)
    txt = txt.strip()
    if not txt:
        return ""
    return transform(txt, mode)


def fill_last_letters_for_notes(nids: List[int]) -> Tuple[int, int]:
    """
    Process the given note IDs:
    - Read SOURCE_FIELD (answer), build mask
    - If TARGET_FIELD is effectively empty, write mask to TARGET_FIELD
    Returns: (processed_count, updated_count)
    """
    col = mw.col
    updated = 0
    processed = 0

    for nid in nids:
        note = col.get_note(nid)
        # Skip notes missing the relevant fields
        if SOURCE_FIELD not in note or TARGET_FIELD not in note:
            continue

        processed += 1

        target_raw = note[TARGET_FIELD]
        if not is_effectively_empty_field(target_raw):
            # Respect "only if empty"
            continue

        source_raw = note[SOURCE_FIELD]
        mask = compute_mask_from_answer(source_raw, MODE)
        if not mask.strip():
            # Nothing to write
            continue

        note[TARGET_FIELD] = mask
        mw.col.update_note(note)
        updated += 1

    return processed, updated