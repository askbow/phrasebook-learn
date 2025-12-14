# Copilot instructions — Phrasebook Learn

This file summarizes the initial project brief, developer directions, and the current progress checklist so that an automated/copilot-style assistant can pick up work reliably.

## Project summary (user brief)
- Build a small local-only web app for learning essential phrases using a deferred-repetition (SRS-like) approach.
- Learning material should be based on the "The most important phrases" table at https://hilton.org.uk/european_phrase_book and include country-specific phrases & peculiarities.
- App must be usable on desktop and mobile browsers. The server side is passive/static only; all user data (profile, progress) stays in the browser (localStorage).
- User expected session length: 5–15 minutes per day; sessions present a full dialogue (6 tokens) then at least 10 exercises per session that require translating part of the dialogue between the target language and the user's native language.

## UX / user flow (requirements)
1. Onboarding: ask the user for a display name, native language, and 3–5 priority target languages. Persist profile in localStorage.
2. Daily session flow:
   - Present the full dialogue for a chosen target language and its translation into the user's native language.
   - Play synthesized audio of the full dialogue in the target language.
   - Challenge section: present at least 10 exercises where the user translates a piece (token) between the target and native language.
   - Record answers and update per-token spaced-repetition scheduling in localStorage.
3. Data privacy: no user data leaves the browser. Server only serves static files.

## Data model
- `phrases.json` — dataset imported from Hilton phrasebook. Structure per language:
  - `code` (guessed ISO-like language code)
  - `name` (display name)
  - `translations`: mapping of canonical token keys -> phrase in that language (e.g. "hi" -> "hola")
  - `country_phrases`: mapping English phrase -> local phrase
  - `peculiarities`: free-text notes
- localStorage keys:
  - `phb_profile` — JSON { name, native, priorities }
  - `phb_progress` — object keyed by language code, then token key -> state { interval, lastSeen, ef }

## Architecture / files created so far
- `index.html` — SPA skeleton and markup.
- `styles.css` — minimal responsive styles.
- `app.js` — main client logic (load data, onboarding, session flow, SRS updates, TTS, exercises rendering).
- `phrases.json` — imported Hilton phrasebook (tokens->translations mapping).
- `README.md` — run instructions and notes.
- `favicon.ico` — placeholder to prevent 404 logs.
- `server.py` — optional Python static server that registers `.js` MIME-type correctly.

## Key implementation notes for future copilot steps
- Always treat `phrases.json` as authoritative source for translations. Use token keys ("hi", "a beer", "please", "thank you", "you're welcome", "cheers!") as canonical mapping keys across languages.
- Exercises should be generated from tokens; each exercise object should include:
  - `id`, `tokenKey`, `prompt`, `answer`, `direction` ('to_native'|'from_native'), `promptSpeak` (lang code to use for TTS), and optionally `targetCode`/`nativeCode` for clarity.
- Progress updates should call a single helper `updateLearningState(state, correct)` to mutate per-token scheduling data using a simple SM-2-like heuristic.
- TTS: use the Web Speech API; implement a robust voices-loading helper that waits for `voiceschanged` with a timeout and selects a voice by language prefix. Provide fallbacks and surface debug info if voices are missing.

## Accessibility & input options
- Default input was free-text; replaced with multiple-choice (5 options) to avoid keyboard layout issues.
- Choice buttons must be keyboard-focusable and reachable on mobile. Consider adding ARIA attributes later.

## Scheduling / prioritization rules
- Priority languages selected by the user must be shown before any non-priority language is exposed. Implementation: when choosing the language for a session, prefer unseen priority languages first (no `lastSeen` recorded), otherwise pick by weighted random favoring priorities.

## Testing / quality gates
- Manual smoke test expected: open `index.html` via the provided `server.py`, create a profile, run a session, answer exercises, and ensure progress updates in localStorage.
- Verify TTS works and voices are enumerated (run `speechSynthesis.getVoices()` in console).
- Ensure ES module MIME type is `application/javascript` when served.

## Current progress checklist (delta from initial brief)
- [x] Project boilerplate (HTML/CSS/JS/phrases seed/README)
- [x] phrases.json imported (Hilton phrasebook) and backup created
- [x] Onboarding UI: name/native/priorities (basic)
- [x] Profile reset button added
- [x] TTS helper improved to wait for voices and select best voice
- [x] Exercises switched to multiple-choice (5 options) to avoid typing issues
- [x] Priority language selection logic: unseen priorities shown before non-priorities and weighted repeat selection
- [ ] Improve SRS algorithm (SM-2 full implementation and better grading)
- [ ] Add fuzzy matching for free-text mode (optional vs MCQ)
- [ ] Export/import of progress/profile JSON for backup
- [ ] Improve mobile UI and polish choices styling
- [ ] Accessibility (ARIA roles, announcements) and keyboard-only flows
- [ ] Full parsing and enrichment of 'country_phrases' and 'peculiarities' sections (if desired)

## Next recommended steps for Copilot
1. Add nicer visual styling for multiple-choice buttons and selection feedback (`styles.css` updates).
2. Implement a small in-app debugging panel showing: chosen target language, whether it was an unseen-priority pick, current voice selected by TTS, and progress counts for quick QA.
3. Implement export/import JSON for `phb_profile` and `phb_progress` (local file download / upload) so users can back up data.
4. Replace the simple SRS heuristic with a more complete SM-2 implementation and add an optional per-exercise quality rating (0-5) for more nuanced scheduling.

If you are a copilot-style assistant: follow the data shapes above, always keep user data local, and update the todo list in the repository for each significant change.
