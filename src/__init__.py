import sys


def show_dialog() -> None:
    bm_action()


if "pytest" not in sys.modules:
    from aqt import mw
    from aqt.utils import qconnect
    from aqt.qt import *

    from .dialog import bm_action

    action = QAction("Bible Memorizer", mw)
    qconnect(action.triggered, show_dialog)
    mw.form.menuTools.addAction(action)
