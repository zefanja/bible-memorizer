import sys
from aqt.qt import QAction, QInputDialog, QLineEdit, QMessageBox
from aqt import mw, gui_hooks
from aqt.utils import qconnect

from .dialog import bm_action
from .model import get_bm_model
from .fix_last_letters import fill_last_letters_for_notes


def show_dialog() -> None:
    bm_action()


def echo_mode_normal():
    """Return a cross-Qt echo mode for 'normal'."""
    # Qt5: QLineEdit.Normal
    # Qt6: QLineEdit.EchoMode.Normal
    try:
        return QLineEdit.Normal  # Qt5
    except AttributeError:
        return QLineEdit.EchoMode.Normal  # Qt6

def _prompt_search_query(default: str = "") -> str | None:
    """
    Ask the user for a Browser-like search query, e.g., 'deck:MyDeck note:Basic tag:xyz'.
    Returns None if canceled.
    """
    text, ok = QInputDialog.getText(
        mw, "Bible Memorizer - Fix old notes",
        "Search (Browser query, e.g. deck:MyDeck note:Type tag:mask):",
        echo_mode_normal(), default
    )
    return text if ok else None


def run_on_search():
    """
    Tools menu action: ask for a search query; run on matching notes.
    """
    query = _prompt_search_query("")
    if query is None:
        return

    nids = mw.col.find_notes(query)
    if not nids:
        QMessageBox.information(mw, "Bible Memorizer - Fix old notes", "No notes match the query.")
        return

    processed, updated = fill_last_letters_for_notes(nids)
    mw.reset()  # refresh UI
    QMessageBox.information(
        mw,
        "Bible Memorizer - Fix old notes",
        f"Processed notes: {processed}\nUpdated (last_letters was empty): {updated}"
    )


def run_on_selected(browser):
    """
    Browser context menu action: run on currently selected notes in the browser.
    """

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
    """
    Hook to extend the Browser right-click menu.
    """
    action = QAction("Bible Memorizer - Fix old notes (selected)", browser)
    action.triggered.connect(lambda: run_on_selected(browser))
    menu.addAction(action)


def add_tools_menu_action():
    """
    Add a Tools menu item.
    """
    a = QAction("Bible Memorizer - Fix old notes", mw)
    a.triggered.connect(run_on_search)
    mw.form.menuTools.addAction(a)


if "pytest" not in sys.modules:
    action = QAction("Bible Memorizer - Import", mw)
    qconnect(action.triggered, show_dialog)
    mw.form.menuTools.addAction(action)

    gui_hooks.profile_did_open.append(get_bm_model)

    gui_hooks.browser_will_show_context_menu.append(on_browser_context_menu)
    add_tools_menu_action()

