import type { ModeName, ProviderId } from "@/core/types";
import type { StorageBackend } from "@/core/storageBackend";

const PROVIDER_IDS: ProviderId[] = ["anthropic", "openai", "gemini"];

const KEY_PREFIX = "luster.key.";
const MODEL_PREFIX = "luster.model.";
const ACTIVE_PROVIDER_PREFIX = "luster.activeProvider.";

export const DEFAULT_MODELS: Record<ProviderId, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-5-mini",
  gemini: "gemini-2.5-flash",
};

const DEFAULT_PROVIDER_FOR_MODE: Record<ModeName, ProviderId> = {
  reading: "anthropic",
  interrogation: "anthropic",
  critic: "openai",
};

export interface KeyVault {
  getApiKey: (provider: ProviderId) => Promise<string | null>;
  setApiKey: (provider: ProviderId, apiKey: string) => Promise<void>;
  clearApiKey: (provider: ProviderId) => Promise<void>;
  hasApiKey: (provider: ProviderId) => Promise<boolean>;
  listProvidersWithKey: () => Promise<ProviderId[]>;
  getModel: (provider: ProviderId) => Promise<string>;
  setModel: (provider: ProviderId, model: string) => Promise<void>;
  getActiveProvider: (mode: ModeName) => Promise<ProviderId>;
  setActiveProvider: (mode: ModeName, provider: ProviderId) => Promise<void>;
}

export function createKeyVault(storage: StorageBackend): KeyVault {
  function keyOf(provider: ProviderId): string {
    return `${KEY_PREFIX}${provider}`;
  }
  function modelKeyOf(provider: ProviderId): string {
    return `${MODEL_PREFIX}${provider}`;
  }
  function activeProviderKeyOf(mode: ModeName): string {
    return `${ACTIVE_PROVIDER_PREFIX}${mode}`;
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

    async getActiveProvider(mode) {
      const result = await storage.getMany([activeProviderKeyOf(mode)]);
      const stored = result[activeProviderKeyOf(mode)];
      if (isProviderId(stored)) return stored;
      return DEFAULT_PROVIDER_FOR_MODE[mode];
    },

    async setActiveProvider(mode, provider) {
      if (!PROVIDER_IDS.includes(provider)) {
        throw new Error(`Unknown provider: ${provider}`);
      }
      await storage.setMany({ [activeProviderKeyOf(mode)]: provider });
    },
  };
}

function isProviderId(value: unknown): value is ProviderId {
  return (
    typeof value === "string" && PROVIDER_IDS.includes(value as ProviderId)
  );
}
