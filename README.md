# Terms of Practice

A two-page manifesto site for digital experience designers entering product organisations. The site is an industry document under correction: industry language is flagged in signal blue, and the manifesto's own voice arrives in a serif, on highlighter, wherever something is restored.

- `index.html` — the landing: a field of 22 industry words, sized by how much has to change if you say them honestly. Select a word to read what it replaced, why it is here and the source.
- `manifesto.html` — the manifesto in six sections: the inheritance, the infrastructure, the consent case, six terms of practice, the position, six moves.

## Stack

Static HTML, CSS and vanilla JavaScript. No framework, no build step.

```
css/tokens.css      colour, type, spacing and motion tokens
css/base.css        shared type roles, marks, caret cursor, retitling headline
css/landing.css     word field, sheet, counter bar, word popup
css/manifesto.css   header and section bar, marks, sections 01–06, position bar
js/common.js        data loader, caret cursor, retitling headline, helpers
js/landing.js       word field loop, popup, read counter, landing headline
js/manifesto.js     reading progress, section menu, position bar, statement scene,
                    term swaps, notes, process track, clauses, move cards, resets
data/manifesto.json word, note, swap and term data shared by both pages
```

Fonts load from Google Fonts: Newsreader, Courier Prime and Archivo.

## Run locally

The pages fetch `data/manifesto.json`, so serve the folder rather than opening the files directly:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy

GitHub Pages serves the repository root from `main`. `.nojekyll` turns off Jekyll processing.
