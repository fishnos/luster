# Luster

A browser extension that interrogates your prose as you write.

Three modes:

- **Reading** — collects stats, gives a full editorial read-back of voice, rhythm, devices, and what each paragraph is doing.
- **Interrogation** — asks craft and intent questions without critiquing.
- **Critic** — points out connection and sentence-structure issues live.

For writers polishing prose, style, voice, and English usage.

## Status

Pre-alpha. Active development.

## Stack

WXT + React 19 + TypeScript + Tailwind. Chrome (MV3) and Firefox.

AI is BYOK — the extension never proxies your text through a backend. You bring an Anthropic, OpenAI, or Gemini key and it stays in `chrome.storage.local`.

## Scope

Activates on document editors only:

- Google Docs
- Notion
- Substack / Medium / Ghost (ProseMirror-family)

It does not run on random textareas, search bars, or social inputs.

## Develop

```bash
npm install
npm run dev          # Chrome dev build, watch
npm run dev:firefox  # Firefox dev build, watch
npm run test         # Vitest
npm run build        # Chrome production build
npm run build:firefox
```

Load unpacked from `.output/chrome-mv3` (Chrome) or `.output/firefox-mv2` (Firefox).
