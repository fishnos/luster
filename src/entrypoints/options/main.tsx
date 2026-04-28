import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "@/ui/theme.css";
import { Button } from "@/ui/components/Button";
import { Card, CardBody, CardHeader } from "@/ui/components/Card";
import { cn } from "@/ui/cn";
import { createKeyVault, DEFAULT_MODELS } from "@/core/keyVault";
import { createHistoryStore } from "@/core/history";
import { createBrowserLocalStorage } from "@/core/storageBackend";
import { sendValidateKey } from "@/core/sendRequest";
import type { ModeName, ProviderId } from "@/core/types";

const PROVIDERS: ProviderId[] = ["anthropic", "openai", "gemini"];
const MODES: ModeName[] = ["reading", "interrogation", "critic"];

const PROVIDER_LABELS: Record<ProviderId, string> = {
  anthropic: "Anthropic Claude",
  openai: "OpenAI",
  gemini: "Google Gemini",
};

const PROVIDER_KEY_HINTS: Record<ProviderId, string> = {
  anthropic: "sk-ant-...",
  openai: "sk-...",
  gemini: "AIza...",
};

const storage = createBrowserLocalStorage();
const keyVault = createKeyVault(storage);
const historyStore = createHistoryStore(storage);

function Options() {
  const [keys, setKeys] = useState<Record<ProviderId, string>>({
    anthropic: "",
    openai: "",
    gemini: "",
  });
  const [models, setModels] = useState<Record<ProviderId, string>>(() => ({
    ...DEFAULT_MODELS,
  }));
  const [statuses, setStatuses] = useState<Record<ProviderId, ProviderStatus>>({
    anthropic: { tone: "idle" },
    openai: { tone: "idle" },
    gemini: { tone: "idle" },
  });
  const [activeProviders, setActiveProviders] = useState<
    Record<ModeName, ProviderId>
  >({
    reading: "anthropic",
    interrogation: "anthropic",
    critic: "openai",
  });
  const [historyEnabled, setHistoryEnabled] = useState(false);

  useEffect(() => {
    void hydrate();
    async function hydrate(): Promise<void> {
      const loadedKeys: Record<ProviderId, string> = {
        anthropic: "",
        openai: "",
        gemini: "",
      };
      const loadedModels: Record<ProviderId, string> = { ...DEFAULT_MODELS };
      const loadedStatuses: Record<ProviderId, ProviderStatus> = {
        anthropic: { tone: "idle" },
        openai: { tone: "idle" },
        gemini: { tone: "idle" },
      };
      for (const provider of PROVIDERS) {
        const key = await keyVault.getApiKey(provider);
        if (key) {
          loadedKeys[provider] = maskKey(key);
          loadedStatuses[provider] = { tone: "saved", message: "Saved." };
        }
        loadedModels[provider] = await keyVault.getModel(provider);
      }
      const loadedActive: Record<ModeName, ProviderId> = {
        reading: await keyVault.getActiveProvider("reading"),
        interrogation: await keyVault.getActiveProvider("interrogation"),
        critic: await keyVault.getActiveProvider("critic"),
      };
      setKeys(loadedKeys);
      setModels(loadedModels);
      setStatuses(loadedStatuses);
      setActiveProviders(loadedActive);
      setHistoryEnabled(await historyStore.isEnabled());
    }
  }, []);

  async function saveKey(provider: ProviderId): Promise<void> {
    const value = keys[provider].trim();
    if (!value || value.startsWith("•")) {
      setStatuses((current) => ({
        ...current,
        [provider]: { tone: "error", message: "Enter a key first." },
      }));
      return;
    }
    setStatuses((current) => ({
      ...current,
      [provider]: { tone: "pending", message: "Validating…" },
    }));
    const result = await sendValidateKey({ provider, apiKey: value });
    if (!result.ok) {
      setStatuses((current) => ({
        ...current,
        [provider]: {
          tone: "error",
          message: result.error ?? "Validation failed.",
        },
      }));
      return;
    }
    await keyVault.setApiKey(provider, value);
    setKeys((current) => ({ ...current, [provider]: maskKey(value) }));
    setStatuses((current) => ({
      ...current,
      [provider]: {
        tone: "saved",
        message: result.modelEcho
          ? `Saved. Reached ${result.modelEcho}.`
          : "Saved.",
      },
    }));
  }

  async function clearKey(provider: ProviderId): Promise<void> {
    await keyVault.clearApiKey(provider);
    setKeys((current) => ({ ...current, [provider]: "" }));
    setStatuses((current) => ({ ...current, [provider]: { tone: "idle" } }));
  }

  async function saveModel(provider: ProviderId, model: string): Promise<void> {
    const trimmed = model.trim();
    if (!trimmed) return;
    await keyVault.setModel(provider, trimmed);
    setModels((current) => ({ ...current, [provider]: trimmed }));
  }

  async function setActiveProvider(
    mode: ModeName,
    provider: ProviderId,
  ): Promise<void> {
    await keyVault.setActiveProvider(mode, provider);
    setActiveProviders((current) => ({ ...current, [mode]: provider }));
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
    <div className="luster-root min-h-screen bg-luster-bg p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <h1 className="font-serif text-luster-accent text-3xl">Luster</h1>
          <p className="text-luster-muted text-sm mt-1">
            Bring your own API key. Keys live only in your browser; nothing is
            uploaded.
          </p>
        </header>

        <Card>
          <CardHeader>
            <span>Providers</span>
          </CardHeader>
          <CardBody className="space-y-5">
            {PROVIDERS.map((provider) => (
              <ProviderRow
                key={provider}
                provider={provider}
                apiKey={keys[provider]}
                model={models[provider]}
                status={statuses[provider]}
                onChangeKey={(value) =>
                  setKeys((current) => ({ ...current, [provider]: value }))
                }
                onChangeModel={(value) =>
                  setModels((current) => ({ ...current, [provider]: value }))
                }
                onSave={() => saveKey(provider)}
                onClear={() => clearKey(provider)}
                onCommitModel={() => saveModel(provider, models[provider])}
              />
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <span>Active provider per mode</span>
          </CardHeader>
          <CardBody className="space-y-3">
            {MODES.map((mode) => (
              <div
                key={mode}
                className="flex items-center justify-between gap-3"
              >
                <span className="capitalize text-sm">{mode}</span>
                <select
                  className="rounded border border-luster-border bg-luster-panel2 px-2 py-1 text-sm"
                  value={activeProviders[mode]}
                  onChange={(event) =>
                    setActiveProvider(mode, event.target.value as ProviderId)
                  }
                >
                  {PROVIDERS.map((provider) => (
                    <option key={provider} value={provider}>
                      {PROVIDER_LABELS[provider]}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <span>History</span>
            <span className="text-luster-muted">
              Local only. Never includes raw text.
            </span>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={historyEnabled}
                onChange={toggleHistory}
              />
              <span>Keep per-document history (stats + AI outputs).</span>
            </label>
            <div className="flex gap-2">
              <Button variant="solid" onClick={exportHistory}>
                Export JSON
              </Button>
              <Button variant="ghost" onClick={clearHistory}>
                Clear all
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

interface ProviderStatus {
  tone: "idle" | "pending" | "saved" | "error";
  message?: string;
}

interface ProviderRowProps {
  provider: ProviderId;
  apiKey: string;
  model: string;
  status: ProviderStatus;
  onChangeKey: (value: string) => void;
  onChangeModel: (value: string) => void;
  onSave: () => void;
  onClear: () => void;
  onCommitModel: () => void;
}

function ProviderRow({
  provider,
  apiKey,
  model,
  status,
  onChangeKey,
  onChangeModel,
  onSave,
  onClear,
  onCommitModel,
}: ProviderRowProps) {
  const statusToneClass = cn(
    status.tone === "saved" && "text-luster-ok",
    status.tone === "error" && "text-luster-err",
    status.tone === "pending" && "text-luster-accent animate-pulse",
    status.tone === "idle" && "text-luster-muted",
  );
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{PROVIDER_LABELS[provider]}</span>
        <span className={cn("text-xs", statusToneClass)}>
          {status.message ?? ""}
        </span>
      </div>
      <div className="flex gap-2">
        <input
          type="password"
          className="flex-1 rounded border border-luster-border bg-luster-panel2 px-2 py-1 text-sm font-mono"
          placeholder={PROVIDER_KEY_HINTS[provider]}
          value={apiKey}
          onChange={(event) => onChangeKey(event.target.value)}
        />
        <Button variant="solid" onClick={onSave}>
          Validate &amp; save
        </Button>
        <Button variant="ghost" onClick={onClear}>
          Clear
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-luster-muted w-16 shrink-0">Model</span>
        <input
          type="text"
          className="flex-1 rounded border border-luster-border bg-luster-panel2 px-2 py-1 text-xs font-mono"
          value={model}
          onChange={(event) => onChangeModel(event.target.value)}
          onBlur={onCommitModel}
        />
        <span className="text-[10px] text-luster-muted">
          default: {DEFAULT_MODELS[provider]}
        </span>
      </div>
    </div>
  );
}

function maskKey(rawKey: string): string {
  if (rawKey.length <= 8) return "•".repeat(rawKey.length);
  return `${rawKey.slice(0, 4)}${"•".repeat(Math.max(4, rawKey.length - 8))}${rawKey.slice(-4)}`;
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<Options />);
