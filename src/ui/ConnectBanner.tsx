import { useState } from "react";
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
    <div className="space-y-4 pb-2">
      <div className="space-y-1">
        <div className="luster-eyebrow">Connect to start</div>
        <p className="text-[12px] leading-snug text-luster-muted">
          Your key stays on this device.
        </p>
      </div>

      <div className="flex items-center gap-3 text-[13px]">
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
                "luster-press relative pb-1 font-medium transition-colors",
                isActive
                  ? "text-luster-ink"
                  : "text-luster-faint hover:text-luster-muted",
              )}
            >
              {PROVIDER_LABEL[entry]}
              {isActive && (
                <span className="absolute inset-x-0 bottom-0 h-px bg-luster-ink" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void connect();
            }
          }}
          placeholder={PROVIDER_HINT[provider]}
          className="luster-mono luster-glass-input flex-1 px-3 py-2 text-[12.5px]"
        />
        <button
          type="button"
          onClick={connect}
          disabled={status.tone === "pending"}
          className="luster-press h-9 rounded-md bg-luster-ink px-4 text-[12px] font-semibold text-luster-ink0 hover:bg-white disabled:opacity-60"
        >
          {status.tone === "pending" ? "…" : "Connect"}
        </button>
      </div>

      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em]">
        <a
          href={PROVIDER_KEY_URL[provider]}
          target="_blank"
          rel="noreferrer"
          className="text-luster-faint hover:text-luster-ink"
        >
          Get a key →
        </a>
        {status.tone === "error" && (
          <span className="text-luster-err">{status.message}</span>
        )}
      </div>
    </div>
  );
}
