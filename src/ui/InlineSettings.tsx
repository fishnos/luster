import { useEffect, useState } from "react";
import { Button } from "@/ui/components/Button";
import { Icon } from "@/ui/components/Icon";
import { Switch } from "@/ui/components/Switch";
import { cn } from "@/ui/cn";
import type { ModeName, ProviderId } from "@/core/types";
import { createKeyVault, DEFAULT_MODELS } from "@/core/keyVault";
import { createHistoryStore } from "@/core/history";
import { createBrowserLocalStorage } from "@/core/storageBackend";
import { sendValidateKey } from "@/core/sendRequest";

const PROVIDERS: ProviderId[] = ["gemini", "anthropic", "openai"];
const MODES: ModeName[] = ["reading", "interrogation", "critic"];

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
};

const MODE_DESCRIPTION: Record<ModeName, string> = {
  reading: "Editor read-back of voice, rhythm, and transitions.",
  interrogation: "Asks craft and intent questions. No critique.",
  critic: "Calls out structural and connection issues live.",
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
    <div className="space-y-3">
      <div className="flex items-center gap-1 text-[12px] text-luster-muted">
        <Button variant="icon" aria-label="Back" onClick={onBack}>
          <Icon name="back" size={14} />
        </Button>
        <span className="font-medium uppercase tracking-[0.14em] text-[10px] text-luster-faint">
          Settings
        </span>
      </div>

      <Section label="Connect">
        <div className="grid grid-cols-3 gap-1 rounded-md bg-luster-surface p-1 border border-luster-border">
          {PROVIDERS.map((entry) => {
            const isActive = entry === provider;
            return (
              <button
                key={entry}
                type="button"
                onClick={() => chooseProvider(entry)}
                className={cn(
                  "luster-press relative h-7 rounded text-[12px] font-medium transition-colors",
                  isActive
                    ? "bg-luster-card text-luster-ink shadow-[0_1px_0_rgba(26,24,22,0.05),0_0_0_1px_rgba(26,24,22,0.06)]"
                    : "text-luster-muted hover:text-luster-ink",
                )}
              >
                {PROVIDER_LABEL[entry]}
                {keyPresent[entry] && (
                  <span className="absolute right-1 top-1 inline-block h-1 w-1 rounded-full bg-luster-ok" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-luster-faint uppercase tracking-[0.14em]">
            API key
          </span>
          <a
            href={PROVIDER_KEY_URL[provider]}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 text-luster-accent hover:underline"
          >
            Get a key <Icon name="arrow-right" size={12} />
          </a>
        </div>

        <div className="flex gap-1.5">
          <input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={
              keyPresent[provider]
                ? "•••••• (saved — paste new to replace)"
                : PROVIDER_KEY_HINT[provider]
            }
            className="luster-mono flex-1 rounded-md border border-luster-border bg-luster-card px-2.5 py-1.5 text-[12px] text-luster-ink placeholder:text-luster-faint focus:border-luster-accent focus:outline-none"
          />
          <Button variant="primary" size="md" onClick={saveKey}>
            Save
          </Button>
          {keyPresent[provider] && (
            <Button variant="ghost" size="md" onClick={clearKey}>
              Clear
            </Button>
          )}
        </div>

        {status.tone !== "idle" && (
          <div
            className={cn(
              "text-[12px]",
              status.tone === "pending" && "text-luster-muted",
              status.tone === "saved" && "text-luster-ok",
              status.tone === "error" && "text-luster-err",
            )}
          >
            {status.tone === "pending" ? "Validating…" : status.message}
          </div>
        )}
      </Section>

      <Section label="Default mode">
        <div className="space-y-1">
          {MODES.map((mode) => (
            <label
              key={mode}
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-md border px-2.5 py-2 transition-colors",
                defaultMode === mode
                  ? "border-luster-accent bg-luster-accent-soft"
                  : "border-luster-border bg-luster-card hover:bg-luster-surface",
              )}
            >
              <input
                type="radio"
                name="default-mode"
                className="mt-0.5 accent-luster-accent"
                checked={defaultMode === mode}
                onChange={() => chooseDefaultMode(mode)}
              />
              <div>
                <div className="text-[13px] text-luster-ink">
                  {MODE_LABEL[mode]}
                </div>
                <div className="text-[11px] text-luster-muted">
                  {MODE_DESCRIPTION[mode]}
                </div>
              </div>
            </label>
          ))}
        </div>
      </Section>

      <Section label="On supported pages">
        <Toggle
          checked={autoLaunch}
          onChange={changeAutoLaunch}
          label="Open Luster automatically"
          description="Show the panel when you visit Google Docs, Notion, Substack, Medium, or Ghost."
        />
      </Section>

      <details
        open={advancedOpen}
        onToggle={(event) =>
          setAdvancedOpen((event.target as HTMLDetailsElement).open)
        }
        className="rounded-md border border-luster-border bg-luster-card overflow-hidden"
      >
        <summary className="cursor-pointer select-none px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-luster-faint">
          Advanced
        </summary>
        <div className="space-y-3 border-t border-luster-border px-3 py-3 text-[12px]">
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-[0.14em] text-luster-faint">
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
              className="luster-mono w-full rounded-md border border-luster-border bg-luster-card px-2.5 py-1.5 text-[12px] text-luster-ink"
            />
            <div className="text-[10px] text-luster-faint">
              default: {DEFAULT_MODELS[provider]}
            </div>
          </div>

          <div className="space-y-2 border-t border-luster-border pt-3">
            <Toggle
              checked={historyEnabled}
              onChange={toggleHistory}
              label="Keep per-document history"
              description="Local-only stats and AI outputs. Never includes your raw text."
            />
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" onClick={exportHistory}>
                Export JSON
              </Button>
              <Button variant="ghost" size="sm" onClick={clearHistory}>
                Clear all
              </Button>
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
    <div className="rounded-md border border-luster-border bg-luster-card">
      <div className="border-b border-luster-border px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-luster-faint">
        {label}
      </div>
      <div className="px-3 py-3 space-y-3 text-[12px]">{children}</div>
    </div>
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
        <Switch checked={checked} onChange={onChange} ariaLabel={label} />
      </div>
    </div>
  );
}
