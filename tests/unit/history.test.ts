import { describe, expect, it } from "vitest";
import { createHistoryStore, type HistoryEntry } from "@/core/history";
import { createInMemoryStorage } from "@/core/storageBackend";
import type { DocStats } from "@/core/stats";

const sampleStats: DocStats = {
  words: 12,
  sentences: 2,
  paragraphs: 1,
  characters: 60,
  avgSentenceWords: 6,
  longestSentenceWords: 8,
  fleschKincaidGrade: 7,
  passiveRatio: 0,
  repeatedOpeners: [],
  topWords: [],
};

function makeEntry(
  timestamp: number,
  mode: HistoryEntry["mode"] = "reading",
): HistoryEntry {
  return {
    timestamp,
    mode,
    stats: sampleStats,
    output: {
      mode: "reading",
      result: {
        voiceTrend: "measured",
        rhythm: "steady",
        paragraphPurpose: "opens the scene",
        transitionStrength: "soft",
        notes: ["note one"],
      },
    },
  };
}

describe("createHistoryStore", () => {
  it("starts disabled by default", async () => {
    const store = createHistoryStore(createInMemoryStorage());
    expect(await store.isEnabled()).toBe(false);
  });

  it("does not append entries while disabled", async () => {
    const store = createHistoryStore(createInMemoryStorage());
    await store.append("doc-1", makeEntry(1));
    expect(await store.get("doc-1")).toEqual([]);
  });

  it("appends entries once enabled", async () => {
    const store = createHistoryStore(createInMemoryStorage());
    await store.setEnabled(true);
    await store.append("doc-1", makeEntry(1));
    await store.append("doc-1", makeEntry(2));
    const entries = await store.get("doc-1");
    expect(entries).toHaveLength(2);
    expect(entries[0]!.timestamp).toBe(1);
    expect(entries[1]!.timestamp).toBe(2);
  });

  it("keeps separate buckets per docId and tracks the index", async () => {
    const store = createHistoryStore(createInMemoryStorage());
    await store.setEnabled(true);
    await store.append("doc-a", makeEntry(1));
    await store.append("doc-b", makeEntry(2));
    const exported = await store.exportAll();
    expect(exported.documents.map((entry) => entry.docId).sort()).toEqual([
      "doc-a",
      "doc-b",
    ]);
  });

  it("clears a single docId", async () => {
    const store = createHistoryStore(createInMemoryStorage());
    await store.setEnabled(true);
    await store.append("doc-a", makeEntry(1));
    await store.append("doc-b", makeEntry(2));
    await store.clear("doc-a");
    expect(await store.get("doc-a")).toEqual([]);
    expect(await store.get("doc-b")).toHaveLength(1);
    const exported = await store.exportAll();
    expect(exported.documents.map((entry) => entry.docId)).toEqual(["doc-b"]);
  });

  it("clears all docs when no docId is provided", async () => {
    const store = createHistoryStore(createInMemoryStorage());
    await store.setEnabled(true);
    await store.append("doc-a", makeEntry(1));
    await store.append("doc-b", makeEntry(2));
    await store.clear();
    expect((await store.exportAll()).documents).toEqual([]);
    expect(await store.get("doc-a")).toEqual([]);
  });

  it("exports the full payload sorted by docId index order", async () => {
    const store = createHistoryStore(createInMemoryStorage());
    await store.setEnabled(true);
    await store.append("first", makeEntry(1));
    await store.append("second", makeEntry(2));
    await store.append("first", makeEntry(3, "critic"));

    const exported = await store.exportAll();
    expect(exported.exportedAt).toBeGreaterThan(0);
    expect(exported.documents).toEqual([
      { docId: "first", entries: expect.any(Array) },
      { docId: "second", entries: expect.any(Array) },
    ]);
    expect(exported.documents[0]!.entries).toHaveLength(2);
  });
});
