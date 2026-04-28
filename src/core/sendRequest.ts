import type {
  LusterRequest,
  LusterResponse,
  RunModeRequest,
  RunModeResultData,
  ValidateKeyRequest,
  ValidateKeyResultData,
} from "@/core/messaging";
import type { HistoryEntry } from "@/core/history";

export async function sendRequest(
  request: LusterRequest,
): Promise<LusterResponse> {
  return browser.runtime.sendMessage(request) as Promise<LusterResponse>;
}

export async function sendRunMode(
  payload: RunModeRequest["payload"],
): Promise<RunModeResultData> {
  const response = await sendRequest({ type: "ai/run-mode", payload });
  if (!response.ok) {
    return {
      ok: false,
      reason: "provider-error",
      error: response.error,
    };
  }
  return response.data as RunModeResultData;
}

export async function sendValidateKey(
  payload: ValidateKeyRequest["payload"],
): Promise<ValidateKeyResultData> {
  const response = await sendRequest({ type: "key/validate", payload });
  if (!response.ok) {
    return { ok: false, error: response.error };
  }
  return response.data as ValidateKeyResultData;
}

export async function sendGetHistory(docId: string): Promise<HistoryEntry[]> {
  const response = await sendRequest({
    type: "history/get",
    payload: { docId },
  });
  if (!response.ok) return [];
  return (response.data ?? []) as HistoryEntry[];
}
