import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "@/ui/theme.css";
import { Button } from "@/ui/components/Button";
import { createKeyVault } from "@/core/keyVault";
import { createBrowserLocalStorage } from "@/core/storageBackend";
import type { ProviderId } from "@/core/types";

const PROVIDERS: ProviderId[] = ["anthropic", "openai", "gemini"];

const PROVIDER_LABELS: Record<ProviderId, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Gemini",
};

const keyVault = createKeyVault(createBrowserLocalStorage());

function Popup() {
  const [providersWithKey, setProvidersWithKey] = useState<ProviderId[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void keyVault.listProvidersWithKey().then((list) => {
      setProvidersWithKey(list);
      setLoaded(true);
    });
  }, []);

  function openOptions(): void {
    browser.runtime.openOptionsPage();
  }

  return (
    <div className="luster-root w-[280px] bg-luster-bg p-4 space-y-3">
      <div>
        <div className="font-serif text-luster-accent text-lg">Luster</div>
        <div className="text-luster-muted text-xs">
          Open a Google Doc, Notion page, or Substack/Medium/Ghost draft.
        </div>
      </div>

      <div className="rounded border border-luster-border bg-luster-panel p-2 text-xs space-y-1">
        <div className="text-luster-muted text-[10px] uppercase tracking-wider">
          API keys
        </div>
        {!loaded && <div className="text-luster-muted">Loading…</div>}
        {loaded &&
          PROVIDERS.map((provider) => {
            const present = providersWithKey.includes(provider);
            return (
              <div key={provider} className="flex justify-between">
                <span>{PROVIDER_LABELS[provider]}</span>
                <span
                  className={present ? "text-luster-ok" : "text-luster-muted"}
                >
                  {present ? "set" : "missing"}
                </span>
              </div>
            );
          })}
      </div>

      <Button variant="solid" className="w-full" onClick={openOptions}>
        Open settings
      </Button>
    </div>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<Popup />);
