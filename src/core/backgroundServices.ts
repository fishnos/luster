import { createAiClient, type AiClient } from "@/core/aiClient";
import { createKeyVault, type KeyVault } from "@/core/keyVault";
import { createRateLimiter, type RateLimiter } from "@/core/rateLimiter";
import { createHistoryStore, type HistoryStore } from "@/core/history";
import { createDocContextStore, type DocContextStore } from "@/core/docContext";
import {
  createBrowserLocalStorage,
  type StorageBackend,
} from "@/core/storageBackend";
import { createAnthropicClient } from "@/core/providers/anthropic";
import { createOpenAIClient } from "@/core/providers/openai";
import { createGeminiClient } from "@/core/providers/gemini";
import { createModeEngines, type ModeEngines } from "@/core/modes";

export interface BackgroundServices {
  aiClient: AiClient;
  keyVault: KeyVault;
  rateLimiter: RateLimiter;
  historyStore: HistoryStore;
  docContextStore: DocContextStore;
  modeEngines: ModeEngines;
}

export interface BackgroundServicesOptions {
  storage?: StorageBackend;
  fetcher?: typeof fetch;
  defaultCallsPerMinute?: number;
}

export function createBackgroundServices(
  options: BackgroundServicesOptions = {},
): BackgroundServices {
  const storage = options.storage ?? createBrowserLocalStorage();
  const fetcher = options.fetcher ?? fetch;
  const keyVault = createKeyVault(storage);
  const rateLimiter = createRateLimiter({
    defaultCallsPerMinute: options.defaultCallsPerMinute ?? 20,
  });
  const historyStore = createHistoryStore(storage);
  const docContextStore = createDocContextStore(storage);
  const aiClient = createAiClient({
    keyVault,
    rateLimiter,
    providers: {
      anthropic: createAnthropicClient(fetcher),
      openai: createOpenAIClient(fetcher),
      gemini: createGeminiClient(fetcher),
    },
  });
  const modeEngines = createModeEngines({ aiClient });

  return {
    aiClient,
    keyVault,
    rateLimiter,
    historyStore,
    docContextStore,
    modeEngines,
  };
}
