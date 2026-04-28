import { describe, expect, it } from "vitest";
import {
  reconstructDocument,
  type RawGlyph,
} from "@/runtime/canvasGlyphReader";

function glyphLine(
  text: string,
  startX: number,
  y: number,
  fontSize = 14,
): RawGlyph[] {
  const glyphWidth = fontSize * 0.55;
  return [...text].map((char, index) => ({
    text: char,
    x: startX + index * glyphWidth,
    y,
    fontSize,
  }));
}

describe("reconstructDocument", () => {
  it("returns empty document for no glyphs", () => {
    const result = reconstructDocument([]);
    expect(result.fullText).toBe("");
    expect(result.paragraphs).toEqual([]);
  });

  it("reconstructs a single line", () => {
    const glyphs = glyphLine("Hello world", 100, 200);
    const result = reconstructDocument(glyphs);
    expect(result.paragraphs).toEqual(["Hello world"]);
  });

  it("reconstructs multiple lines in a single paragraph", () => {
    const glyphs = [
      ...glyphLine("First line continues", 100, 200),
      ...glyphLine("on the next line.", 100, 220),
    ];
    const result = reconstructDocument(glyphs);
    expect(result.paragraphs).toHaveLength(1);
    expect(result.paragraphs[0]).toBe("First line continues on the next line.");
  });

  it("splits paragraphs on a large vertical gap", () => {
    const glyphs = [
      ...glyphLine("First paragraph here.", 100, 200),
      ...glyphLine("Second paragraph here.", 100, 260),
    ];
    const result = reconstructDocument(glyphs);
    expect(result.paragraphs).toEqual([
      "First paragraph here.",
      "Second paragraph here.",
    ]);
  });

  it("detects word breaks from horizontal gaps when characters are emitted as separate runs", () => {
    const glyphs = [
      { text: "Hello", x: 100, y: 200, fontSize: 14 },
      { text: "world", x: 160, y: 200, fontSize: 14 },
    ];
    const result = reconstructDocument(glyphs);
    expect(result.paragraphs[0]).toBe("Hello world");
  });

  it("returns line rects sorted top-to-bottom", () => {
    const glyphs = [
      ...glyphLine("Bottom", 100, 260),
      ...glyphLine("Top", 100, 200),
    ];
    const result = reconstructDocument(glyphs);
    expect(result.lineRects).toHaveLength(2);
    expect(result.lineRects[0]!.y).toBeLessThan(result.lineRects[1]!.y);
  });
});
