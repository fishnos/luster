export const BRIDGE_NAMESPACE = "luster-kix";

export type BridgeState = "attached" | "searching" | "unsupported";

export interface BridgeTextMessage {
  channel: typeof BRIDGE_NAMESPACE;
  type: "text";
  fullText: string;
  paragraphs: string[];
  glyphCount: number;
  generation: number;
}

export interface BridgeCaretMessage {
  channel: typeof BRIDGE_NAMESPACE;
  type: "caret";
  rect: { x: number; y: number; width: number; height: number } | null;
  docIndex: number | null;
}

export interface BridgeStateMessage {
  channel: typeof BRIDGE_NAMESPACE;
  type: "state";
  state: BridgeState;
}

export interface BridgeProbeRequestMessage {
  channel: typeof BRIDGE_NAMESPACE;
  type: "probe-request";
  requestId: string;
}

export interface BridgeProbeResponseMessage {
  channel: typeof BRIDGE_NAMESPACE;
  type: "probe-response";
  requestId: string;
  installed: boolean;
  fillTextCalls: number;
  strokeTextCalls: number;
  clearRectCalls: number;
  trackedEditorCanvases: number;
  totalCanvases: number;
  totalGlyphs: number;
  lastReconstructedTextLength: number;
  lastReconstructedParagraphCount: number;
  lastReconstructedSample: string;
  bridgeState: BridgeState;
  hasKixApp: boolean;
  caretSelectorPresent: boolean;
  candidateCanvases: BridgeCanvasInfo[];
}

export interface BridgeCanvasInfo {
  width: number;
  height: number;
  classChain: string;
  ancestorClasses: string;
  fillTextHits: number;
  isEditor: boolean;
}

export type BridgeMessage =
  | BridgeTextMessage
  | BridgeCaretMessage
  | BridgeStateMessage
  | BridgeProbeRequestMessage
  | BridgeProbeResponseMessage;

export function isBridgeMessage(value: unknown): value is BridgeMessage {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { channel?: unknown; type?: unknown };
  return (
    candidate.channel === BRIDGE_NAMESPACE && typeof candidate.type === "string"
  );
}
