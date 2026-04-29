import { useState } from "react";
import { motion } from "framer-motion";
import type { ProviderId } from "@/core/types";
import { createKeyVault } from "@/core/keyVault";
import { createBrowserLocalStorage } from "@/core/storageBackend";
import { sendValidateKey } from "@/core/sendRequest";
import { blurFadeIn, staggerContainer } from "@/ui/motion/staggered";
import { cn } from "@/ui/cn";

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

export interface WelcomeSetupProps {
  onComplete: (provider: ProviderId) => void;
}

export function WelcomeSetup({ onComplete }: WelcomeSetupProps) {
  const [provider, setProvider] = useState<ProviderId>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<Status>({ tone: "idle" });

  async function connect(): Promise<void> {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setStatus({ tone: "error", message: "Paste a key to continue." });
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
    onComplete(provider);
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, transition: { duration: 0.24 } }}
      className="flex flex-col gap-6 px-6 pb-7 pt-8"
    >
      <motion.div variants={blurFadeIn} className="flex flex-col gap-1.5">
        <span className="luster-eyebrow">Step one</span>
        <h2 className="luster-display text-[20px] leading-tight">
          Connect a provider
        </h2>
      </motion.div>

      <motion.div
        variants={blurFadeIn}
        className="flex items-center gap-4 text-[13px]"
      >
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
      </motion.div>

      <motion.div variants={blurFadeIn} className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="luster-eyebrow">API key</span>
          <a
            href={PROVIDER_KEY_URL[provider]}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] uppercase tracking-[0.16em] text-luster-faint hover:text-luster-ink"
          >
            Get a key →
          </a>
        </div>
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
          autoFocus
          className="luster-mono luster-glass-input w-full px-3 py-2.5 text-[13px]"
        />
        {status.tone === "error" && (
          <span className="text-[11.5px] text-luster-err">
            {status.message}
          </span>
        )}
      </motion.div>

      <motion.button
        variants={blurFadeIn}
        type="button"
        onClick={connect}
        disabled={status.tone === "pending"}
        className={cn(
          "luster-press inline-flex items-center gap-1.5 self-start text-[14px] font-semibold text-luster-ink",
          "border-b border-luster-ink pb-0.5",
          "disabled:opacity-60 disabled:cursor-not-allowed",
        )}
      >
        {status.tone === "pending" ? "Validating…" : "Continue"}
        <span aria-hidden>→</span>
      </motion.button>

      <motion.p
        variants={blurFadeIn}
        className="text-[11px] leading-relaxed text-luster-faint"
      >
        Then open Google Docs, Notion, Substack, Medium, or Ghost.
      </motion.p>
    </motion.div>
  );
}
