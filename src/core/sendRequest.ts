import type {
  GoogleAuthRedirectData,
  GoogleAuthStatusData,
  GoogleDocsFetchData,
  LusterRequest,
  LusterResponse,
  RunModeRequest,
  RunModeResultData,
  ValidateKeyRequest,
  ValidateKeyResultData,
} from "@/core/messaging";
import type { HistoryEntry } from "@/core/history";
import type { DocContext } from "@/core/docContext";
import { EMPTY_DOC_CONTEXT } from "@/core/docContext";

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

export async function sendGetDocContext(docId: string): Promise<DocContext> {
  const response = await sendRequest({
    type: "doc-context/get",
    payload: { docId },
  });
  if (!response.ok) return { ...EMPTY_DOC_CONTEXT };
  return response.data as DocContext;
}

export async function sendSetDocContextBrief(
  docId: string,
  brief: string,
): Promise<void> {
  await sendRequest({
    type: "doc-context/set-brief",
    payload: { docId, brief },
  });
}

export async function sendSetDocContextPact(
  docId: string,
  pact: string,
): Promise<void> {
  await sendRequest({
    type: "doc-context/set-pact",
    payload: { docId, pact },
  });
}

export async function sendSetDocContextAutoMode(
  docId: string,
  autoMode: boolean,
): Promise<void> {
  await sendRequest({
    type: "doc-context/set-auto-mode",
    payload: { docId, autoMode },
  });
}

export async function sendGetDefaultBrief(): Promise<string> {
  const response = await sendRequest({
    type: "doc-context/get-default-brief",
    payload: {},
  });
  if (!response.ok) return "";
  return typeof response.data === "string" ? response.data : "";
}

export async function sendSetDefaultBrief(brief: string): Promise<void> {
  await sendRequest({
    type: "doc-context/set-default-brief",
    payload: { brief },
  });
}

export async function sendRunEchoScan(args: {
  docId: string;
  fullText: string;
}): Promise<RunModeResultData> {
  const response = await sendRequest({ type: "ai/run-echo", payload: args });
  if (!response.ok) {
    return { ok: false, reason: "provider-error", error: response.error };
  }
  return response.data as RunModeResultData;
}

export async function sendGoogleAuthConnect(
  interactive: boolean,
): Promise<GoogleAuthStatusData> {
  const response = await sendRequest({
    type: "gauth/connect",
    payload: { interactive },
  });
  if (!response.ok) {
    return { connected: false, reason: "error", error: response.error };
  }
  return response.data as GoogleAuthStatusData;
}

export async function sendGoogleAuthStatus(): Promise<GoogleAuthStatusData> {
  const response = await sendRequest({
    type: "gauth/status",
    payload: {},
  });
  if (!response.ok) {
    return { connected: false, reason: "error", error: response.error };
  }
  return response.data as GoogleAuthStatusData;
}

export async function sendGoogleAuthRedirect(): Promise<GoogleAuthRedirectData> {
  const response = await sendRequest({
    type: "gauth/redirect-url",
    payload: {},
  });
  if (!response.ok) {
    return { redirectUrl: null, clientId: null };
  }
  return response.data as GoogleAuthRedirectData;
}

export async function sendGoogleDocsFetch(
  docId: string,
): Promise<GoogleDocsFetchData> {
  const response = await sendRequest({
    type: "gdocs/fetch",
    payload: { docId },
  });
  if (!response.ok) {
    return { ok: false, reason: "error", error: response.error };
  }
  return response.data as GoogleDocsFetchData;
}
