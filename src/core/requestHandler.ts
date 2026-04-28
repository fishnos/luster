import type { BackgroundServices } from "@/core/backgroundServices";
import {
  fail,
  ok,
  type LusterRequest,
  type LusterResponse,
  type RunModeRequest,
  type RunModeResultData,
  type ValidateKeyResultData,
} from "@/core/messaging";
import type {
  CriticEngineInput,
  CriticEngineResult,
  InterrogationEngineInput,
  InterrogationEngineResult,
  ReadingEngineInput,
  ReadingEngineResult,
} from "@/core/modes";
import type {
  CriticOutput,
  InterrogationOutput,
  ModeName,
  ModeOutput,
  ReadingOutput,
} from "@/core/types";

export type EngineRunResult =
  | ReadingEngineResult
  | InterrogationEngineResult
  | CriticEngineResult;

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
          await services.keyVault.setActiveProvider(
            request.payload.mode,
            request.payload.provider,
          );
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

async function runMode(
  services: BackgroundServices,
  request: RunModeRequest,
): Promise<EngineRunResult> {
  const { payload } = request;
  if (payload.mode === "reading") {
    const input: ReadingEngineInput = {
      delta: payload.delta,
      stats: payload.stats,
      contextBefore: payload.contextBefore,
    };
    return services.modeEngines.reading.run(input);
  }
  if (payload.mode === "interrogation") {
    const input: InterrogationEngineInput = {
      delta: payload.delta,
      contextBefore: payload.contextBefore,
      lastQuestionKind: payload.lastQuestionKind,
    };
    return services.modeEngines.interrogation.run(input);
  }
  const input: CriticEngineInput = {
    delta: payload.delta,
    contextBefore: payload.contextBefore,
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

function tagOutput(mode: ModeName, output: unknown): ModeOutput {
  if (mode === "reading") {
    return { mode: "reading", result: output as ReadingOutput };
  }
  if (mode === "interrogation") {
    return { mode: "interrogation", result: output as InterrogationOutput };
  }
  return { mode: "critic", result: output as CriticOutput };
}
