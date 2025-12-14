# Phrasebook Learn — local deferred-repetition demo

This is a small local web app demo that shows how to build a browser-only
phrase-learning application using a deferred repetition (spaced repetition)
approach. All data is stored in the browser (localStorage). The server only
needs to serve static files (HTML/CSS/JS/JSON).

Files created:
- `index.html` — single-page app skeleton with onboarding and session UI
- `styles.css` — minimal responsive styles
- `app.js` — main client logic (lots of comments for learning)
- `phrases.json` — seed phrasebook entries (a few languages included)

How to run (developer environment):

Open `index.html` in your browser. For the best experience use a local static
server (browsers sometimes block fetch of local JSON when opening as file).

Examples to run a quick static server (PowerShell):

pwsh commands:

python -m http.server 5500

Then open http://localhost:5500 in the browser.

What to edit next:
- Expand `phrases.json` with all languages from the Hilton phrasebook.
- Add translations to other native languages if you want non-English natives.
- Improve the SRS algorithm (this is a simple SM-2-like heuristic).
- Add persistent backup/export/import of progress (local file).

Notes and learning pointers:
- This project keeps the server passive: it only hosts static files. All
  user data remains in localStorage.
- The app uses the Web Speech API for simple synthesized audio.
- The exercises are simple token-based translation problems; you can extend
  them with multi-word masking, multiple-choice options, or typed-answer
  fuzzy-matching.

Pause here and inspect the files. Tell me which part you'd like to modify or
what you want next (e.g., expand phrase data, improve SRS, add better matching,
add mobile UI polish). Tinkering is encouraged — I'll wait for your changes.
