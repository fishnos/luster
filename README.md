<p align="center">
  <img src="./public/icons/Lux-Softworks-Tinted.png" alt="Lux Softworks" width="96" />
</p>

<h1 align="center">Luster</h1>

<p align="center">
  An editorial console for your draft. Reads your prose as you write — voice, rhythm, structure — without leaving the page.
</p>

<p align="center">
  <img alt="version" src="https://img.shields.io/badge/version-1.1.0-1f1f1f?style=flat-square">
  <img alt="MV3 / MV2" src="https://img.shields.io/badge/Chrome%20MV3%20%7C%20Firefox%20MV2-1f1f1f?style=flat-square">
  <img alt="BYOK" src="https://img.shields.io/badge/BYOK-Anthropic%20%7C%20OpenAI%20%7C%20Gemini-1f1f1f?style=flat-square">
  <img alt="local-only" src="https://img.shields.io/badge/local%20only-no%20telemetry-1f1f1f?style=flat-square">
</p>

---

## What it does

Four lenses on the same draft:

- **Reading** — editorial read-back of voice, rhythm, transitions.
- **Interrogation** — craft and intent questions. No critique.
- **Critic** — structural and clarity issues, called out live.
- **Echo** — phrases and images you keep returning to.

Where it works: Google Docs, Notion, Substack, Medium, Ghost.

## How it stays out of the way

Bring your own key (Anthropic, OpenAI, or Gemini). The key sits in `chrome.storage.local`. No backend. No telemetry. Read [PRIVACY.md](./PRIVACY.md).

## Run it

```bash
npm install
npm run dev            # Chrome
npm run dev:firefox    # Firefox
```

WXT opens a browser with the extension loaded. To load it by hand:

- **Chrome** — `chrome://extensions` → Developer mode → Load unpacked → `.output/chrome-mv3`
- **Firefox** — `about:debugging` → Load Temporary Add-on → `.output/firefox-mv2/manifest.json`

## Build

```bash
npm run build           # Chrome
npm run build:firefox   # Firefox
npm run zip             # Web Store zip
npm run zip:firefox     # AMO xpi
```

Artifacts land in `.output/`.

## Check it

```bash
npm run compile   # tsc --noEmit
npm run test      # vitest
```

---

<sub>Built with WXT · React 19 · TypeScript · Tailwind. A Lux Softworks project.</sub>
