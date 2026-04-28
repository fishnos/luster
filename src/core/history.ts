import type { StorageBackend } from "@/core/storageBackend";
import type { ModeName, ModeOutput, TokenUsage } from "@/core/types";
import type { DocStats } from "@/core/stats";

const ENABLED_KEY = "luster.history.enabled";
const DOC_INDEX_KEY = "luster.history.docIndex";
const DOC_PREFIX = "luster.history.doc.";
const MAX_ENTRIES_PER_DOC = 200;

export interface HistoryEntry {
  timestamp: number;
  mode: ModeName;
  stats: DocStats;
  output: ModeOutput;
  tokens?: TokenUsage;
}

export interface HistoryExport {
  exportedAt: number;
  documents: { docId: string; entries: HistoryEntry[] }[];
}

export interface HistoryStore {
  isEnabled: () => Promise<boolean>;
  setEnabled: (enabled: boolean) => Promise<void>;
  append: (docId: string, entry: HistoryEntry) => Promise<void>;
  get: (docId: string) => Promise<HistoryEntry[]>;
  exportAll: () => Promise<HistoryExport>;
  clear: (docId?: string) => Promise<void>;
}

export function createHistoryStore(storage: StorageBackend): HistoryStore {
  function docKey(docId: string): string {
    return `${DOC_PREFIX}${docId}`;
  }

  async function readDocIndex(): Promise<string[]> {
    const result = await storage.getMany([DOC_INDEX_KEY]);
    const value = result[DOC_INDEX_KEY];
    return Array.isArray(value) ? (value as string[]) : [];
  }

  async function writeDocIndex(docIds: string[]): Promise<void> {
    await storage.setMany({ [DOC_INDEX_KEY]: docIds });
  }

  return {
    async isEnabled() {
      const result = await storage.getMany([ENABLED_KEY]);
      return result[ENABLED_KEY] === true;
    },

    async setEnabled(enabled) {
      await storage.setMany({ [ENABLED_KEY]: enabled === true });
    },

    async append(docId, entry) {
      const enabled = await this.isEnabled();
      if (!enabled) return;

      const result = await storage.getMany([docKey(docId)]);
      const existing = Array.isArray(result[docKey(docId)])
        ? (result[docKey(docId)] as HistoryEntry[])
        : [];
      const next = [...existing, entry];
      const trimmed =
        next.length > MAX_ENTRIES_PER_DOC
          ? next.slice(next.length - MAX_ENTRIES_PER_DOC)
          : next;

      await storage.setMany({ [docKey(docId)]: trimmed });

      const docIndex = await readDocIndex();
      if (!docIndex.includes(docId)) {
        await writeDocIndex([...docIndex, docId]);
      }
    },

    async get(docId) {
      const result = await storage.getMany([docKey(docId)]);
      const value = result[docKey(docId)];
      return Array.isArray(value) ? (value as HistoryEntry[]) : [];
    },

    async exportAll() {
      const docIndex = await readDocIndex();
      const docKeys = docIndex.map(docKey);
      const result = await storage.getMany(docKeys);
      const documents = docIndex.map((docId) => ({
        docId,
        entries: Array.isArray(result[docKey(docId)])
          ? (result[docKey(docId)] as HistoryEntry[])
          : [],
      }));
      return { exportedAt: Date.now(), documents };
    },

    async clear(docId) {
      if (docId) {
        await storage.remove([docKey(docId)]);
        const docIndex = await readDocIndex();
        await writeDocIndex(docIndex.filter((known) => known !== docId));
        return;
      }
      const docIndex = await readDocIndex();
      const docKeys = docIndex.map(docKey);
      if (docKeys.length > 0) await storage.remove(docKeys);
      await writeDocIndex([]);
    },
  };
}
