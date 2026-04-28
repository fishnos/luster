import type {
  ModeName,
  ModeOutput,
  ProviderId,
  TokenUsage,
} from "@/core/types";
import type { DocStats } from "@/core/stats";

export interface RunModeRequest {
  type: "ai/run-mode";
  payload: {
    mode: ModeName;
    sentence: string;
    paragraph: string;
    contextBefore: string;
    docId: string;
  };
}

export interface RunModeResponse {
  ok: boolean;
  output?: ModeOutput;
  tokens?: TokenUsage;
  error?: string;
}

export interface ValidateKeyRequest {
  type: "key/validate";
  payload: { provider: ProviderId; apiKey: string };
}

export interface ValidateKeyResponse {
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

export interface HistoryEntryInput {
  timestamp: number;
  mode: ModeName;
  stats: DocStats;
  output: ModeOutput;
  tokens?: TokenUsage;
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

export interface RequestHandlerArgs {
  request: LusterRequest;
  senderTabId?: number;
}

export type RequestHandler = (
  args: RequestHandlerArgs,
) => Promise<LusterResponse> | LusterResponse;

export function ok<TData>(data?: TData): OkResponse<TData> {
  return data === undefined ? { ok: true } : { ok: true, data };
}

export function fail(error: string): ErrorResponse {
  return { ok: false, error };
}
