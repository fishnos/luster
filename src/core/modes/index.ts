import type { AiClient } from "@/core/aiClient";
import { createReadingEngine, type ReadingEngine } from "@/core/modes/reading";
import {
  createInterrogationEngine,
  type InterrogationEngine,
} from "@/core/modes/interrogation";
import { createCriticEngine, type CriticEngine } from "@/core/modes/critic";
import { createEchoEngine, type EchoEngine } from "@/core/modes/echo";

export interface ModeEnginesDeps {
  aiClient: AiClient;
}

export interface ModeEngines {
  reading: ReadingEngine;
  interrogation: InterrogationEngine;
  critic: CriticEngine;
  echo: EchoEngine;
}

export function createModeEngines(deps: ModeEnginesDeps): ModeEngines {
  return {
    reading: createReadingEngine(deps),
    interrogation: createInterrogationEngine(deps),
    critic: createCriticEngine(deps),
    echo: createEchoEngine(deps),
  };
}

export type {
  ReadingEngine,
  ReadingEngineInput,
  ReadingEngineResult,
} from "@/core/modes/reading";
export type {
  InterrogationEngine,
  InterrogationEngineInput,
  InterrogationEngineResult,
} from "@/core/modes/interrogation";
export type {
  CriticEngine,
  CriticEngineInput,
  CriticEngineResult,
} from "@/core/modes/critic";
export type {
  EchoEngine,
  EchoEngineInput,
  EchoEngineResult,
} from "@/core/modes/echo";
