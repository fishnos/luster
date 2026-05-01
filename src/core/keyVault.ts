import type { ModeName, ProviderId } from "@/core/types";
import type { StorageBackend } from "@/core/storageBackend";

const PROVIDER_IDS: ProviderId[] = ["anthropic", "openai", "gemini"];
const MODE_NAMES: ModeName[] = ["reading", "interrogation", "critic", "echo"];

const KEY_PREFIX = "luster.key.";
const MODEL_PREFIX = "luster.model.";
const ACTIVE_PROVIDER_KEY = "luster.activeProvider";
const DEFAULT_MODE_KEY = "luster.defaultMode";
const AUTO_LAUNCH_KEY = "luster.autoLaunch";
const GOOGLE_DOCS_ENABLED_KEY = "luster.googleDocsEnabled";
const GOOGLE_DOCS_MODE_KEY = "luster.googleDocsMode";

export type GoogleDocsMode = "bridge" | "api";

export const STORAGE_KEYS = {
  googleDocsEnabled: GOOGLE_DOCS_ENABLED_KEY,
  googleDocsMode: GOOGLE_DOCS_MODE_KEY,
} as const;

export const DEFAULT_MODELS: Record<ProviderId, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-5-mini",
  gemini: "gemini-2.5-flash",
};

const FALLBACK_PROVIDER: ProviderId = "gemini";
const FALLBACK_MODE: ModeName = "reading";

export interface KeyVault {
  getApiKey: (provider: ProviderId) => Promise<string | null>;
  setApiKey: (provider: ProviderId, apiKey: string) => Promise<void>;
  clearApiKey: (provider: ProviderId) => Promise<void>;
  hasApiKey: (provider: ProviderId) => Promise<boolean>;
  listProvidersWithKey: () => Promise<ProviderId[]>;
  getModel: (provider: ProviderId) => Promise<string>;
  setModel: (provider: ProviderId, model: string) => Promise<void>;
  getActiveProvider: () => Promise<ProviderId>;
  setActiveProvider: (provider: ProviderId) => Promise<void>;
  getDefaultMode: () => Promise<ModeName>;
  setDefaultMode: (mode: ModeName) => Promise<void>;
  getAutoLaunch: () => Promise<boolean>;
  setAutoLaunch: (enabled: boolean) => Promise<void>;
  getGoogleDocsEnabled: () => Promise<boolean>;
  setGoogleDocsEnabled: (enabled: boolean) => Promise<void>;
  getGoogleDocsMode: () => Promise<GoogleDocsMode>;
  setGoogleDocsMode: (mode: GoogleDocsMode) => Promise<void>;
}

export function createKeyVault(storage: StorageBackend): KeyVault {
  function keyOf(provider: ProviderId): string {
    return `${KEY_PREFIX}${provider}`;
  }
  function modelKeyOf(provider: ProviderId): string {
    return `${MODEL_PREFIX}${provider}`;
  }

  return {
    async getApiKey(provider) {
      const result = await storage.getMany([keyOf(provider)]);
      const value = result[keyOf(provider)];
      return typeof value === "string" && value.length > 0 ? value : null;
    },

    async setApiKey(provider, apiKey) {
      const trimmed = apiKey.trim();
      if (!trimmed) throw new Error("API key cannot be empty");
      await storage.setMany({ [keyOf(provider)]: trimmed });
    },

    async clearApiKey(provider) {
      await storage.remove([keyOf(provider)]);
    },

    async hasApiKey(provider) {
      const result = await storage.getMany([keyOf(provider)]);
      const value = result[keyOf(provider)];
      return typeof value === "string" && value.length > 0;
    },

    async listProvidersWithKey() {
      const keys = PROVIDER_IDS.map(keyOf);
      const result = await storage.getMany(keys);
      return PROVIDER_IDS.filter((provider) => {
        const value = result[keyOf(provider)];
        return typeof value === "string" && value.length > 0;
      });
    },

    async getModel(provider) {
      const result = await storage.getMany([modelKeyOf(provider)]);
      const value = result[modelKeyOf(provider)];
      return typeof value === "string" && value.length > 0
        ? value
        : DEFAULT_MODELS[provider];
    },

    async setModel(provider, model) {
      const trimmed = model.trim();
      if (!trimmed) throw new Error("Model id cannot be empty");
      await storage.setMany({ [modelKeyOf(provider)]: trimmed });
    },

    async getActiveProvider() {
      const result = await storage.getMany([ACTIVE_PROVIDER_KEY]);
      const stored = result[ACTIVE_PROVIDER_KEY];
      return isProviderId(stored) ? stored : FALLBACK_PROVIDER;
    },

    async setActiveProvider(provider) {
      if (!PROVIDER_IDS.includes(provider)) {
        throw new Error(`Unknown provider: ${provider}`);
      }
      await storage.setMany({ [ACTIVE_PROVIDER_KEY]: provider });
    },

    async getDefaultMode() {
      const result = await storage.getMany([DEFAULT_MODE_KEY]);
      const stored = result[DEFAULT_MODE_KEY];
      return isModeName(stored) ? stored : FALLBACK_MODE;
    },

    async setDefaultMode(mode) {
      if (!MODE_NAMES.includes(mode)) {
        throw new Error(`Unknown mode: ${mode}`);
      }
      await storage.setMany({ [DEFAULT_MODE_KEY]: mode });
    },

    async getAutoLaunch() {
      const result = await storage.getMany([AUTO_LAUNCH_KEY]);
      const stored = result[AUTO_LAUNCH_KEY];
      return stored !== false;
    },

    async setAutoLaunch(enabled) {
      await storage.setMany({ [AUTO_LAUNCH_KEY]: enabled === true });
    },

    async getGoogleDocsEnabled() {
      const result = await storage.getMany([GOOGLE_DOCS_ENABLED_KEY]);
      const value = result[GOOGLE_DOCS_ENABLED_KEY];
      return value !== false;
    },

    async setGoogleDocsEnabled(enabled) {
      await storage.setMany({
        [GOOGLE_DOCS_ENABLED_KEY]: enabled === true,
      });
    },

    async getGoogleDocsMode() {
      const result = await storage.getMany([GOOGLE_DOCS_MODE_KEY]);
      const value = result[GOOGLE_DOCS_MODE_KEY];
      return value === "api" ? "api" : "bridge";
    },

    async setGoogleDocsMode(mode) {
      await storage.setMany({
        [GOOGLE_DOCS_MODE_KEY]: mode === "api" ? "api" : "bridge",
      });
    },
  };
}

function isProviderId(value: unknown): value is ProviderId {
  return (
    typeof value === "string" && PROVIDER_IDS.includes(value as ProviderId)
  );
}

function isModeName(value: unknown): value is ModeName {
  return typeof value === "string" && MODE_NAMES.includes(value as ModeName);
}
