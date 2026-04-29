import { useState } from "react";
import { Button } from "@/ui/components/ui/button";
import { Icon } from "@/ui/components/Icon";
import { cn } from "@/ui/cn";
import type { ProviderId } from "@/core/types";
import { sendValidateKey } from "@/core/sendRequest";
import { createKeyVault } from "@/core/keyVault";
import { createBrowserLocalStorage } from "@/core/storageBackend";

const PROVIDERS: ProviderId[] = ["gemini", "anthropic", "openai"];

const PROVIDER_LABEL: Record<ProviderId, string> = {
  gemini: "Gemini",
  anthropic: "Claude",
  openai: "OpenAI",
};

const PROVIDER_HINT: Record<ProviderId, string> = {
  gemini: "AIza…",
  anthropic: "sk-ant-…",
  openai: "sk-…",
};

const PROVIDER_KEY_URL: Record<ProviderId, string> = {
  gemini: "https://aistudio.google.com/apikey",
  anthropic: "https://console.anthropic.com/settings/keys",
  openai: "https://platform.openai.com/api-keys",
};

const PROVIDER_BLURB: Record<ProviderId, string> = {
  gemini: "Free tier — 15 req/min on Gemini Flash.",
  anthropic: "Strongest for the editorial Reading mode.",
  openai: "Solid all-rounder. Pay-per-token.",
};

const keyVault = createKeyVault(createBrowserLocalStorage());

type Status =
  | { tone: "idle" }
  | { tone: "pending" }
  | { tone: "error"; message: string };

export interface ConnectBannerProps {
  onConnected: (provider: ProviderId) => void;
}

export function ConnectBanner({ onConnected }: ConnectBannerProps) {
  const [provider, setProvider] = useState<ProviderId>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<Status>({ tone: "idle" });

  async function connect(): Promise<void> {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setStatus({ tone: "error", message: "Paste a key first." });
      return;
    }
    setStatus({ tone: "pending" });
    const result = await sendValidateKey({ provider, apiKey: trimmed });
    if (!result.ok) {
      setStatus({
        tone: "error",
        message: result.error ?? "Validation failed.",
      });
      return;
    }
    await keyVault.setApiKey(provider, trimmed);
    await keyVault.setActiveProvider(provider);
    setApiKey("");
    setStatus({ tone: "idle" });
    onConnected(provider);
  }

  return (
    <div className="rounded-md border border-luster-border bg-luster-card overflow-hidden">
      <div className="bg-luster-accent-soft px-3 py-2.5 border-b border-luster-border">
        <div className="flex items-center gap-2 text-luster-accent">
          <Icon name="sparkle" size={14} />
          <span className="text-[12px] font-medium">
            Connect to AI to start
          </span>
        </div>
        <p className="text-[12px] text-luster-muted mt-1">
          Your key stays on this device. Pick a provider and paste a key to
          begin.
        </p>
      </div>

      <div className="px-3 py-3 space-y-3">
        <div className="grid grid-cols-3 gap-1 rounded-md bg-luster-surface p-1 border border-luster-border">
          {PROVIDERS.map((entry) => {
            const isActive = entry === provider;
            return (
              <button
                key={entry}
                type="button"
                onClick={() => {
                  setProvider(entry);
                  setStatus({ tone: "idle" });
                }}
                className={cn(
                  "luster-press h-7 rounded text-[12px] font-medium transition-colors",
                  isActive
                    ? "bg-luster-card text-luster-ink shadow-[0_1px_0_rgba(26,24,22,0.05),0_0_0_1px_rgba(26,24,22,0.06)]"
                    : "text-luster-muted hover:text-luster-ink",
                )}
              >
                {PROVIDER_LABEL[entry]}
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-luster-muted">
          {PROVIDER_BLURB[provider]}
        </p>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <label className="text-luster-faint uppercase tracking-[0.14em]">
              API key
            </label>
            <a
              href={PROVIDER_KEY_URL[provider]}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-luster-accent hover:underline"
            >
              Get a key <Icon name="arrow-right" size={12} />
            </a>
          </div>
          <input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={PROVIDER_HINT[provider]}
            className="luster-mono w-full rounded-md border border-luster-border bg-luster-card px-2.5 py-1.5 text-[12px] text-luster-ink placeholder:text-luster-faint focus:border-luster-accent focus:outline-none"
          />
        </div>

        {status.tone === "error" && (
          <div className="text-[12px] text-luster-err">{status.message}</div>
        )}

        <Button
          variant="default"
          size="sm"
          onClick={connect}
          disabled={status.tone === "pending"}
          className="w-full"
        >
          {status.tone === "pending" ? "Validating…" : "Connect"}
        </Button>
      </div>
    </div>
  );
}
