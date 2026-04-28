import { describe, expect, it } from "vitest";
import { splitParagraphs, splitSentences } from "@/lib/sentenceSplit";

describe("splitSentences", () => {
  it("splits simple sentences", () => {
    const result = splitSentences("Hello world. This is a test. And one more!");
    expect(result.map((sentence) => sentence.text)).toEqual([
      "Hello world.",
      "This is a test.",
      "And one more!",
    ]);
  });

  it("keeps Mr. / Mrs. / Dr. abbreviations attached", () => {
    const result = splitSentences(
      "Mr. Smith met Dr. Jones today. Then they left.",
    );
    expect(result).toHaveLength(2);
    expect(result[0]!.text).toBe("Mr. Smith met Dr. Jones today.");
  });

  it("handles ellipses without splitting mid-sentence", () => {
    const result = splitSentences(
      "She paused... then continued speaking. After that, silence.",
    );
    expect(result).toHaveLength(2);
  });

  it("handles initials like J. R. R. Tolkien", () => {
    const result = splitSentences(
      "J. R. R. Tolkien wrote books. He was prolific.",
    );
    expect(result).toHaveLength(2);
    expect(result[0]!.text).toBe("J. R. R. Tolkien wrote books.");
  });

  it("keeps trailing close-quotes with the sentence", () => {
    const result = splitSentences('"Get out!" he yelled. She did not move.');
    expect(result).toHaveLength(2);
  });

  it("handles a sentence with no terminator at the end", () => {
    const result = splitSentences("Just a fragment with no period");
    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe("Just a fragment with no period");
  });

  it("returns offsets that round-trip into the source", () => {
    const source = "First sentence. Second one!";
    const result = splitSentences(source);
    expect(result).toHaveLength(2);
    expect(source.slice(result[0]!.start, result[0]!.end)).toBe(
      "First sentence.",
    );
    expect(source.slice(result[1]!.start, result[1]!.end)).toBe("Second one!");
  });

  it("keeps periods inside abbreviations like U.S. attached to the same sentence", () => {
    const result = splitSentences(
      "U.S. citizens travel widely. They are seen everywhere.",
    );
    expect(result).toHaveLength(2);
  });

  it("returns empty for empty input", () => {
    expect(splitSentences("")).toEqual([]);
    expect(splitSentences("   \n  ")).toEqual([]);
  });
});

describe("splitParagraphs", () => {
  it("splits on blank lines", () => {
    const result = splitParagraphs(
      "First paragraph.\n\nSecond paragraph.\n\n\nThird.",
    );
    expect(result).toEqual(["First paragraph.", "Second paragraph.", "Third."]);
  });

  it("keeps a single paragraph intact", () => {
    expect(splitParagraphs("One block.\nWith line break.")).toEqual([
      "One block.\nWith line break.",
    ]);
  });
});
