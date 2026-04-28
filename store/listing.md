# Store listing copy

## Short description (Chrome 132 chars max, AMO 250 chars max)

Three modes that interrogate your prose as you write — workshop notes, Socratic questions, and live structural critique. Bring your own AI key.

## Long description

Luster is a writing companion for people who care about prose. It runs alongside your existing editor — Google Docs, Notion, Substack, Medium, or Ghost — and offers three modes that pressure-test your draft as you write it.

**Reading mode** acts as a senior editor doing a workshop read-back. As each paragraph lands, it observes voice, rhythm, what the paragraph is doing, and how it transitions from the previous one. No empty praise, no rewrites — just specific observations that help you see your own work.

**Interrogation mode** asks questions and only questions. Some probe what you actually mean, some probe your craft choices, some stand in for a confused reader. Never a critique disguised as a leading question.

**Critic mode** points out connection breaks and sentence-structure issues with severity tiers and span-level highlighting on the offending phrase. Run-ons, dangling modifiers, vague antecedents — surfaced in real time without rewriting your sentence.

**Privacy and control:**

- Bring your own API key (Anthropic, OpenAI, or Gemini).
- No backend. No telemetry. Keys stay in `chrome.storage.local`.
- History is opt-in and never includes raw document text.
- Activates only on supported document editors — never on random textareas.

**Local-first stats:**
Live word counts, average sentence length, readability grade, passive ratio, and repeated-opener flags update without any AI call.

Free. Closed-source for now.

## Categories

- Productivity
- Writing tools

## Tags / keywords

writing, editing, prose, AI, BYOK, anthropic, openai, gemini, google docs, notion, substack, medium, ghost

## Permissions justifications

- `storage` — store your API keys, model preferences, and (optional) per-document history locally.
- `activeTab` — let the popup confirm which tab is active before opening Luster's settings.
- `host_permissions` (docs.google.com, www.notion.so, _.notion.site, _.substack.com, medium.com, _.medium.com, _.ghost.io) — necessary to read your draft text and render the overlay inside these supported editors only.

## Support / homepage

- Privacy policy: see PRIVACY.md in the repo
- Issues: replace with your own repo URL before publishing
