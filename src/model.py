import aqt

from aqt.utils import askUser, showInfo
from textwrap import dedent


_field_names = [
    "answer",
    "verse_number",
    "verse_part",
    "table",
    "front",
    "back",
    "first_letters",
    "last_letters",
    "title",
    "id",
]
_model_name = "Bible Memorizer"
_sort_field = "id"
_styling = """
    .card {
        font-family: arial;
        font-size: 20px;
        text-align: center;
        color: black;
        background-color: white;
    }

    .back {
        color: blue;
        font-style: italic;
    }

    .table {
        font-size: 16px;
        margin: auto;
        max-width: 600px;
    }

    table {
        table-layout: fixed; 
        width: 100%; 
        border-collapse: collapse; 
        border: 1x solid;
    }

    td {
        word-wrap: break-word; 
        vertical-align: top; 
        padding:.3em;
    }

    td:last-child {
        background-color: orange;
    }

    .highlight {
        background-color: yellow;
    }

    .card.nightMode {
        background-color: #333;
    }

    .nightMode .back {
        color: yellow;
    }

    .passage {
        font-size: .8em
    }

    .front, .back {
       font-family: serif
    }
"""
_card1_front = '{{#last_letters}}\n<div id="card">\n<div>{{title}}</div>\n<div class="passage">{{verse_number}}{{verse_part}}</div>\n<br>\n<div class="front">{{front}}\n{{last_letters}}</div>\n</div>\n{{/last_letters}}'
_card1_back = (
    '{{FrontSide}}\n<br>\n<hr id="answer">\n<div class="back">{{answer}}</div>\n'
)
_card2_front = '<div id="card">\n<div>{{title}}</div>\n<div class="passage">{{verse_number}}{{verse_part}}</div>\n<br>\n<div class="front">{{front}}\n{{first_letters}}</div>\n</div>'
_card2_back = (
    '{{FrontSide}}\n<br>\n<hr id="answer">\n<div class="back">{{answer}}</div>\n'
)
_card3_front = '{{#table}}\n<div id="card">\n<div>{{title}}</div>\n<div class="passage">{{verse_number}}{{verse_part}}</div>\n<br>\n<div class="table">{{table}}</div>\n</div>\n{{/table}}'
_card3_back = (
    '{{FrontSide}}\n<br>\n<hr id="answer">\n<div class="back">{{answer}}</div>\n'
)
_card4_front = '<div id="card">\n<div>{{title}}</div>\n<div class="passage">{{verse_number}}{{verse_part}}</div>\n<br>\n<div class="front">{{front}}</div>\n</div>'
_card4_back = '{{FrontSide}}\n<br>\n<hr id="answer">\n<div class="back">{{back}}</div>'
# TODO: The front now contains the verse but also the verse number. A new field must be generated that includes the verse without the verse number
_card5_front = '<div id="card">\n<div>{{answer}}</div>\n</div>'
_card5_back = '{{FrontSide}}\n<br>\n<hr id="answer">\n<div class="back">\n<div>{{title}}</div>\n<div class="passage">{{verse_number}}{{verse_part}}</div>\n</div>\n'

_current_version = "1.4"


def create_model(mw):
    mm = mw.col.models
    m = mm.new(_(_model_name))

    for field_name in _field_names:
        fm = mm.new_field(_(field_name))
        mm.addField(m, fm)

    t = mm.new_template("Card 1")
    t["qfmt"] = _card1_front
    t["afmt"] = _card1_back
    mm.addTemplate(m, t)

    t = mm.new_template("Card 2")
    t["qfmt"] = _card2_front
    t["afmt"] = _card2_back
    mm.addTemplate(m, t)

    t = mm.new_template("Card 3")
    t["qfmt"] = _card3_front
    t["afmt"] = _card3_back
    mm.addTemplate(m, t)

    t = mm.new_template("Card 4")
    t["qfmt"] = _card4_front
    t["afmt"] = _card4_back
    mm.addTemplate(m, t)

    t = mm.new_template("Card 5")
    t["qfmt"] = _card5_front
    t["afmt"] = _card5_back
    mm.addTemplate(m, t)

    mm.add(m)
    m["css"] = dedent(_styling).strip()
    m["sortf"] = _field_names.index(_sort_field)
    mw.col.models.save(m)
    aqt.mw.col.set_config("bm_model_version", _current_version)
    return m


def upgradeonedotone(mw, mod):
    print("Upgrading to 1.1...")
    mod["tmpls"][1]["qfmt"] = _card2_front
    mw.col.models.save(mod)


def upgradeonedottwo(mw, mod):
    print("Upgrading to 1.2...")
    _css = """
        .card.nightMode {
            background-color: #333;
        }

        .nightMode .back {
            color: yellow;
        }
    """
    mod["css"] = f'{mod["css"]}\n\n{dedent(_css).strip()}'
    mw.col.models.save(mod)


def upgradeonedotthree(mw, mod):
    print("Upgrading to 1.3...")
    mod["css"] = dedent(_styling).strip()
    mw.col.models.save(mod)


def upgradeonedotfour(mw, mod):
    print("Upgrading to 1.4...")
    mm = mw.col.models

    fm = mw.col.models.new_field("last_letters")
    mw.col.models.addField(mod, fm)
    mw.col.models.save(mod)

    mod["tmpls"][0]["qfmt"] = _card1_front
    mod["tmpls"][0]["afmt"] = _card1_back

    mod["tmpls"][1]["qfmt"] = _card2_front
    mod["tmpls"][1]["afmt"] = _card2_back

    mod["tmpls"][2]["qfmt"] = _card3_front
    mod["tmpls"][2]["afmt"] = _card3_back

    if len(mod["tmpls"]) == 3:
        t = mm.new_template("Card 4")
        t["qfmt"] = _card4_front
        t["afmt"] = _card4_back
        mm.addTemplate(mod, t)
    else:
        mod["tmpls"][3]["qfmt"] = _card4_front
        mod["tmpls"][3]["afmt"] = _card4_back

    mw.col.models.save(mod)

def get_bm_model():
    mw = aqt.mw

    if mw.col is None:
        return

    m = mw.col.models.by_name(_model_name)
    if not m:
        print("Bible Memorizer note type not found. Creating...")
        m = create_model(mw)

    # check if template needs to be upgraded:
    current_version = aqt.mw.col.get_config("bm_model_version", default="none")
    if current_version == "none":
        upgradeonedotone(mw, m)
        upgradeonedottwo(mw, m)
        upgradeonedotthree(mw, m)
        upgradeonedotfour(mw, m)
        aqt.mw.col.set_config("bm_model_version", _current_version)

    if current_version == "1.1":
        upgradeonedottwo(mw, m)
        upgradeonedotthree(mw, m)
        aqt.mw.col.set_config("bm_model_version", _current_version)

    if current_version == "1.2":
        upgradeonedotthree(mw, m)
        aqt.mw.col.set_config("bm_model_version", _current_version)

    if current_version == "1.3":
        upgradeonedotfour(mw, m)
        aqt.mw.col.set_config("bm_model_version", _current_version)

    # TODO: Add upgrade for Card 5 template

    # Add new fields if they don't exist yet
    fields_to_add = [
        field_name
        for field_name in _field_names
        if field_name not in mw.col.models.field_names(m)
    ]
    if fields_to_add:
        print(
            """
            <p>The Bible Memorizer Addon has recently been upgraded to include the following attributes: {}</p>
            <p>This change will require a full-sync of your card database to your Anki-Web account.</p>
            """.format(
                ", ".join(fields_to_add)
            )
        )

        for field_name in fields_to_add:
            pass
            fm = mw.col.models.new_field(field_name)
            mw.col.models.addField(m, fm)
            mw.col.models.save(m)

    return m
