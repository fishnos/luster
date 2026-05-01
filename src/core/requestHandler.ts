import type { BackgroundServices } from "@/core/backgroundServices";
import {
  fail,
  ok,
  type GoogleAuthRedirectData,
  type GoogleAuthStatusData,
  type GoogleDocsFetchData,
  type LusterRequest,
  type LusterResponse,
  type RunEchoRequest,
  type RunModeRequest,
  type RunModeResultData,
  type ValidateKeyResultData,
} from "@/core/messaging";
import { fetchGoogleDoc } from "@/core/googleDocsApi";
import type {
  CriticEngineInput,
  CriticEngineResult,
  EchoEngineInput,
  EchoEngineResult,
  InterrogationEngineInput,
  InterrogationEngineResult,
  ReadingEngineInput,
  ReadingEngineResult,
} from "@/core/modes";
import type {
  CriticOutput,
  EchoOutput,
  InterrogationOutput,
  ModeName,
  ModeOutput,
  ReadingOutput,
} from "@/core/types";

export type EngineRunResult =
  | ReadingEngineResult
  | InterrogationEngineResult
  | CriticEngineResult
  | EchoEngineResult;

export type RequestHandler = (
  request: LusterRequest,
) => Promise<LusterResponse>;

export function createRequestHandler(
  services: BackgroundServices,
): RequestHandler {
  return async function handle(request) {
    try {
      switch (request.type) {
        case "ai/run-mode":
          return ok<RunModeResultData>(
            engineResultToData(
              request.payload.mode,
              await runMode(services, request),
            ),
          );

        case "ai/run-echo":
          return ok<RunModeResultData>(
            engineResultToData("echo", await runEcho(services, request)),
          );

        case "key/validate": {
          const validation = await services.aiClient.validateKey(
            request.payload.provider,
            request.payload.apiKey,
          );
          const data: ValidateKeyResultData = {
            ok: validation.ok,
            modelEcho: validation.modelEcho,
            error: validation.error,
          };
          return ok(data);
        }

        case "key/save":
          await services.keyVault.setApiKey(
            request.payload.provider,
            request.payload.apiKey,
          );
          return ok();

        case "key/clear":
          await services.keyVault.clearApiKey(request.payload.provider);
          return ok();

        case "settings/set-model":
          await services.keyVault.setModel(
            request.payload.provider,
            request.payload.model,
          );
          return ok();

        case "settings/set-active-provider":
          await services.keyVault.setActiveProvider(request.payload.provider);
          return ok();

        case "settings/set-default-mode":
          await services.keyVault.setDefaultMode(request.payload.mode);
          return ok();

        case "history/set-enabled":
          await services.historyStore.setEnabled(request.payload.enabled);
          return ok();

        case "history/append":
          await services.historyStore.append(
            request.payload.docId,
            request.payload.entry,
          );
          return ok();

        case "history/get":
          return ok(await services.historyStore.get(request.payload.docId));

        case "history/export":
          return ok(await services.historyStore.exportAll());

        case "history/clear":
          await services.historyStore.clear(request.payload.docId);
          return ok();

        case "doc-context/get":
          return ok(await services.docContextStore.get(request.payload.docId));

        case "doc-context/set-brief":
          await services.docContextStore.setBrief(
            request.payload.docId,
            request.payload.brief,
          );
          return ok();

        case "doc-context/set-pact":
          await services.docContextStore.setPact(
            request.payload.docId,
            request.payload.pact,
          );
          return ok();

        case "doc-context/set-auto-mode":
          await services.docContextStore.setAutoMode(
            request.payload.docId,
            request.payload.autoMode,
          );
          return ok();

        case "doc-context/get-default-brief":
          return ok(await services.docContextStore.getDefaultBrief());

        case "doc-context/set-default-brief":
          await services.docContextStore.setDefaultBrief(request.payload.brief);
          return ok();

        case "gauth/connect": {
          const result = await services.googleAuth.getToken(
            request.payload.interactive,
          );
          if (result.ok) {
            return ok<GoogleAuthStatusData>({ connected: true });
          }
          return ok<GoogleAuthStatusData>({
            connected: false,
            reason: result.reason,
            error: result.error,
          });
        }

        case "gauth/redirect-url": {
          const info = services.googleAuth.describeClient();
          return ok<GoogleAuthRedirectData>(info);
        }

        case "gauth/forget": {
          await services.googleAuth.forgetToken("");
          return ok();
        }

        case "gdocs/cookie-export": {
          const { docId } = request.payload;
          if (!docId) {
            return ok({ ok: false, error: "missing docId" });
          }
          const result = await cookieExportFetch(docId);
          return ok(result);
        }

        case "gauth/status": {
          const result = await services.googleAuth.getToken(false);
          if (result.ok) {
            return ok<GoogleAuthStatusData>({ connected: true });
          }
          return ok<GoogleAuthStatusData>({
            connected: false,
            reason: result.reason === "denied" ? "no-token" : result.reason,
            error: result.error,
          });
        }

        case "gdocs/fetch": {
          const tokenResult = await services.googleAuth.getToken(false);
          if (!tokenResult.ok) {
            const data: GoogleDocsFetchData =
              tokenResult.reason === "unsupported" ||
              tokenResult.reason === "not-configured"
                ? {
                    ok: false,
                    reason: "not-configured",
                    error: tokenResult.error,
                  }
                : {
                    ok: false,
                    reason: "auth-required",
                    error: tokenResult.error,
                  };
            return ok(data);
          }
          let result = await fetchGoogleDoc(
            request.payload.docId,
            tokenResult.token,
          );
          if (!result.ok && result.reason === "auth-required") {
            await services.googleAuth.forgetToken(tokenResult.token);
            const retryToken = await services.googleAuth.getToken(false);
            if (retryToken.ok) {
              result = await fetchGoogleDoc(
                request.payload.docId,
                retryToken.token,
              );
            }
          }
          return ok<GoogleDocsFetchData>(result);
        }

        default:
          return fail(
            `unknown request type: ${(request as { type: string }).type}`,
          );
      }
    } catch (error) {
      return fail(error instanceof Error ? error.message : String(error));
    }
  };
}

interface CookieApi {
  getAll: (details: {
    url?: string;
    domain?: string;
  }) => Promise<{ name: string; value: string }[]>;
}

function getCookieApi(): CookieApi | null {
  const scope = globalThis as unknown as {
    browser?: { cookies?: CookieApi };
    chrome?: { cookies?: CookieApi };
  };
  return scope.browser?.cookies ?? scope.chrome?.cookies ?? null;
}

async function readGoogleDocsCookieHeader(): Promise<string | null> {
  const cookies = getCookieApi();
  if (!cookies) {
    console.warn(
      "[Luster bg] cookies API unavailable — `cookies` permission missing?",
    );
    return null;
  }
  try {
    const items = await cookies.getAll({ url: "https://docs.google.com/" });
    if (!items || items.length === 0) {
      console.warn(
        "[Luster bg] no docs.google.com cookies in store. Are you signed into Google in this browser profile?",
      );
      return null;
    }
    return items.map((entry) => `${entry.name}=${entry.value}`).join("; ");
  } catch (error) {
    console.warn("[Luster bg] cookies.getAll failed:", error);
    return null;
  }
}

async function cookieExportFetch(
  docId: string,
): Promise<
  | { ok: true; fullText: string }
  | { ok: false; status?: number; error?: string }
> {
  const url = `https://docs.google.com/document/d/${encodeURIComponent(
    docId,
  )}/export?format=txt`;

  const cookieHeader = await readGoogleDocsCookieHeader();
  const headers: Record<string, string> = { Accept: "text/plain" };
  if (cookieHeader) headers["Cookie"] = cookieHeader;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      credentials: "include",
      redirect: "follow",
      headers,
    });
  } catch (error) {
    console.warn("[Luster bg] cookie-export fetch threw:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  let text = "";
  try {
    text = await response.text();
  } catch (error) {
    console.warn("[Luster bg] cookie-export read body threw:", error);
    return {
      ok: false,
      status: response.status,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  const finalUrl = response.url;
  const contentType = response.headers.get("content-type") ?? "";
  const looksLikeLogin =
    /accounts\.google\.com|ServiceLogin/i.test(finalUrl) ||
    (contentType.includes("text/html") &&
      /sign in|signin|accounts\.google/i.test(text.slice(0, 500)));

  console.info("[Luster bg] cookie-export response", {
    status: response.status,
    finalUrl: finalUrl.slice(0, 120),
    contentType,
    textLength: text.length,
    firstChars: text.slice(0, 120),
    cookieHeaderPresent: cookieHeader !== null,
  });

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: text.slice(0, 200),
    };
  }
  if (looksLikeLogin) {
    return {
      ok: false,
      status: response.status,
      error: "redirected to login",
    };
  }
  if (contentType && !contentType.includes("text/plain")) {
    return {
      ok: false,
      status: response.status,
      error: `unexpected content-type: ${contentType}`,
    };
  }
  return { ok: true, fullText: text };
}

async function runMode(
  services: BackgroundServices,
  request: RunModeRequest,
): Promise<EngineRunResult> {
  const { payload } = request;
  const docContext = await services.docContextStore.get(payload.docId);
  if (payload.mode === "reading") {
    const input: ReadingEngineInput = {
      delta: payload.delta,
      stats: payload.stats,
      contextBefore: payload.contextBefore,
      brief: docContext.brief,
    };
    return services.modeEngines.reading.run(input);
  }
  if (payload.mode === "interrogation") {
    const input: InterrogationEngineInput = {
      delta: payload.delta,
      contextBefore: payload.contextBefore,
      lastQuestionKind: payload.lastQuestionKind,
      brief: docContext.brief,
    };
    return services.modeEngines.interrogation.run(input);
  }
  const input: CriticEngineInput = {
    delta: payload.delta,
    contextBefore: payload.contextBefore,
    brief: docContext.brief,
    pact: docContext.pact,
  };
  return services.modeEngines.critic.run(input);
}

function engineResultToData(
  mode: ModeName,
  result: EngineRunResult,
): RunModeResultData {
  if (result.ok) {
    return {
      ok: true,
      output: tagOutput(mode, result.output as unknown),
      tokens: result.tokens,
      provider: result.provider,
      model: result.model,
      promptVersion: result.promptVersion,
    };
  }
  return {
    ok: false,
    reason: result.reason,
    provider: result.provider,
    retryAfterMs: result.retryAfterMs,
    error: result.error,
  };
}

async function runEcho(
  services: BackgroundServices,
  request: RunEchoRequest,
): Promise<EchoEngineResult> {
  const docContext = await services.docContextStore.get(request.payload.docId);
  const input: EchoEngineInput = {
    fullText: request.payload.fullText,
    brief: docContext.brief,
  };
  return services.modeEngines.echo.run(input);
}

function tagOutput(mode: ModeName, output: unknown): ModeOutput {
  if (mode === "reading") {
    return { mode: "reading", result: output as ReadingOutput };
  }
  if (mode === "interrogation") {
    return { mode: "interrogation", result: output as InterrogationOutput };
  }
  if (mode === "echo") {
    return { mode: "echo", result: output as EchoOutput };
  }
  return { mode: "critic", result: output as CriticOutput };
}
