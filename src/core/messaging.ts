import type {
  ModeName,
  ModeOutput,
  ProviderId,
  TokenUsage,
} from "@/core/types";
import type { DocStats } from "@/core/stats";
import type { CommitDelta } from "@/adapters/types";
import type { QuestionKind } from "@/core/modes/prompts/interrogation";

export interface RunModeRequest {
  type: "ai/run-mode";
  payload: {
    mode: ModeName;
    delta: CommitDelta;
    stats: DocStats;
    contextBefore: string;
    lastQuestionKind: QuestionKind | null;
    docId: string;
  };
}

export type RunModeFailureReason =
  | "no-key"
  | "rate-limited"
  | "provider-error"
  | "parse-error";

export type RunModeResultData =
  | {
      ok: true;
      output: ModeOutput;
      tokens: TokenUsage;
      provider: ProviderId;
      model: string;
      promptVersion: string;
    }
  | {
      ok: false;
      reason: RunModeFailureReason;
      provider?: ProviderId;
      retryAfterMs?: number;
      error?: string;
    };

export interface ValidateKeyRequest {
  type: "key/validate";
  payload: { provider: ProviderId; apiKey: string };
}

export interface ValidateKeyResultData {
  ok: boolean;
  modelEcho?: string;
  error?: string;
}

export interface SaveKeyRequest {
  type: "key/save";
  payload: { provider: ProviderId; apiKey: string };
}

export interface ClearKeyRequest {
  type: "key/clear";
  payload: { provider: ProviderId };
}

export interface SetModelRequest {
  type: "settings/set-model";
  payload: { provider: ProviderId; model: string };
}

export interface SetActiveProviderRequest {
  type: "settings/set-active-provider";
  payload: { mode: ModeName; provider: ProviderId };
}

export interface SetHistoryEnabledRequest {
  type: "history/set-enabled";
  payload: { enabled: boolean };
}

export interface HistoryEntryInput {
  timestamp: number;
  mode: ModeName;
  stats: DocStats;
  output: ModeOutput;
  tokens?: TokenUsage;
}

export interface AppendHistoryRequest {
  type: "history/append";
  payload: {
    docId: string;
    entry: HistoryEntryInput;
  };
}

export interface GetHistoryRequest {
  type: "history/get";
  payload: { docId: string };
}

export interface ExportHistoryRequest {
  type: "history/export";
  payload: Record<string, never>;
}

export interface ClearHistoryRequest {
  type: "history/clear";
  payload: { docId?: string };
}

export type LusterRequest =
  | RunModeRequest
  | ValidateKeyRequest
  | SaveKeyRequest
  | ClearKeyRequest
  | SetModelRequest
  | SetActiveProviderRequest
  | SetHistoryEnabledRequest
  | AppendHistoryRequest
  | GetHistoryRequest
  | ExportHistoryRequest
  | ClearHistoryRequest;

export interface OkResponse<TData = undefined> {
  ok: true;
  data?: TData;
}

export interface ErrorResponse {
  ok: false;
  error: string;
}

export type LusterResponse<TData = unknown> = OkResponse<TData> | ErrorResponse;

export type RequestSender = (request: LusterRequest) => Promise<LusterResponse>;

export function ok<TData>(data?: TData): OkResponse<TData> {
  return data === undefined ? { ok: true } : { ok: true, data };
}

export function fail(error: string): ErrorResponse {
  return { ok: false, error };
}
