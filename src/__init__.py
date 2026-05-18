import sys
from aqt.qt import QAction, QInputDialog, QLineEdit, QMessageBox
from aqt import mw, gui_hooks
from aqt.utils import qconnect

from .dialog import bm_action
from .model import get_bm_model
from .fix_last_letters import fill_last_letters_for_notes
from .recite import show_recite_dialog

CONF_KEY_ENABLE_FIX = "enable_fix_old_notes"

def show_dialog() -> None:
    bm_action()

def echo_mode_normal():
    try:
        return QLineEdit.Normal
    except AttributeError:
        return QLineEdit.EchoMode.Normal

def _prompt_search_query(default: str = "") -> str | None:
    text, ok = QInputDialog.getText(
        mw, "Bible Memorizer - Fix old notes",
        "Search (Browser query, e.g. deck:MyDeck note:Type tag:mask):",
        echo_mode_normal(), default
    )
    return text if ok else None

def run_on_search():
    query = _prompt_search_query("")
    if query is None:
        return

    nids = mw.col.find_notes(query)
    if not nids:
        QMessageBox.information(mw, "Bible Memorizer - Fix old notes", "No notes match the query.")
        return

    processed, updated = fill_last_letters_for_notes(nids)
    mw.reset()
    QMessageBox.information(
        mw,
        "Bible Memorizer - Fix old notes",
        f"Processed notes: {processed}\nUpdated (last_letters was empty): {updated}"
    )

def run_on_selected(browser):
    sel_method = getattr(browser, "selected_notes", None) or getattr(browser, "selectedNotes")
    nids = sel_method()

    if not nids:
        QMessageBox.information(mw, "Bible Memorizer - Fix old notes", "No notes selected.")
        return

    processed, updated = fill_last_letters_for_notes(nids)
    mw.reset()
    QMessageBox.information(
        mw,
        "Bible Memorizer - Fix old notes",
        f"Processed selection: {processed}\nUpdated (last_letters was empty): {updated}"
    )

def on_browser_context_menu(menu, browser):
    action = QAction("Bible Memorizer - Fix old notes (selected)", browser)
    action.triggered.connect(lambda: run_on_selected(browser))
    menu.addAction(action)

def add_tools_menu_action():
    a = QAction("Bible Memorizer - Fix old notes", mw)
    a.triggered.connect(run_on_search)
    mw.form.menuTools.addAction(a)

# --- Initialisierung & Config ---

def init_addon():
    action = QAction("Bible Memorizer - Import", mw)
    qconnect(action.triggered, show_dialog)
    mw.form.menuTools.addAction(action)

    recite_action = QAction("Bible Memorizer - Recite Text", mw)
    qconnect(recite_action.triggered, show_recite_dialog)
    mw.form.menuTools.addAction(recite_action)

    gui_hooks.profile_did_open.append(get_bm_model)

    config = mw.addonManager.getConfig(__name__)
    if config is None:
        config = {CONF_KEY_ENABLE_FIX: False}

    if config.get(CONF_KEY_ENABLE_FIX, False):
        gui_hooks.browser_will_show_context_menu.append(on_browser_context_menu)
        add_tools_menu_action()

if "pytest" not in sys.modules:
    init_addon()