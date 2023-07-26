import sys


def show_dialog() -> None:
    bm_action()


if "pytest" not in sys.modules:
    import aqt
    from aqt import mw
    from aqt.utils import qconnect
    from aqt.qt import *

    from .dialog import bm_action
    from .model import get_bm_model

    action = QAction("Bible Memorizer", mw)
    qconnect(action.triggered, show_dialog)
    mw.form.menuTools.addAction(action)

    aqt.gui_hooks.profile_did_open.append(get_bm_model)
