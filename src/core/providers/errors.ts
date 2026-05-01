import type { ProviderId } from "@/core/types";
import {
  ProviderAuthError,
  ProviderRateLimitError,
} from "@/core/providers/types";

const PROVIDER_LABEL: Record<ProviderId, string> = {
  anthropic: "Claude",
  openai: "OpenAI",
  gemini: "Gemini",
};

interface ParsedRetryHint {
  retryAfterMs: number | null;
}

interface ProviderErrorPayload {
  error?: {
    message?: string;
    status?: string;
    type?: string;
    code?: string | number;
    details?: unknown[];
  };
  message?: string;
  retryAfter?: number;
}

export async function throwProviderHttpError(
  provider: ProviderId,
  response: Response,
): Promise<never> {
  const status = response.status;
  const bodyText = await safeReadBody(response);
  const parsed = parseBody(bodyText);
  const message = friendlyMessage(provider, status, parsed, bodyText);

  if (status === 429) {
    const retry = inferRetryAfterMs(response, parsed);
    throw new ProviderRateLimitError(
      provider,
      message,
      retry.retryAfterMs ?? defaultBackoffForStatus(status),
    );
  }
  if (status === 401 || status === 403) {
    throw new ProviderAuthError(provider, message, status);
  }
  throw new Error(message);
}

async function safeReadBody(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function parseBody(text: string): ProviderErrorPayload | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as ProviderErrorPayload;
  } catch {
    return null;
  }
}

function friendlyMessage(
  provider: ProviderId,
  status: number,
  parsed: ProviderErrorPayload | null,
  rawBody: string,
): string {
  const label = PROVIDER_LABEL[provider];
  const reason = parsed?.error?.message ?? parsed?.message ?? rawBody.trim();

  if (status === 429) {
    if (reason && /quota/i.test(reason) && /free/i.test(reason)) {
      return `${label} free-tier limit reached. Wait a moment, or upgrade your plan to keep going.`;
    }
    return `${label} rate limit reached. Try again in a moment.`;
  }
  if (status === 401) {
    return `${label} rejected the API key. Open settings and reconnect.`;
  }
  if (status === 403) {
    return `${label} blocked the request. Your key may not have access to this model.`;
  }
  if (status === 404) {
    return `${label} model not found. Check the model name in settings.`;
  }
  if (status === 408 || status === 504) {
    return `${label} timed out. Try again.`;
  }
  if (status >= 500) {
    return `${label} is having trouble (${status}). Try again in a minute.`;
  }
  if (status === 400) {
    const detail = reason ? truncate(reason, 160) : "";
    return detail
      ? `${label} rejected the request: ${detail}`
      : `${label} rejected the request.`;
  }
  const detail = reason ? truncate(reason, 160) : "";
  return detail ? `${label}: ${detail}` : `${label} ${status}`;
}

function inferRetryAfterMs(
  response: Response,
  parsed: ProviderErrorPayload | null,
): ParsedRetryHint {
  const header = response.headers.get("retry-after");
  if (header) {
    const seconds = Number.parseFloat(header);
    if (Number.isFinite(seconds) && seconds > 0) {
      return { retryAfterMs: Math.ceil(seconds * 1000) };
    }
    const date = Date.parse(header);
    if (!Number.isNaN(date)) {
      const delta = date - Date.now();
      if (delta > 0) return { retryAfterMs: delta };
    }
  }
  const details = parsed?.error?.details;
  if (Array.isArray(details)) {
    for (const entry of details) {
      if (
        entry &&
        typeof entry === "object" &&
        "retryDelay" in entry &&
        typeof (entry as { retryDelay?: unknown }).retryDelay === "string"
      ) {
        const seconds = Number.parseFloat(
          (entry as { retryDelay: string }).retryDelay,
        );
        if (Number.isFinite(seconds) && seconds > 0) {
          return { retryAfterMs: Math.ceil(seconds * 1000) };
        }
      }
    }
  }
  return { retryAfterMs: null };
}

function defaultBackoffForStatus(status: number): number {
  if (status === 429) return 30_000;
  return 10_000;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

export function describeUnknownError(
  provider: ProviderId,
  error: unknown,
): string {
  if (error instanceof ProviderRateLimitError) return error.message;
  if (error instanceof ProviderAuthError) return error.message;
  if (error instanceof Error) {
    const trimmed = error.message.trim();
    if (trimmed.length > 0) return trimmed;
  }
  const label = PROVIDER_LABEL[provider];
  return `${label} request failed.`;
}
