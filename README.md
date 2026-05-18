# bible-memorizer
## Anki add-on focused on Bible memorisation

## Tutorial

1. Install this add-on.
2. Open Bible Memorizer (Tools → Bible Memorizer)
3. Copy your scripture into the text box. Each new line is a new note. It is best to add a line break after each verse (one verse per line) or to break the verse into several parts (one part per line). **You should include the verse number at the beginning of each new verse.**
4. For every note there are three cards (or four if you checked the box "Create Table").

## Further Notes
* 1 verse = all lines until a there is a new verse number at the beginning of a line.
* If you don't use verse numbers at all, you are limited to 26 "verses", because there are not more letters in the alphabet :)
* "Table Cards" are only created if you have more then 4 verses. They are not created by default.

## Screenshots

Tools → Bible Memorizer

![image](https://raw.githubusercontent.com/zefanja/bible-memorizer/master/docs/menu.png)

Import

![image](https://raw.githubusercontent.com/zefanja/bible-memorizer/master/docs/import.png)

Card 1

![image](https://raw.githubusercontent.com/zefanja/bible-memorizer/master/docs/card1.png)

Card 2

![image](https://raw.githubusercontent.com/zefanja/bible-memorizer/master/docs/card3.png)

## Recite Chapter

The **Recite Chapter** feature lets you recite a whole passage from memory — without touching your card schedule.

### How to use

1. Open the dialog via Tools → Recite Text.
2. Choose the passage you want to recite from the dropdown.
3. Verses are revealed one by one. Each verse is shown at a detail level that matches its current learning state:
   - **Verse number only** — mature cards (interval ≥ 21 days)
   - **First letters** — young review cards
   - **Last letters** — new / learning / relearning cards
   - **Full text** — fully revealed

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| Space / → | Reveal next verse (+2) |
| Shift+Space / Shift+→ | Reveal next verses (+5) |
| Enter | Show more detail for the last visible verse |
| Shift+Enter | Show less detail for the last visible verse |
| Backspace / ← | Hide last verse |
| A | Show all verses (full text) |
| R | Reset to initial state |
| Esc | Close |

You can also click any verse directly to reveal one more level of detail for that verse.

### Screenshots

Tools → Recite Text

![image](https://raw.githubusercontent.com/zefanja/bible-memorizer/master/docs/menu_recite.png)

Recite dialog

![image](https://raw.githubusercontent.com/zefanja/bible-memorizer/master/docs/recite.png)

## Known Issues
If you used and installed this add-on before April 2025 you may have some empty cards. You can remove them with Tools → Empty Cards.
