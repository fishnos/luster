import type { CommitDelta } from "@/adapters/types";
import type { ModeName } from "@/core/types";
import type { AutoModeReason } from "@/ui/state";

const FEATURE_WINDOW_MS = 60_000;
const EVALUATION_INTERVAL_MS = 2_000;
const MIN_SWITCH_GAP_MS = 12_000;
const MANUAL_OVERRIDE_LOCKOUT_MS = 30_000;
const FLOW_WPM_THRESHOLD = 55;
const CONFIDENCE_FLOOR = 0.45;
const CURRENT_MODE_BONUS = 0.15;

export type Phase = "drafting" | "thinking" | "revising" | "polishing" | "flow";

export interface DynamicModeSelectorDeps {
  isEnabled: () => boolean;
  isPactSet: () => boolean;
  getActiveMode: () => ModeName;
  applySwitch: (mode: ModeName, reason: AutoModeReason) => void;
  now?: () => number;
  schedule?: (callback: () => void, intervalMs: number) => () => void;
}

export interface DynamicModeSelector {
  recordTextChange: (text: string) => void;
  recordCommit: (delta: CommitDelta) => void;
  noteManualSwitch: () => void;
  evaluateNow: () => Phase | null;
  detach: () => void;
}

interface TextEvent {
  timestamp: number;
  textLength: number;
  wordCount: number;
}

interface CommitEvent {
  timestamp: number;
  reason: CommitDelta["reason"];
}

export function createDynamicModeSelector(
  deps: DynamicModeSelectorDeps,
): DynamicModeSelector {
  const now = deps.now ?? Date.now;
  const schedule = deps.schedule ?? defaultSchedule;

  const textEvents: TextEvent[] = [];
  const commitEvents: CommitEvent[] = [];
  let lastSwitchAt = 0;
  let manualOverrideUntil = 0;

  function pruneOldEvents(): void {
    const cutoff = now() - FEATURE_WINDOW_MS;
    while (textEvents.length > 0 && textEvents[0]!.timestamp < cutoff) {
      textEvents.shift();
    }
    while (commitEvents.length > 0 && commitEvents[0]!.timestamp < cutoff) {
      commitEvents.shift();
    }
  }

  function evaluate(): Phase | null {
    pruneOldEvents();
    if (!deps.isEnabled()) return null;
    const moment = now();
    if (moment < manualOverrideUntil) return null;
    if (moment - lastSwitchAt < MIN_SWITCH_GAP_MS) return null;

    const features = computeFeatures(textEvents, commitEvents, moment);
    const phase = classifyPhase(features, deps.getActiveMode());
    if (!phase) return null;

    if (phase.score < CONFIDENCE_FLOOR) return null;

    const targetMode = pickModeForPhase(phase.phase, deps.isPactSet());
    if (!targetMode) return phase.phase;

    if (targetMode.mode === deps.getActiveMode()) {
      lastSwitchAt = moment;
      return phase.phase;
    }

    deps.applySwitch(targetMode.mode, targetMode.reason);
    lastSwitchAt = moment;
    return phase.phase;
  }

  const cancelSchedule = schedule(evaluate, EVALUATION_INTERVAL_MS);

  return {
    recordTextChange(text) {
      textEvents.push({
        timestamp: now(),
        textLength: text.length,
        wordCount: countWords(text),
      });
      pruneOldEvents();
    },
    recordCommit(delta) {
      commitEvents.push({ timestamp: now(), reason: delta.reason });
      pruneOldEvents();
    },
    noteManualSwitch() {
      manualOverrideUntil = now() + MANUAL_OVERRIDE_LOCKOUT_MS;
    },
    evaluateNow: evaluate,
    detach() {
      cancelSchedule();
    },
  };
}

interface Features {
  wpm10s: number;
  wpm60s: number;
  msSinceLastKey: number;
  msSinceLastCommit: number;
  deleteInsertRatio30s: number;
  wordDeltaSign: number;
  paragraphJustCommitted: boolean;
  sentenceJustCommitted: boolean;
  textChangeBurstiness: number;
  totalKeyEvents: number;
}

function computeFeatures(
  textEvents: TextEvent[],
  commitEvents: CommitEvent[],
  moment: number,
): Features {
  const lastTextEvent = textEvents.at(-1);
  const lastCommitEvent = commitEvents.at(-1);

  const wpm10s = computeWordsPerMinuteWithin(textEvents, moment, 10_000);
  const wpm60s = computeWordsPerMinuteWithin(textEvents, moment, 60_000);

  const msSinceLastKey = lastTextEvent
    ? moment - lastTextEvent.timestamp
    : Number.POSITIVE_INFINITY;
  const msSinceLastCommit = lastCommitEvent
    ? moment - lastCommitEvent.timestamp
    : Number.POSITIVE_INFINITY;

  const within30s = textEvents.filter(
    (event) => moment - event.timestamp <= 30_000,
  );
  let totalGains = 0;
  let totalLosses = 0;
  for (let index = 1; index < within30s.length; index++) {
    const previous = within30s[index - 1]!.textLength;
    const current = within30s[index]!.textLength;
    const change = current - previous;
    if (change >= 0) totalGains += change;
    else totalLosses += -change;
  }
  const totalChanges = totalGains + totalLosses;
  const deleteInsertRatio30s =
    totalChanges === 0 ? 0 : totalLosses / totalChanges;

  const wordDeltaSign = signOfRecentWordDelta(within30s);
  const paragraphJustCommitted =
    lastCommitEvent !== undefined &&
    lastCommitEvent.reason === "paragraph-break" &&
    moment - lastCommitEvent.timestamp < 12_000;
  const sentenceJustCommitted =
    lastCommitEvent !== undefined &&
    lastCommitEvent.reason === "sentence-completed" &&
    moment - lastCommitEvent.timestamp < 12_000;

  const intervals = consecutiveIntervals(within30s);
  const textChangeBurstiness = burstinessFromIntervals(intervals);

  return {
    wpm10s,
    wpm60s,
    msSinceLastKey,
    msSinceLastCommit,
    deleteInsertRatio30s,
    wordDeltaSign,
    paragraphJustCommitted,
    sentenceJustCommitted,
    textChangeBurstiness,
    totalKeyEvents: textEvents.length,
  };
}

function classifyPhase(
  features: Features,
  currentMode: ModeName,
): { phase: Phase; score: number } | null {
  if (features.totalKeyEvents < 2) return null;

  const flowScore =
    features.wpm10s > FLOW_WPM_THRESHOLD && features.deleteInsertRatio30s < 0.2
      ? 1
      : 0;
  if (flowScore > 0) return { phase: "flow", score: flowScore };

  const draftingScore =
    clamp01((features.wpm60s - 5) / 40) * 0.3 +
    (features.wordDeltaSign > 0 ? 0.3 : 0) +
    (features.deleteInsertRatio30s < 0.25 ? 0.2 : 0) +
    (features.paragraphJustCommitted ? 0.2 : 0);

  const thinkingScore =
    (features.msSinceLastKey > 8_000 ? 0.4 : 0) +
    (features.sentenceJustCommitted || features.paragraphJustCommitted
      ? 0.3
      : 0) +
    (features.deleteInsertRatio30s < 0.3 ? 0.2 : 0) +
    (features.wpm10s < 5 ? 0.1 : 0);

  const revisingScore =
    (features.deleteInsertRatio30s > 0.4 ? 0.4 : 0) +
    (features.wordDeltaSign <= 0 ? 0.2 : 0) +
    (features.msSinceLastKey < 4_000 ? 0.2 : 0) +
    (features.deleteInsertRatio30s > 0.6 ? 0.2 : 0);

  const polishingScore =
    (features.deleteInsertRatio30s > 0.2 && features.deleteInsertRatio30s < 0.5
      ? 0.3
      : 0) +
    (features.wpm60s < 25 && features.wpm60s > 5 ? 0.3 : 0) +
    (features.textChangeBurstiness > 0.5 ? 0.2 : 0) +
    (features.wordDeltaSign === 0 ? 0.2 : 0);

  const candidates: { phase: Phase; score: number }[] = [
    { phase: "drafting", score: draftingScore },
    { phase: "thinking", score: thinkingScore },
    { phase: "revising", score: revisingScore },
    { phase: "polishing", score: polishingScore },
  ];

  for (const candidate of candidates) {
    if (modeForPhase(candidate.phase) === currentMode) {
      candidate.score += CURRENT_MODE_BONUS;
    }
  }

  return candidates.reduce<{ phase: Phase; score: number } | null>(
    (best, candidate) =>
      best === null || candidate.score > best.score ? candidate : best,
    null,
  );
}

function pickModeForPhase(
  phase: Phase,
  pactSet: boolean,
): { mode: ModeName; reason: AutoModeReason } | null {
  if (phase === "flow") return null;
  if (phase === "drafting") {
    return { mode: "reading", reason: "drafting-paragraph-commit" };
  }
  if (phase === "thinking") {
    return { mode: "interrogation", reason: "thinking-pause" };
  }
  if (phase === "revising") {
    return {
      mode: "critic",
      reason: pactSet ? "revising-edits" : "revising-edits",
    };
  }
  return { mode: "critic", reason: "polishing-touchups" };
}

function modeForPhase(phase: Phase): ModeName | null {
  if (phase === "drafting") return "reading";
  if (phase === "thinking") return "interrogation";
  if (phase === "revising" || phase === "polishing") return "critic";
  return null;
}

function computeWordsPerMinuteWithin(
  textEvents: TextEvent[],
  moment: number,
  windowMs: number,
): number {
  const windowStart = moment - windowMs;
  const inWindow = textEvents.filter((event) => event.timestamp >= windowStart);
  if (inWindow.length < 2) return 0;
  const first = inWindow[0]!;
  const last = inWindow.at(-1)!;
  const wordsAdded = Math.max(0, last.wordCount - first.wordCount);
  const minutes = (last.timestamp - first.timestamp) / 60_000;
  if (minutes <= 0) return 0;
  return wordsAdded / minutes;
}

function signOfRecentWordDelta(events: TextEvent[]): number {
  if (events.length < 2) return 0;
  const first = events[0]!;
  const last = events.at(-1)!;
  const delta = last.wordCount - first.wordCount;
  if (delta > 2) return 1;
  if (delta < -2) return -1;
  return 0;
}

function consecutiveIntervals(events: TextEvent[]): number[] {
  if (events.length < 2) return [];
  const intervals: number[] = [];
  for (let index = 1; index < events.length; index++) {
    intervals.push(events[index]!.timestamp - events[index - 1]!.timestamp);
  }
  return intervals;
}

function burstinessFromIntervals(intervals: number[]): number {
  if (intervals.length === 0) return 0;
  const mean =
    intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  if (mean === 0) return 0;
  const variance =
    intervals.reduce((sum, value) => sum + (value - mean) * (value - mean), 0) /
    intervals.length;
  const stddev = Math.sqrt(variance);
  const cv = stddev / mean;
  return clamp01((cv - 1) / 2);
}

function countWords(text: string): number {
  const matches = text.toLowerCase().match(/[a-z][a-z'’-]*/g);
  return matches?.length ?? 0;
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function defaultSchedule(callback: () => void, intervalMs: number): () => void {
  const handle = setInterval(callback, intervalMs);
  return () => clearInterval(handle);
}
