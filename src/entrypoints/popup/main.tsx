import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "@/ui/theme.css";
import { Mark } from "@/ui/components/Mark";
import { Button } from "@/ui/components/ui/button";
import { Icon } from "@/ui/components/Icon";
import { createKeyVault } from "@/core/keyVault";
import { createBrowserLocalStorage } from "@/core/storageBackend";
import type { ProviderId } from "@/core/types";

const PROVIDER_LABEL: Record<ProviderId, string> = {
  gemini: "Gemini",
  anthropic: "Claude",
  openai: "OpenAI",
};

const SUPPORTED_HOSTS: { label: string; matcher: RegExp }[] = [
  { label: "Google Docs", matcher: /^https:\/\/docs\.google\.com\/document\// },
  {
    label: "Notion",
    matcher: /^https:\/\/(www\.notion\.so|.+\.notion\.site)\//,
  },
  {
    label: "Substack draft",
    matcher: /^https:\/\/.+\.substack\.com\/publish\//,
  },
  { label: "Medium", matcher: /^https:\/\/(.+\.)?medium\.com\// },
  { label: "Ghost", matcher: /^https:\/\/.+\.ghost\.io\// },
];

const keyVault = createKeyVault(createBrowserLocalStorage());

function Popup() {
  const [activeProvider, setActiveProvider] = useState<ProviderId>("gemini");
  const [hasKey, setHasKey] = useState(false);
  const [tabSupported, setTabSupported] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void hydrate();
    async function hydrate(): Promise<void> {
      const provider = await keyVault.getActiveProvider();
      setActiveProvider(provider);
      setHasKey(await keyVault.hasApiKey(provider));
      try {
        const tabs = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        const url = tabs[0]?.url ?? "";
        setTabSupported(
          SUPPORTED_HOSTS.some((entry) => entry.matcher.test(url)),
        );
      } catch {
        setTabSupported(false);
      }
      setLoaded(true);
    }
  }, []);

  function openOptions(): void {
    browser.runtime.openOptionsPage();
  }

  return (
    <div className="luster-root w-[300px] bg-luster-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Mark size={26} />
        <div>
          <div className="luster-serif text-luster-ink text-[16px] leading-none">
            Luster
          </div>
          <div className="text-luster-muted text-[11px] mt-1">
            Editor for your prose, in your editor.
          </div>
        </div>
      </div>

      <div className="rounded-md border border-luster-border bg-luster-surface p-3 text-[12px] space-y-1.5">
        {!loaded ? (
          <span className="text-luster-muted">Loading…</span>
        ) : (
          <>
            <Row
              label="AI"
              value={
                hasKey ? (
                  <span className="text-luster-ok">
                    Connected · {PROVIDER_LABEL[activeProvider]}
                  </span>
                ) : (
                  <span className="text-luster-warn">Not connected</span>
                )
              }
            />
            <Row
              label="This page"
              value={
                tabSupported ? (
                  <span className="text-luster-ok">Supported editor</span>
                ) : (
                  <span className="text-luster-muted">
                    Open a supported editor
                  </span>
                )
              }
            />
          </>
        )}
      </div>

      <Button
        variant="default"
        size="sm"
        onClick={openOptions}
        className="w-full"
      >
        {hasKey ? "Open settings" : "Connect to AI"}{" "}
        <Icon name="arrow-right" size={12} className="ml-1" />
      </Button>

      <div className="text-[10px] text-luster-faint leading-snug">
        Once connected, the panel auto-launches inside Google Docs, Notion,
        Substack, Medium, and Ghost editors.
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-luster-faint uppercase tracking-[0.14em] text-[10px]">
        {label}
      </span>
      <span>{value}</span>
    </div>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<Popup />);
