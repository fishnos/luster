import { describe, expect, it, vi } from "vitest";
import { createTextStream } from "@/core/textStream";
import type { CommitDelta } from "@/adapters/types";

describe("createTextStream", () => {
  it("emits a sentence commit once a new sentence has started after it", () => {
    const stream = createTextStream();
    const observer = vi.fn();
    stream.onCommit(observer);

    stream.update("Hello world");
    expect(observer).not.toHaveBeenCalled();

    stream.update("Hello world.");
    expect(observer).not.toHaveBeenCalled();

    stream.update("Hello world. T");
    expect(observer).toHaveBeenCalledTimes(1);
    const firstDelta = observer.mock.calls[0]![0] as CommitDelta;
    expect(firstDelta.reason).toBe("sentence-completed");
    expect(firstDelta.sentence).toBe("Hello world.");
    expect(firstDelta.sentenceIndex).toBe(0);
  });

  it("does not double-commit sentences across multiple updates", () => {
    const stream = createTextStream();
    const observer = vi.fn();
    stream.onCommit(observer);

    stream.update("First sentence. Second one starts");
    stream.update("First sentence. Second one starts now");
    stream.update("First sentence. Second one starts now and");
    expect(observer).toHaveBeenCalledTimes(1);
  });

  it("emits multiple commits when several sentences finish in one update", () => {
    const stream = createTextStream();
    const collected: CommitDelta[] = [];
    stream.onCommit((delta) => collected.push(delta));

    stream.update("One. Two. Three. F");
    expect(collected).toHaveLength(3);
    expect(collected.map((delta) => delta.sentence)).toEqual([
      "One.",
      "Two.",
      "Three.",
    ]);
  });

  it("signalParagraphBreak commits the in-progress sentence", () => {
    const stream = createTextStream();
    const observer = vi.fn();
    stream.onCommit(observer);

    stream.update("A finished sentence here.");
    expect(observer).not.toHaveBeenCalled();

    stream.signalParagraphBreak();
    expect(observer).toHaveBeenCalledTimes(1);
    const delta = observer.mock.calls[0]![0] as CommitDelta;
    expect(delta.reason).toBe("paragraph-break");
    expect(delta.sentence).toBe("A finished sentence here.");
  });

  it("flush commits any pending in-progress sentences", () => {
    const stream = createTextStream();
    const observer = vi.fn();
    stream.onCommit(observer);

    stream.update("Trailing sentence.");
    stream.flush();
    expect(observer).toHaveBeenCalledTimes(1);
    expect((observer.mock.calls[0]![0] as CommitDelta).reason).toBe("flush");
  });

  it("reset clears state so the same text re-commits", () => {
    const stream = createTextStream();
    const observer = vi.fn();
    stream.onCommit(observer);

    stream.update("One. Two starts");
    expect(observer).toHaveBeenCalledTimes(1);

    stream.reset();
    stream.update("One. Two starts");
    expect(observer).toHaveBeenCalledTimes(2);
  });

  it("locates the containing paragraph for each committed sentence", () => {
    const stream = createTextStream();
    const collected: CommitDelta[] = [];
    stream.onCommit((delta) => collected.push(delta));

    stream.update(
      "First paragraph sentence.\n\nSecond paragraph sentence. Third",
    );
    expect(collected).toHaveLength(2);
    expect(collected[0]!.paragraphIndex).toBe(0);
    expect(collected[1]!.paragraphIndex).toBe(1);
    expect(collected[0]!.paragraph).toBe("First paragraph sentence.");
    expect(
      collected[1]!.paragraph.startsWith("Second paragraph sentence."),
    ).toBe(true);
  });

  it("unsubscribe stops further commits", () => {
    const stream = createTextStream();
    const observer = vi.fn();
    const unsubscribe = stream.onCommit(observer);

    stream.update("One. Two starts");
    expect(observer).toHaveBeenCalledTimes(1);

    unsubscribe();
    stream.update("One. Two. Three starts");
    expect(observer).toHaveBeenCalledTimes(1);
  });
});
