# import the main window object (mw) from aqt
from aqt import mw
# import the "show info" tool from utils.py
from aqt.utils import qconnect
# import all of the Qt GUI library
from aqt.qt import *

from .dialog import bm_action


def show_dialog() -> None:
    bm_action()

# create a new menu item, "test"
action = QAction("Bible Memorizer", mw)
# set it to call testFunction when it's clicked
qconnect(action.triggered, show_dialog)
# and add it to the tools menu
mw.form.menuTools.addAction(action)