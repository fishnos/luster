import type { HostKind } from "@/ui/state";
import { Icon } from "@/ui/components/Icon";

export interface EditorHintProps {
  hostKind: HostKind;
}

export function EditorHint({ hostKind }: EditorHintProps) {
  const hint = HINTS[hostKind] ?? HINTS.unknown;

  function reload(): void {
    window.location.reload();
  }

  return (
    <div className="space-y-2 border-l-2 border-luster-border-strong pl-3">
      <div className="flex items-center gap-2">
        <Icon name="sparkle" size={12} className="text-luster-ink-soft" />
        <span className="text-[12px] font-medium text-luster-ink">
          {hint.title}
        </span>
      </div>
      <p className="text-[12px] leading-snug text-luster-muted">{hint.body}</p>
      {hint.steps && (
        <ol className="list-decimal space-y-0.5 pl-4 text-[12px] text-luster-muted">
          {hint.steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      )}
      {hint.fallback && (
        <p className="pt-1 text-[11px] leading-snug text-luster-faint">
          {hint.fallback}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        {hostKind === "google-docs" && (
          <button
            type="button"
            onClick={reload}
            className="luster-btn-text !text-luster-ink"
          >
            Reload tab →
          </button>
        )}
        {hint.link && (
          <a
            href={hint.link.href}
            target="_blank"
            rel="noreferrer"
            className="luster-btn-text"
          >
            {hint.link.label} →
          </a>
        )}
      </div>
    </div>
  );
}

export async function runDocsDiagnostic(): Promise<void> {
  // deprecated; not used
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
    title: "Open a Google Doc to begin",
    body: "Luster reads Google Docs through Google's official Docs API. Connect once and Luster will keep your word count in sync as you write.",
    fallback:
      "If the panel still says nothing's happening after connecting, reload the tab so Luster can re-attach.",
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
    body: "Luster runs in Google Docs, Notion, Substack, Medium, and Ghost. Open one of those to begin.",
  },
};
