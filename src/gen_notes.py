#!/usr/bin/env python3
import time
import re

import re
import string

def replace_last_letter_with_underscore(text):
    def process_word(word):
        return word[:-1] + '_' if len(word) > 0 else ''

    tokens = re.findall(r'\b\w+\b|[^\w\s]|\s+', text)

    return ''.join(process_word(t) if re.match(r'\b\w+\b', t) else t for t in tokens)

def keep_first_letter_only(text):
    def process_word(word):
        return word[0] if len(word) > 0 else ''

    tokens = re.findall(r'\b\w+\b|[^\w\s]|\s+', text)

    return ''.join(process_word(t) if re.match(r'\b\w+\b', t) else t for t in tokens)

def process_lines(text):
    lines = text.splitlines()
    current_verse = "0"
    subline_index = 0
    result = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue  # skip empty lines

        match = re.match(r'^\s*(\d+)\s+(.*)', line)
        if match:
            current_verse = match.group(1)
            subline_index = 0
            content = match.group(2)
        else:
            content = stripped

        letter = string.ascii_lowercase[subline_index % 26]

        last_letters_removed = replace_last_letter_with_underscore(content)
        first_letter_only = keep_first_letter_only(content)

        result.append({
                "first_letters": first_letter_only,
                "last_letters": last_letters_removed,
                "verse_number": current_verse,
                "verse_part": letter,
                "answer": line.strip(),

            })
        subline_index += 1

    return result


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


def add_notes(col, note_constructor, title: str, recite: int, text: str, deck_id: int, table: bool):
    data = process_lines(text)

    sorted_data = sort_by_verse_number(data)

    for idx, d in enumerate(data):
        html = ""
        if len(sorted_data) > 4 and table:
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
        n["last_letters"] = d["last_letters"]

        ms = int(time.time() * 1000)
        n["id"] = f"{ms}-{str(idx)}"

        col.addNote(n)

    return len(data)
