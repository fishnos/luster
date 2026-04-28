# Luster Privacy Policy

_Last updated: 2026-04-28_

Luster is a browser extension that helps you analyze and improve your own writing. We take privacy seriously because the input we work with — your draft prose — is sensitive by default.

## What Luster does

When you open a supported document editor (Google Docs, Notion, Substack, Medium, or Ghost), Luster reads the text you are currently writing in that document. It computes local statistics (word counts, sentence lengths, readability score) and — when you ask one of the three modes to run — it sends the relevant portion of your draft to the AI provider you have configured.

## What Luster does **not** do

- Luster has no backend. It does not contact any server controlled by the developer.
- Luster does not collect analytics, telemetry, crash reports, or usage data.
- Luster does not transmit, read, or fingerprint your browsing on pages other than the supported editor URLs listed in the manifest.
- Luster does not sell, rent, or share any data.

## Where your data goes

- **Document text** is sent only to the AI provider you have configured in Luster's settings, using the API key you provided. The destinations are the official APIs of:
  - Anthropic (`api.anthropic.com`)
  - OpenAI (`api.openai.com`)
  - Google Gemini (`generativelanguage.googleapis.com`)
- **API keys** are stored locally in your browser via `chrome.storage.local`. They never leave your machine except as authentication headers on the calls above.
- **History** (optional, off by default) stores sentence-level statistics and AI responses in `chrome.storage.local`. It does not store the raw document text. You can export it to a JSON file or clear it at any time from Luster's settings page.

## Your control

- You can disable Luster on any site by removing or revoking host permissions from your browser's extension manager.
- You can clear all stored data by clicking "Clear all" in the History section of Luster settings, or by uninstalling the extension.
- You can revoke your API keys directly with the upstream provider at any time.

## Third-party providers

Each AI provider you enable has its own privacy policy and data-handling practices. Luster does not negotiate or modify their terms on your behalf. Please review:

- Anthropic: https://www.anthropic.com/legal/privacy
- OpenAI: https://openai.com/policies/privacy-policy
- Google: https://policies.google.com/privacy

## Contact

Issues and questions: https://github.com/anthropics/claude-code/issues (placeholder — replace with your own repo before publishing).
