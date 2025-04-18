from aqt import qt
from aqt.deckchooser import DeckChooser
from aqt import mw
from anki.notes import Note

from .model import get_bm_model
from .gen_notes import add_notes


class BmDialog(qt.QDialog):
    def __init__(self, mw, parent=None) -> None:
        super().__init__(parent)
        self.mw = mw

        # title
        self.setWindowTitle("Bible Memorizer")

        # deck chooser
        self.dc_widget = qt.QWidget()
        self.deckchooser = DeckChooser(self.mw, self.dc_widget)

        # title box
        self.title_label = qt.QLabel()
        self.title_label.setText("Title")
        self.title_box = qt.QLineEdit()
        self.title_box.setFocus()

        # recite box
        self.recite_label = qt.QLabel()
        self.recite_label.setText("Lines to recite")
        self.recite_box = qt.QSpinBox()
        self.recite_box.setValue(2)

        # Checkbox
        self.checkbox = qt.QCheckBox("Create Table")

        # text box
        self.text_box_label = qt.QLabel()
        self.text_box_label.setText("Enter your bible text:")
        self.text_edit = qt.QPlainTextEdit()

        # OK/Cancel buttons
        self.button_box = qt.QDialogButtonBox(
            qt.QDialogButtonBox.StandardButton.Ok
            | qt.QDialogButtonBox.StandardButton.Cancel
        )
        self.button_box.accepted.connect(self.accept)
        self.button_box.rejected.connect(self.reject)

        # layout
        layout = qt.QVBoxLayout()
        layout.addWidget(self.dc_widget)
        layout.addWidget(self.title_label)
        layout.addWidget(self.title_box)
        layout.addWidget(self.recite_label)
        layout.addWidget(self.recite_box)
        layout.addWidget(self.checkbox)
        layout.addWidget(self.text_box_label)
        layout.addWidget(self.text_edit)
        layout.addWidget(self.button_box)

        self.setLayout(layout)


def bm_action() -> None:
    dialog = BmDialog(mw)
    dialog.title_box.setFocus()
    model = get_bm_model()

    if dialog.exec():
        title = dialog.title_box.text().strip()
        recite = dialog.recite_box.value()
        text = dialog.text_edit.toPlainText()
        did = dialog.deckchooser.selectedId()
        table = dialog.checkbox.isChecked()

        add_notes(mw.col, Note, title, recite, text, did, table)

    dialog.deckchooser.cleanup()
