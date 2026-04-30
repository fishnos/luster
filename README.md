<p align="left">
  <img src="./assets/luster-mark.svg" alt="Luster" width="72" height="72" />
</p>

# Luster

_An editorial console for your draft._ A browser extension that interrogates your prose as you write — voice, rhythm, structure, repetition — without ever leaving the page.

Three modes:

- **Reading** — editorial read-back: voice, rhythm, paragraph purpose, transitions.
- **Interrogation** — craft and intent questions, no critique.
- **Critic** — live structure and clarity issues with span-level highlights.

BYOK: your Anthropic, OpenAI, or Gemini key stays in `chrome.storage.local`. No backend, no telemetry. See [PRIVACY.md](./PRIVACY.md).

## Stack

WXT · React 19 · TypeScript · Tailwind. Targets Chrome (MV3) and Firefox (MV2).

## Scope

Activates on document editors only:

- Google Docs (`docs.google.com/document/*`)
- Notion (`*.notion.so`, `*.notion.site`)
- Substack / Medium / Ghost (ProseMirror-family)

## Run locally

```bash
npm install
npm run dev          # Chrome, watch
npm run dev:firefox  # Firefox, watch
```

WXT auto-launches a browser with the extension loaded. To load manually:

- Chrome — `chrome://extensions` → Developer mode → Load unpacked → `.output/chrome-mv3`
- Firefox — `about:debugging` → Load Temporary Add-on → `.output/firefox-mv2/manifest.json`

## Build

```bash
npm run build              # Chrome production
npm run build:firefox      # Firefox production
npm run zip                # Chrome Web Store zip
npm run zip:firefox        # AMO xpi
```

Artifacts land in `.output/`.

## Test

```bash
npm run compile  # tsc --noEmit
npm run test     # vitest
```

## First-run check

After loading the extension, open the popup → connect a provider → paste a key → save. Open a Google Doc / Notion page / Substack draft; the overlay should mount. On any unsupported page (e.g. `example.com`) it must not run.
