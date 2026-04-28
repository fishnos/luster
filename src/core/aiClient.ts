import type { KeyVault } from "@/core/keyVault";
import type { RateLimiter } from "@/core/rateLimiter";
import type { ModeName, ProviderId } from "@/core/types";
import type {
  ProviderCallArgs,
  ProviderCallResult,
  ProviderClient,
  ValidateKeyResult,
} from "@/core/providers/types";

export interface AiCallRequest {
  mode: ModeName;
  systemPrompt: string;
  cacheableSystem?: boolean;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  expectJson?: boolean;
}

export interface AiCallSuccess {
  ok: true;
  text: string;
  provider: ProviderId;
  model: string;
  tokens: { input: number; output: number };
}

export interface AiCallFailure {
  ok: false;
  reason: "no-key" | "rate-limited" | "provider-error";
  retryAfterMs?: number;
  provider?: ProviderId;
  error?: string;
}

export type AiCallResult = AiCallSuccess | AiCallFailure;

export interface AiClient {
  runForMode: (request: AiCallRequest) => Promise<AiCallResult>;
  validateKey: (
    provider: ProviderId,
    apiKey: string,
  ) => Promise<ValidateKeyResult>;
  callRaw: (
    provider: ProviderId,
    args: ProviderCallArgs,
  ) => Promise<ProviderCallResult>;
}

export type ProviderRegistry = Record<ProviderId, ProviderClient>;

export interface AiClientDeps {
  keyVault: KeyVault;
  rateLimiter: RateLimiter;
  providers: ProviderRegistry;
}

export function createAiClient(deps: AiClientDeps): AiClient {
  const { keyVault, rateLimiter, providers } = deps;

  return {
    async runForMode(request) {
      const provider = await keyVault.getActiveProvider();
      const providerClient = providers[provider];

      const apiKey = await keyVault.getApiKey(provider);
      if (!apiKey) {
        return { ok: false, reason: "no-key", provider };
      }

      const slot = rateLimiter.acquire(request.mode);
      if (!slot.allowed) {
        return {
          ok: false,
          reason: "rate-limited",
          retryAfterMs: slot.retryAfterMs,
          provider,
        };
      }

      const model = await keyVault.getModel(provider);

      try {
        const result = await providerClient.call({
          apiKey,
          model,
          systemPrompt: request.systemPrompt,
          cacheableSystem: request.cacheableSystem,
          userPrompt: request.userPrompt,
          maxTokens: request.maxTokens,
          temperature: request.temperature,
          expectJson: request.expectJson,
        });
        return {
          ok: true,
          text: result.text,
          provider,
          model,
          tokens: result.tokens,
        };
      } catch (error) {
        return {
          ok: false,
          reason: "provider-error",
          provider,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },

    async validateKey(provider, apiKey) {
      const model = await keyVault.getModel(provider);
      return providers[provider].validateKey(apiKey, model);
    },

    async callRaw(provider, args) {
      return providers[provider].call(args);
    },
  };
}
