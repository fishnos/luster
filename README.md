# Luster

A browser extension that interrogates your prose as you write.

Three modes:

- **Reading** — collects stats and gives a full editorial read-back of voice, rhythm, devices, and what each paragraph is doing.
- **Interrogation** — asks craft and intent questions without critiquing.
- **Critic** — points out connection and sentence-structure issues live, with span-level highlights and a caret-anchored chip on DOM-readable editors.

For writers polishing prose, style, voice, and English usage.

## Status

Pre-alpha. Active development.

## Stack

WXT + React 19 + TypeScript + Tailwind. Chrome (MV3) and Firefox (MV2).

AI is BYOK — the extension never proxies your text through a backend. You bring an Anthropic, OpenAI, or Gemini key and it stays in `chrome.storage.local`.

## Scope

Activates on document editors only:

- Google Docs (`docs.google.com/document/*`)
- Notion (`www.notion.so/*` and `*.notion.site/*`)
- Substack / Medium / Ghost (ProseMirror-family editors)

It does not run on random textareas, search bars, or social inputs.

## Develop

```bash
npm install
npm run dev          # Chrome dev build, watch
npm run dev:firefox  # Firefox dev build, watch
npm run test         # Vitest
npm run compile      # tsc --noEmit
npm run build        # Chrome production build
npm run build:firefox
npm run zip          # Chrome Web Store zip
npm run zip:firefox  # AMO xpi
```

Load unpacked from `.output/chrome-mv3` (Chrome) or `.output/firefox-mv2` (Firefox).

## End-to-end verification

After `npm run build`, exercise the extension manually:

1. **Load Chrome MV3** — `chrome://extensions` → Developer mode on → Load unpacked → pick `.output/chrome-mv3-prod`.
2. **Load Firefox MV2** — `about:debugging` → This Firefox → Load Temporary Add-on → pick `.output/firefox-mv2/manifest.json`.
3. **Adapter activation** — open a Google Doc, a Notion page, a Substack draft, and a control page (Google search). Overlay must appear on the first three, NOT the fourth.
4. **Live stats** — type a paragraph in each editor; word count and avg sentence length update without any provider request firing (DevTools Network panel should be silent).
5. **BYOK** — open the popup → "Open settings" → paste a key for one provider → click "Validate & save". A bad key returns red error text; a good key flips to green and (where supported) echoes the model id.
6. **Reading mode** — finish a paragraph in a Notion page; provider request fires once after the commit debounce; the panel renders Voice / Rhythm / Doing / Transition sections.
7. **Interrogation mode** — switch tab to `I`. Finish a sentence; one question card appears with a kind tag (intent / craft / reader). Finish another sentence; the card is replaced (not stacked) and the kind alternates.
8. **Critic mode** — switch tab to `C`. Write a sentence with a known issue (run-on, dangling modifier, comma splice). On Notion / ProseMirror editors: caret chip appears with the issue label. On Google Docs: panel-only rendering with the offending span quoted and underlined.
9. **Rate limiting** — set ceiling to 3 calls/min in code (or burn through your quota); after the third commit in a minute the panel banner reads "Paused to stay under your rate limit — Ns".
10. **History** — toggle history on in settings, work through a doc, click Export JSON. Verify the file contains `stats` and `output` fields and **no** raw paragraph text. Click "Clear all" and confirm it empties.
11. **Cross-browser** — repeat steps 3–8 in Firefox.
12. **Privacy audit** — open DevTools Network on a non-supported page (e.g., `example.com`); confirm no outbound requests come from the extension. Confirm `chrome.storage.sync` is never written.

## Tests

`npm run test` runs Vitest across:

- core utilities (`sentenceSplit`, `debounce`, `docId`, `stats`)
- text streaming and commit detection
- key vault, history store, rate limiter
- AI provider clients (mocked `fetch`) and the `aiClient` orchestrator
- the three mode engines and the JSON parser
- overlay state machine and overlay React rendering
- adapter scaffold and detector
- background request handler and content-script bootstrap

## Privacy

See [PRIVACY.md](./PRIVACY.md). Short version: BYOK, no backend, no telemetry, no analytics.
