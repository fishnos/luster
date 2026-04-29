import { useState } from "react";
import type { ProviderId } from "@/core/types";
import { sendValidateKey } from "@/core/sendRequest";
import { createKeyVault } from "@/core/keyVault";
import { createBrowserLocalStorage } from "@/core/storageBackend";
import { ProviderTabs } from "@/ui/components/ProviderTabs";

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

      <ProviderTabs
        active={provider}
        onSelect={(next) => {
          setProvider(next);
          setStatus({ tone: "idle" });
        }}
      />

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
          className="luster-mono luster-glass-input luster-input-md flex-1"
        />
        <button
          type="button"
          onClick={connect}
          disabled={status.tone === "pending"}
          className="luster-btn-primary"
        >
          {status.tone === "pending" ? "…" : "Connect"}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <a
          href={PROVIDER_KEY_URL[provider]}
          target="_blank"
          rel="noreferrer"
          className="luster-btn-text"
        >
          Get a key →
        </a>
        {status.tone === "error" && (
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-luster-err">
            {status.message}
          </span>
        )}
      </div>
    </div>
  );
}
