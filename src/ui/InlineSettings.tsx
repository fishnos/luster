import { useEffect, useState } from "react";
import { Button } from "@/ui/components/ui/button";
import { Icon } from "@/ui/components/Icon";
import { Switch } from "@/ui/components/ui/switch";
import { ProviderTabs } from "@/ui/components/ProviderTabs";
import { cn } from "@/ui/cn";
import type { ModeName, ProviderId } from "@/core/types";
import { createKeyVault, DEFAULT_MODELS } from "@/core/keyVault";
import { createHistoryStore } from "@/core/history";
import { createBrowserLocalStorage } from "@/core/storageBackend";
import { sendValidateKey } from "@/core/sendRequest";

const PROVIDERS: ProviderId[] = ["gemini", "anthropic", "openai"];
const MODES: ModeName[] = ["reading", "interrogation", "critic", "echo"];

const PROVIDER_LABEL: Record<ProviderId, string> = {
  gemini: "Gemini",
  anthropic: "Claude",
  openai: "OpenAI",
};

const PROVIDER_KEY_URL: Record<ProviderId, string> = {
  gemini: "https://aistudio.google.com/apikey",
  anthropic: "https://console.anthropic.com/settings/keys",
  openai: "https://platform.openai.com/api-keys",
};

const PROVIDER_KEY_HINT: Record<ProviderId, string> = {
  gemini: "AIza…",
  anthropic: "sk-ant-…",
  openai: "sk-…",
};

const MODE_LABEL: Record<ModeName, string> = {
  reading: "Reading",
  interrogation: "Interrogation",
  critic: "Critic",
  echo: "Echo",
};

const MODE_DESCRIPTION: Record<ModeName, string> = {
  reading: "Editor read-back of voice, rhythm, and transitions.",
  interrogation: "Asks craft and intent questions. No critique.",
  critic: "Calls out structural and connection issues live.",
  echo: "Mirrors phrases, images, and concepts you keep returning to.",
};

const storage = createBrowserLocalStorage();
const keyVault = createKeyVault(storage);
const historyStore = createHistoryStore(storage);

type KeyStatus =
  | { tone: "idle" }
  | { tone: "pending" }
  | { tone: "saved"; message: string }
  | { tone: "error"; message: string };

export interface InlineSettingsProps {
  onBack: () => void;
  onConnectionChange: (
    state: "connected" | "missing",
    provider: ProviderId | null,
  ) => void;
  onAutoLaunchChange: (value: boolean) => void;
  onDefaultModeChange: (mode: ModeName) => void;
}

export function InlineSettings({
  onBack,
  onConnectionChange,
  onAutoLaunchChange,
  onDefaultModeChange,
}: InlineSettingsProps) {
  const [provider, setProvider] = useState<ProviderId>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [keyPresent, setKeyPresent] = useState<Record<ProviderId, boolean>>({
    gemini: false,
    anthropic: false,
    openai: false,
  });
  const [models, setModels] = useState<Record<ProviderId, string>>(() => ({
    ...DEFAULT_MODELS,
  }));
  const [status, setStatus] = useState<KeyStatus>({ tone: "idle" });
  const [defaultMode, setDefaultModeState] = useState<ModeName>("reading");
  const [autoLaunch, setAutoLaunchState] = useState(true);
  const [historyEnabled, setHistoryEnabled] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    void hydrate();
    async function hydrate(): Promise<void> {
      const presence: Record<ProviderId, boolean> = {
        gemini: false,
        anthropic: false,
        openai: false,
      };
      const loadedModels: Record<ProviderId, string> = { ...DEFAULT_MODELS };
      for (const entry of PROVIDERS) {
        presence[entry] = await keyVault.hasApiKey(entry);
        loadedModels[entry] = await keyVault.getModel(entry);
      }
      setKeyPresent(presence);
      setModels(loadedModels);
      setProvider(await keyVault.getActiveProvider());
      setDefaultModeState(await keyVault.getDefaultMode());
      setAutoLaunchState(await keyVault.getAutoLaunch());
      setHistoryEnabled(await historyStore.isEnabled());
    }
  }, []);

  async function chooseProvider(next: ProviderId): Promise<void> {
    setProvider(next);
    setStatus({ tone: "idle" });
    setApiKey("");
    await keyVault.setActiveProvider(next);
    if (keyPresent[next]) {
      onConnectionChange("connected", next);
    } else {
      onConnectionChange("missing", next);
    }
  }

  async function saveKey(): Promise<void> {
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
    setApiKey("");
    setKeyPresent((current) => ({ ...current, [provider]: true }));
    setStatus({
      tone: "saved",
      message: result.modelEcho
        ? `Saved · reached ${result.modelEcho}.`
        : "Saved.",
    });
    onConnectionChange("connected", provider);
  }

  async function clearKey(): Promise<void> {
    await keyVault.clearApiKey(provider);
    setKeyPresent((current) => ({ ...current, [provider]: false }));
    setApiKey("");
    setStatus({ tone: "idle" });
    onConnectionChange("missing", provider);
  }

  async function chooseDefaultMode(mode: ModeName): Promise<void> {
    setDefaultModeState(mode);
    await keyVault.setDefaultMode(mode);
    onDefaultModeChange(mode);
  }

  async function changeAutoLaunch(value: boolean): Promise<void> {
    setAutoLaunchState(value);
    await keyVault.setAutoLaunch(value);
    onAutoLaunchChange(value);
  }

  async function commitModel(): Promise<void> {
    const value = models[provider].trim();
    if (!value) return;
    await keyVault.setModel(provider, value);
  }

  async function toggleHistory(): Promise<void> {
    const next = !historyEnabled;
    await historyStore.setEnabled(next);
    setHistoryEnabled(next);
  }

  async function exportHistory(): Promise<void> {
    const exported = await historyStore.exportAll();
    const blob = new Blob([JSON.stringify(exported, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `luster-history-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function clearHistory(): Promise<void> {
    if (!confirm("Clear all per-document history? This cannot be undone."))
      return;
    await historyStore.clear();
  }

  return (
    <div className="space-y-7">
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Back"
          onClick={onBack}
          className="h-6 w-6"
        >
          <Icon name="back" size={14} />
        </Button>
        <span className="luster-eyebrow">Settings</span>
      </div>

      <Section label="Connect">
        <ProviderTabs
          active={provider}
          onSelect={chooseProvider}
          keyPresent={keyPresent}
        />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="luster-eyebrow">API key</span>
            <a
              href={PROVIDER_KEY_URL[provider]}
              target="_blank"
              rel="noreferrer"
              className="luster-btn-text"
            >
              Get a key →
            </a>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={
                keyPresent[provider]
                  ? "•••••• (paste new to replace)"
                  : PROVIDER_KEY_HINT[provider]
              }
              className="luster-mono luster-glass-input luster-input-md flex-1"
            />
            <button
              type="button"
              onClick={saveKey}
              className="luster-btn-primary"
            >
              Save
            </button>
            {keyPresent[provider] && (
              <button
                type="button"
                onClick={clearKey}
                className="luster-btn-secondary"
              >
                Clear
              </button>
            )}
          </div>
          {status.tone !== "idle" && (
            <div
              className={cn(
                "text-[11.5px]",
                status.tone === "pending" && "text-luster-muted",
                status.tone === "saved" && "text-luster-ok",
                status.tone === "error" && "text-luster-err",
              )}
            >
              {status.tone === "pending" ? "Validating…" : status.message}
            </div>
          )}
        </div>
      </Section>

      <Section label="Default mode">
        <div className="space-y-2">
          {MODES.map((mode) => {
            const isActive = defaultMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => chooseDefaultMode(mode)}
                className="luster-press group flex w-full items-start gap-3 text-left"
              >
                <span
                  className={cn(
                    "mt-1.5 h-1.5 w-1.5 rounded-full transition-colors",
                    isActive ? "bg-luster-ink" : "bg-luster-ink4",
                  )}
                />
                <div>
                  <div
                    className={cn(
                      "text-[13px] transition-colors",
                      isActive ? "text-luster-ink" : "text-luster-muted",
                    )}
                  >
                    {MODE_LABEL[mode]}
                  </div>
                  <div className="text-[11.5px] leading-snug text-luster-faint">
                    {MODE_DESCRIPTION[mode]}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      <Section label="On supported pages">
        <Toggle
          checked={autoLaunch}
          onChange={changeAutoLaunch}
          label="Open Luster automatically"
          description="Google Docs, Notion, Substack, Medium, Ghost."
        />
      </Section>

      <details
        open={advancedOpen}
        onToggle={(event) =>
          setAdvancedOpen((event.target as HTMLDetailsElement).open)
        }
        className="group"
      >
        <summary className="luster-press flex cursor-pointer list-none items-center gap-1.5 select-none">
          <span className="luster-eyebrow">Advanced</span>
          <span className="text-luster-faint transition-transform group-open:rotate-90">
            ›
          </span>
        </summary>
        <div className="mt-4 space-y-5">
          <div className="space-y-1.5">
            <div className="luster-eyebrow">
              Model · {PROVIDER_LABEL[provider]}
            </div>
            <input
              type="text"
              value={models[provider]}
              onChange={(event) =>
                setModels((current) => ({
                  ...current,
                  [provider]: event.target.value,
                }))
              }
              onBlur={commitModel}
              className="luster-mono luster-glass-input luster-input-md"
            />
            <div className="luster-eyebrow">
              default {DEFAULT_MODELS[provider]}
            </div>
          </div>

          <div className="space-y-3">
            <Toggle
              checked={historyEnabled}
              onChange={toggleHistory}
              label="Keep per-document history"
              description="Local-only. Never includes your raw text."
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={exportHistory}
                className="luster-btn-text"
              >
                Export JSON
              </button>
              <button
                type="button"
                onClick={clearHistory}
                className="luster-btn-text hover:!text-luster-err"
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="luster-eyebrow">{label}</div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1">
        <div className="text-[13px] text-luster-ink">{label}</div>
        {description && (
          <div className="text-[11px] text-luster-muted">{description}</div>
        )}
      </div>
      <div className="pt-0.5">
        <Switch
          checked={checked}
          onCheckedChange={onChange}
          aria-label={label}
        />
      </div>
    </div>
  );
}
