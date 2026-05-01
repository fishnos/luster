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

export interface RunEchoRequest {
  type: "ai/run-echo";
  payload: { docId: string; fullText: string };
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
  payload: { provider: ProviderId };
}

export interface SetDefaultModeRequest {
  type: "settings/set-default-mode";
  payload: { mode: ModeName };
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

export interface GetDocContextRequest {
  type: "doc-context/get";
  payload: { docId: string };
}

export interface SetDocContextBriefRequest {
  type: "doc-context/set-brief";
  payload: { docId: string; brief: string };
}

export interface SetDocContextPactRequest {
  type: "doc-context/set-pact";
  payload: { docId: string; pact: string };
}

export interface SetDocContextAutoModeRequest {
  type: "doc-context/set-auto-mode";
  payload: { docId: string; autoMode: boolean };
}

export interface GetDefaultBriefRequest {
  type: "doc-context/get-default-brief";
  payload: Record<string, never>;
}

export interface SetDefaultBriefRequest {
  type: "doc-context/set-default-brief";
  payload: { brief: string };
}

export interface GoogleAuthConnectRequest {
  type: "gauth/connect";
  payload: { interactive: boolean };
}

export interface GoogleAuthStatusRequest {
  type: "gauth/status";
  payload: Record<string, never>;
}

export interface GoogleDocsFetchRequest {
  type: "gdocs/fetch";
  payload: { docId: string };
}

export interface GoogleAuthRedirectRequest {
  type: "gauth/redirect-url";
  payload: Record<string, never>;
}

export interface GoogleAuthRedirectData {
  redirectUrl: string | null;
  clientId: string | null;
}

export type GoogleAuthStatusData =
  | { connected: true }
  | {
      connected: false;
      reason:
        | "not-configured"
        | "denied"
        | "unsupported"
        | "error"
        | "no-token";
      error?: string;
    };

export type GoogleDocsFetchData =
  | { ok: true; fullText: string; paragraphs: string[]; revisionId?: string }
  | {
      ok: false;
      reason:
        | "auth-required"
        | "permission-denied"
        | "not-found"
        | "rate-limited"
        | "error"
        | "not-configured";
      status?: number;
      error?: string;
    };

export type LusterRequest =
  | RunModeRequest
  | RunEchoRequest
  | ValidateKeyRequest
  | SaveKeyRequest
  | ClearKeyRequest
  | SetModelRequest
  | SetActiveProviderRequest
  | SetDefaultModeRequest
  | SetHistoryEnabledRequest
  | AppendHistoryRequest
  | GetHistoryRequest
  | ExportHistoryRequest
  | ClearHistoryRequest
  | GetDocContextRequest
  | SetDocContextBriefRequest
  | SetDocContextPactRequest
  | SetDocContextAutoModeRequest
  | GetDefaultBriefRequest
  | SetDefaultBriefRequest
  | GoogleAuthConnectRequest
  | GoogleAuthStatusRequest
  | GoogleDocsFetchRequest
  | GoogleAuthRedirectRequest;

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
