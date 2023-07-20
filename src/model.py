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
            font-size: 16px
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
"""


def create_model(mw):
    mm = mw.col.models
    m = mm.new(_(_model_name))

    for field_name in _field_names:
        fm = mm.newField(_(field_name))
        mm.addField(m, fm)

    t = mm.newTemplate("Card 1")
    t[
        "qfmt"
    ] = '<div id="card">\n<div>{{title}}</div>\n<div class="passage">{{verse_number}}{{verse_part}}</div>\n<br>\n<div class="front">{{front}}\n{{first_letters}}</div>\n</div>'
    t["afmt"] = '{{FrontSide}}\n<br>\n<hr id="answer">\n<div class="back">{{answer}}</div>\n'
    mm.addTemplate(m, t)

    t = mm.newTemplate("Card 2")
    t[
        "qfmt"
    ] = '<div id="card">\n<div>{{title}}</div>\n<div class="passage">{{verse_number}}{{verse_part}}</div>\n<br>\n<div class="table">{{table}}</div>\n</div>'
    t["afmt"] = '{{FrontSide}}\n<br>\n<hr id="answer">\n<div class="back">{{answer}}</div>\n'
    mm.addTemplate(m, t)

    t = mm.newTemplate("Card 3")
    t[
        "qfmt"
    ] = '<div id="card">\n<div>{{title}}</div>\n<div class="passage">{{verse_number}}{{verse_part}}</div>\n<br>\n<div class="front">{{front}}</div>\n</div>'
    t["afmt"] = '{{FrontSide}}\n<br>\n<hr id="answer">\n<div class="back">{{back}}</div>'
    mm.addTemplate(m, t)

    mm.add(m)
    m["css"] = dedent(_styling).strip()
    m["sortf"] = _field_names.index(_sort_field)
    mw.col.models.save(m)
    return m


def get_bm_model(aqt):
    mw = aqt.mw
    m = mw.col.models.by_name(_model_name)
    if not m:
        aqt.mw.taskman.run_on_main(
            lambda: aqt.mw.progress.update(
                label="Bible Memorizer note type not found. Creating..."
            )
        )
        m = create_model(mw)
    #m["css"] = dedent(_styling).strip()
    #m["sortf"] = _field_names.index(_sort_field)

    # Add new fields if they don't exist yet
    fields_to_add = [
        field_name
        for field_name in _field_names
        if field_name not in mw.col.models.field_names(m)
    ]
    if fields_to_add:
        aqt.mw.taskman.run_on_main(
            lambda: showInfo(
                """
                <p>The Bible Memorizer Addon has recently been upgraded to include the following attributes: {}</p>
                <p>This change will require a full-sync of your card database to your Anki-Web account.</p>
                """.format(
                    ", ".join(fields_to_add)
                )
            )
        )
        for field_name in fields_to_add:
            pass
            fm = mw.col.models.newField(_(field_name))
            mw.col.models.addField(m, fm)
            mw.col.models.save(m)

    return m
