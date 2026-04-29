import { useState } from "react";
import { motion } from "framer-motion";
import type { ProviderId } from "@/core/types";
import { createKeyVault } from "@/core/keyVault";
import { createBrowserLocalStorage } from "@/core/storageBackend";
import { sendValidateKey } from "@/core/sendRequest";
import {
  blurFadeIn,
  easeOutSoft,
  staggerContainer,
} from "@/ui/motion/staggered";
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
      exit={{ opacity: 0, filter: "blur(8px)", transition: { duration: 0.32 } }}
      className="flex flex-col gap-4 px-5 pb-5 pt-6"
    >
      <motion.div variants={blurFadeIn} className="flex flex-col gap-1">
        <span className="luster-eyebrow">Step one</span>
        <h2 className="luster-display text-[18px] leading-tight text-luster-ink">
          Connect a provider
        </h2>
        <p className="text-[12px] leading-snug text-luster-muted">
          Your key is saved on this device. It never leaves the browser.
        </p>
      </motion.div>

      <motion.div
        variants={blurFadeIn}
        className="grid grid-cols-3 gap-1 rounded-lg border border-luster-border bg-white/[0.02] p-1"
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
                "luster-press h-7 rounded text-[11.5px] font-medium transition-colors",
                isActive
                  ? "bg-white/[0.08] text-luster-ink"
                  : "text-luster-muted hover:text-luster-ink-soft",
              )}
            >
              {PROVIDER_LABEL[entry]}
            </button>
          );
        })}
      </motion.div>

      <motion.div variants={blurFadeIn} className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="luster-eyebrow">API key</span>
          <a
            href={PROVIDER_KEY_URL[provider]}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] uppercase tracking-[0.16em] text-luster-muted hover:text-luster-ink-soft transition-colors"
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
          className="luster-mono luster-glass-input w-full px-3 py-2 text-[12.5px]"
        />
      </motion.div>

      {status.tone === "error" && (
        <motion.div
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: easeOutSoft }}
          className="text-[12px] text-luster-err"
        >
          {status.message}
        </motion.div>
      )}

      <motion.button
        variants={blurFadeIn}
        type="button"
        onClick={connect}
        disabled={status.tone === "pending"}
        className={cn(
          "luster-press h-10 w-full rounded-lg text-[13px] font-medium transition-colors",
          "bg-luster-ink text-luster-ink0 hover:bg-white",
          "disabled:opacity-60 disabled:cursor-not-allowed",
        )}
      >
        {status.tone === "pending" ? "Validating…" : "Continue"}
      </motion.button>

      <motion.p
        variants={blurFadeIn}
        className="text-center text-[10px] uppercase tracking-[0.18em] text-luster-faint"
      >
        Then open Google Docs, Notion, Substack, Medium, or Ghost.
      </motion.p>
    </motion.div>
  );
}
