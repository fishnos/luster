import type { StorageBackend } from "@/core/storageBackend";

const DOC_CONTEXT_PREFIX = "luster.docContext.";
const DEFAULT_BRIEF_KEY = "luster.docContext.defaultBrief";

export const DOC_BRIEF_MAX_LENGTH = 2000;
export const DOC_PACT_MAX_LENGTH = 240;

export interface DocContext {
  brief: string;
  pact: string;
  autoMode: boolean;
}

export const EMPTY_DOC_CONTEXT: DocContext = {
  brief: "",
  pact: "",
  autoMode: false,
};

export interface DocContextStore {
  get: (docId: string) => Promise<DocContext>;
  setBrief: (docId: string, brief: string) => Promise<void>;
  setPact: (docId: string, pact: string) => Promise<void>;
  setAutoMode: (docId: string, autoMode: boolean) => Promise<void>;
  getDefaultBrief: () => Promise<string>;
  setDefaultBrief: (brief: string) => Promise<void>;
}

export function createDocContextStore(
  storage: StorageBackend,
): DocContextStore {
  function keyFor(docId: string): string {
    return `${DOC_CONTEXT_PREFIX}${docId}`;
  }

  async function readDocContext(docId: string): Promise<DocContext> {
    const result = await storage.getMany([keyFor(docId)]);
    return normalize(result[keyFor(docId)]);
  }

  async function writeDocContext(
    docId: string,
    next: DocContext,
  ): Promise<void> {
    await storage.setMany({ [keyFor(docId)]: next });
  }

  return {
    async get(docId) {
      const stored = await readDocContext(docId);
      if (stored.brief.length > 0) return stored;
      const defaultBrief = await this.getDefaultBrief();
      return { ...stored, brief: defaultBrief };
    },

    async setBrief(docId, brief) {
      const trimmed = brief.slice(0, DOC_BRIEF_MAX_LENGTH);
      const current = await readDocContext(docId);
      await writeDocContext(docId, { ...current, brief: trimmed });
    },

    async setPact(docId, pact) {
      const trimmed = pact.slice(0, DOC_PACT_MAX_LENGTH);
      const current = await readDocContext(docId);
      await writeDocContext(docId, { ...current, pact: trimmed });
    },

    async setAutoMode(docId, autoMode) {
      const current = await readDocContext(docId);
      await writeDocContext(docId, { ...current, autoMode });
    },

    async getDefaultBrief() {
      const result = await storage.getMany([DEFAULT_BRIEF_KEY]);
      const value = result[DEFAULT_BRIEF_KEY];
      return typeof value === "string" ? value : "";
    },

    async setDefaultBrief(brief) {
      const trimmed = brief.slice(0, DOC_BRIEF_MAX_LENGTH);
      await storage.setMany({ [DEFAULT_BRIEF_KEY]: trimmed });
    },
  };
}

function normalize(value: unknown): DocContext {
  if (!value || typeof value !== "object") return { ...EMPTY_DOC_CONTEXT };
  const candidate = value as Partial<DocContext>;
  return {
    brief:
      typeof candidate.brief === "string"
        ? candidate.brief.slice(0, DOC_BRIEF_MAX_LENGTH)
        : "",
    pact:
      typeof candidate.pact === "string"
        ? candidate.pact.slice(0, DOC_PACT_MAX_LENGTH)
        : "",
    autoMode: candidate.autoMode === true,
  };
}
