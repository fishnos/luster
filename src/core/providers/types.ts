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
