import type { HostKind } from "@/ui/state";
import { Button } from "@/ui/components/Button";
import { Icon } from "@/ui/components/Icon";
import { diagnoseGoogleDocs } from "@/adapters/google-docs";

export interface EditorHintProps {
  hostKind: HostKind;
}

export function EditorHint({ hostKind }: EditorHintProps) {
  const hint = HINTS[hostKind] ?? HINTS.unknown;

  function reload(): void {
    window.location.reload();
  }

  function runDiagnostic(): void {
    const result = diagnoseGoogleDocs();
    // eslint-disable-next-line no-console
    console.log("[Luster] Google Docs diagnostic:", result);

    const matchedSelectors = Object.entries(result.selectorCounts)
      .filter(([, count]) => count > 0)
      .map(([selector, count]) => `  ${selector} → ${count}`)
      .join("\n");

    const textboxLines = result.textboxes
      .map(
        (entry, index) =>
          `  [${index}] aria="${entry.aria}" multiline=${entry.multiline} editable=${entry.contentEditable} textLen=${entry.textLength}` +
          (entry.sample ? `\n      sample: ${entry.sample}` : ""),
      )
      .join("\n");

    const regionLines = result.regions
      .map(
        (entry, index) =>
          `  [${index}] aria="${entry.aria}" textLen=${entry.textLength}`,
      )
      .join("\n");

    const iframeLines = result.iframes
      .map(
        (frame, index) =>
          `  [${index}] src=${frame.src || "(blank)"} sameOrigin=${frame.sameOrigin}`,
      )
      .join("\n");

    alert(
      [
        "Luster diagnostic — Google Docs",
        "",
        "Matched selectors:",
        matchedSelectors || "  (none)",
        "",
        `[role="textbox"] elements (${result.textboxes.length}):`,
        textboxLines || "  (none)",
        "",
        `[role="region"] elements with aria-label (${result.regions.length}):`,
        regionLines || "  (none)",
        "",
        `contenteditable=true elements: ${result.contenteditables}`,
        `kix-/docs-* class tokens: ${result.kixClasses.length}`,
        `iframes (${result.iframes.length}):`,
        iframeLines || "  (none)",
        "",
        "Full diagnostic logged to DevTools console.",
      ].join("\n"),
    );
  }

  return (
    <div className="rounded-md border border-luster-border bg-luster-accent-soft px-3 py-2.5 space-y-2">
      <div className="flex items-center gap-2 text-luster-accent">
        <Icon name="sparkle" size={13} />
        <span className="text-[12px] font-medium">{hint.title}</span>
      </div>
      <p className="text-[12px] text-luster-ink-soft leading-snug">
        {hint.body}
      </p>
      {hint.steps && (
        <ol className="text-[12px] text-luster-ink-soft list-decimal pl-4 space-y-0.5">
          {hint.steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      )}
      {hint.fallback && (
        <p className="text-[11px] text-luster-muted leading-snug pt-1 border-t border-luster-border">
          {hint.fallback}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {hostKind === "google-docs" && (
          <>
            <Button variant="primary" size="sm" onClick={reload}>
              Reload tab
            </Button>
            <Button variant="outline" size="sm" onClick={runDiagnostic}>
              Diagnose
            </Button>
          </>
        )}
        {hint.link && (
          <a
            href={hint.link.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 text-[12px] text-luster-accent hover:underline"
          >
            {hint.link.label} <Icon name="arrow-right" size={12} />
          </a>
        )}
      </div>
    </div>
  );
}

interface Hint {
  title: string;
  body: string;
  steps?: string[];
  fallback?: string;
  link?: { label: string; href: string };
}

const HINTS: Record<HostKind, Hint> = {
  "google-docs": {
    title: "Google Docs (Editor 2.0) is hostile to extensions",
    body: 'Docs renders to canvas and only mirrors text into the DOM when Chrome itself is in accessibility mode. Toggling "screen reader support" inside Docs alone is not enough.',
    steps: [
      "On macOS: turn on VoiceOver (Cmd+F5), reload this tab, then turn VoiceOver off again — the DOM mirror stays.",
      'Or visit chrome://accessibility/ → check "Native accessibility API support" → toggle this tab\'s row on, then reload.',
      "After reloading, click into the document so it gets focus.",
    ],
    fallback:
      "Honest take: Notion, Substack, Medium, and Ghost work without any of this. Google Docs may stop working again whenever Google ships a new editor version.",
    link: {
      label: "Background on Docs accessibility",
      href: "https://support.google.com/docs/answer/6282736",
    },
  },
  notion: {
    title: "Open a Notion page with text",
    body: "Luster reads Notion blocks once a page with at least one paragraph is open. Click into a real page (not the sidebar or a database row), then come back here.",
  },
  prosemirror: {
    title: "Open a draft to begin",
    body: "On Substack, Medium, and Ghost, Luster activates inside the post editor. Open a draft (not the dashboard) and the panel will pick it up.",
  },
  unknown: {
    title: "Open a supported editor",
    body: "Luster runs reliably inside Notion, Substack, Medium, and Ghost editors. Google Docs requires accessibility mode in Chrome to read text.",
  },
};
