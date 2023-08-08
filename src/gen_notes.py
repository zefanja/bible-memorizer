#!/usr/bin/env python3
import time

def read_data(text):
    data = text.splitlines()

    data_out = []
    verse_number = 1
    verse_parts = ["a", "b", "c", "d", "e", "f"]
    verse_part = 0
    back_chars = [")", ",", ";", ".", "!", "?", "’", "”", "«", "‹", "\""]
    front_chars = ["\"", "'", "`", "(", "»", "›", "“", "‘"]

    for line in data:
        new_line = line.replace("\n", "")
        split = new_line.split()
        out = ""
        for s in split:
            s = s.strip()
            if s[0] in front_chars:
                out += s[0] + s[1]
            elif s[-1] in back_chars:
                out += s[0] + s[-1]
            elif len(s) > 2 and s[-2] == ")":
                out += s[0] + s[-2]
            elif s[0].isnumeric():
                verse_number = int(s)
                verse_part = 0
                continue
            else:
                out += s[0]
            out += " "
        data_out.append(
            {
                "first_letters": out,
                "verse_number": verse_number,
                "verse_part": verse_parts[verse_part],
                "answer": new_line,
            }
        )

        verse_part += 1

    return data_out


def sort_by_verse_number(data):
    new_data = {}
    for d in data:
        if d["verse_number"] not in new_data:
            new_data[d["verse_number"]] = []
        new_data[d["verse_number"]].append(d)

    return new_data


def create_html_table(data, verse_number, verse_part="a"):
    columns = 5
    width = int(100 / columns)
    html = "<table border=1>"
    counter = 0
    for verses in data:
        if counter % columns == 0:
            if counter == 0:
                html += "<tr>"
            elif counter < len(data):
                html += "<tr>"

        td = f"<td style='width:{width}%;'>"

        for idx, vers in enumerate(data[verses]):
            vn = f"<span><strong>{vers['verse_number']} </strong></span>"
            if idx == 0:
                td += vn

            highlight = ""
            if (
                vers["verse_number"] == verse_number
                and vers["verse_part"] == verse_part
            ):
                highlight = "class='highlight'"

            td += f"<span {highlight}>{vers['first_letters']}</span>"

        td += "</td>"
        html += td

        if counter % columns == 4 and counter != 0:
            html += "</tr>"

        counter += 1

    while counter % columns != 0:
        html += "<td></td>"
        counter += 1

    html += "</tr></table>"

    return html


def get_verses(data, verse_number, verse_part, amount=2):
    front = ""
    back = ""

    for idx, d in enumerate(data):
        if d["verse_number"] == verse_number and d["verse_part"] == verse_part:
            front = ""
            back = ""

            counter = 0
            while counter < amount and (idx + counter) < len(data):
                back += f'{data[idx+counter]["answer"]}<br>'
                counter += 1

            counter = 0
            while counter < amount and (idx - counter - 1) >= 0:
                front = f'{data[idx-counter-1]["answer"]}<br>{front}'
                counter += 1

    if front == "":
        front = "[Beginning]"
    return front, back


def add_notes(col, note_constructor, title: str, recite: int, text: str, deck_id: int):
    data = read_data(text)

    sorted_data = sort_by_verse_number(data)

    for idx, d in enumerate(data):
        html = ""
        if len(sorted_data) > 4:
            html = create_html_table(sorted_data, d["verse_number"], d["verse_part"])

        front, back = get_verses(data, d["verse_number"], d["verse_part"], recite)

        n = note_constructor(col, col.models.by_name("Bible Memorizer"))
        n.note_type()["did"] = deck_id
        n["answer"] = d["answer"]
        n["verse_number"] = str(d["verse_number"])
        n["verse_part"] = d["verse_part"]
        n["table"] = html
        n["title"] = title
        n["front"] = front
        n["back"] = back
        n["first_letters"] = d["first_letters"]

        ms = int(time.time()*1000)
        n["id"] = f"{ms}-{str(idx)}"

        col.addNote(n)
