import type { ProviderId, TokenUsage } from "@/core/types";

export interface ProviderCallArgs {
  apiKey: string;
  model: string;
  systemPrompt: string;
  cacheableSystem?: boolean;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  expectJson?: boolean;
}

export interface ProviderCallResult {
  text: string;
  tokens: TokenUsage;
  raw?: unknown;
}

export interface ValidateKeyResult {
  ok: boolean;
  modelEcho?: string;
  error?: string;
}

export type Fetcher = typeof fetch;

export interface ProviderClient {
  id: ProviderId;
  call: (args: ProviderCallArgs) => Promise<ProviderCallResult>;
  validateKey: (apiKey: string, model: string) => Promise<ValidateKeyResult>;
}

export class ProviderRateLimitError extends Error {
  readonly retryAfterMs: number;
  readonly provider: ProviderId;

  constructor(provider: ProviderId, message: string, retryAfterMs: number) {
    super(message);
    this.name = "ProviderRateLimitError";
    this.provider = provider;
    this.retryAfterMs = retryAfterMs;
  }
}

export class ProviderAuthError extends Error {
  readonly provider: ProviderId;
  readonly status: number;

  constructor(provider: ProviderId, message: string, status: number) {
    super(message);
    this.name = "ProviderAuthError";
    this.provider = provider;
    this.status = status;
  }
}
