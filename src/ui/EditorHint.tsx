import type { HostKind } from "@/ui/state";
import { Icon } from "@/ui/components/Icon";
import { diagnoseGoogleDocs, probeBridge } from "@/adapters/google-docs";

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
      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] uppercase tracking-[0.14em]">
        {hostKind === "google-docs" && (
          <>
            <button
              type="button"
              onClick={reload}
              className="luster-press text-luster-ink hover:text-white"
            >
              Reload tab →
            </button>
            <button
              type="button"
              onClick={() => {
                void runDocsDiagnostic();
              }}
              className="luster-press text-luster-faint hover:text-luster-ink"
            >
              Diagnose
            </button>
          </>
        )}
        {hint.link && (
          <a
            href={hint.link.href}
            target="_blank"
            rel="noreferrer"
            className="luster-press text-luster-faint hover:text-luster-ink"
          >
            {hint.link.label} →
          </a>
        )}
      </div>
    </div>
  );
}

export async function runDocsDiagnostic(): Promise<void> {
  const probe = await probeBridge(400);
  const dom = diagnoseGoogleDocs();
  // eslint-disable-next-line no-console
  console.log("[Luster] Google Docs diagnostic:", { probe, dom });

  if (!probe) {
    alert(
      [
        "Luster diagnostic — bridge NOT responding",
        "",
        "The main-world canvas bridge isn't installed (or it crashed).",
        "Most likely causes:",
        "  · The extension hasn't been reloaded since the last update.",
        "  · A CSP / extension-conflict blocked the document_start script.",
        "  · You're on a build of Chrome that doesn't honor world: 'MAIN'.",
        "",
        "Reload the tab and try again. If it still fails, open the",
        'Service Worker console at chrome://extensions/ → Luster → "service worker"',
        "and check for errors.",
        "",
        `DOM-level signals: kix/docs classes=${dom.kixClasses.length}, contenteditables=${dom.contenteditables}.`,
      ].join("\n"),
    );
    return;
  }

  const conclusion = describeProbe(probe);

  const canvasLines =
    probe.candidateCanvases.length === 0
      ? "  (no canvases received fillText calls yet — type into the doc and re-run)"
      : probe.candidateCanvases
          .map((canvas, index) =>
            [
              `  [${index}] ${canvas.width}×${canvas.height} hits=${canvas.fillTextHits} editor=${canvas.isEditor ? "yes" : "no"}`,
              `      class:    ${canvas.classChain || "(none)"}`,
              `      ancestors: ${canvas.ancestorClasses}`,
            ].join("\n"),
          )
          .join("\n");

  const sampleLine = probe.lastReconstructedSample
    ? `  sample: "${probe.lastReconstructedSample}"`
    : "  sample: (empty)";

  alert(
    [
      "Luster diagnostic — canvas bridge",
      "",
      conclusion,
      "",
      "Latest reconstruction:",
      `  ${probe.lastReconstructedTextLength} chars / ${probe.lastReconstructedParagraphCount} paragraphs`,
      sampleLine,
      "",
      "Counters:",
      `  fillText calls       ${probe.fillTextCalls}`,
      `  strokeText calls     ${probe.strokeTextCalls}`,
      `  clearRect calls      ${probe.clearRectCalls}`,
      `  total canvases       ${probe.totalCanvases}`,
      `  tracked editor       ${probe.trackedEditorCanvases}`,
      `  glyphs in buffer     ${probe.totalGlyphs}`,
      `  reconstructed chars  ${probe.lastReconstructedTextLength}`,
      `  reconstructed paras  ${probe.lastReconstructedParagraphCount}`,
      `  bridge state         ${probe.bridgeState}`,
      `  KX_kixApp present    ${probe.hasKixApp ? "yes" : "no"}`,
      `  .kix-cursor present  ${probe.caretSelectorPresent ? "yes" : "no"}`,
      "",
      `Candidate canvases (${probe.candidateCanvases.length}):`,
      canvasLines,
      "",
      `DOM signals: kix/docs class tokens=${dom.kixClasses.length}, contenteditables=${dom.contenteditables}`,
      "",
      "Full diagnostic logged to DevTools console.",
    ].join("\n"),
  );
}

function describeProbe(
  probe: NonNullable<Awaited<ReturnType<typeof probeBridge>>>,
): string {
  if (probe.fillTextCalls === 0) {
    return [
      "❌ Bridge installed but caught zero fillText calls.",
      "   → Either Docs hasn't painted yet, or the canvas world hooks aren't intercepting.",
      "   Try typing a character in the doc and run Diagnose again.",
    ].join("\n");
  }
  if (probe.trackedEditorCanvases === 0) {
    return [
      "⚠️ fillText is firing but no editor canvas was matched.",
      "   → The .kix-rotatingtilemanager-content selector isn't finding the editor.",
      "   Docs may be using a new wrapper class. Paste this dialog back to me.",
    ].join("\n");
  }
  if (probe.totalGlyphs === 0) {
    return [
      "⚠️ Editor canvases tracked but glyph buffer is empty.",
      "   → clearRect is wiping the buffer faster than fillText fills it.",
      "   Type a character and run Diagnose right after.",
    ].join("\n");
  }
  if (probe.lastReconstructedTextLength === 0) {
    return [
      "⚠️ Glyphs captured but reconstruction produced empty text.",
      "   → Probably a glyph-clustering bug. Paste this dialog back to me.",
    ].join("\n");
  }
  return [
    "✅ Bridge is alive and reading text.",
    `   ${probe.lastReconstructedTextLength} chars across ${probe.lastReconstructedParagraphCount} paragraphs.`,
    "   If the panel still shows 0 words, the postMessage handoff to the panel is broken — that's a different bug; tell me.",
  ].join("\n");
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
    title: "Reading Google Docs via canvas bridge",
    body: "Luster intercepts Docs' canvas drawing to read your text. If the bridge can't capture anything, click Diagnose to see exactly what's happening.",
    steps: [
      "Click into the document so it has focus.",
      "Type a character so the canvas paints.",
      "Click Diagnose to see the bridge counters.",
    ],
    fallback:
      "If Diagnose reports the bridge is silent, reload the tab. The main-world script needs to attach before Docs paints.",
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
    body: "Luster runs reliably inside Notion, Substack, Medium, and Ghost editors. Google Docs requires its canvas bridge — open a Doc to test it.",
  },
};
