export interface RawGlyph {
  text: string;
  x: number;
  y: number;
  fontSize: number;
}

export interface ReconstructedDocument {
  fullText: string;
  paragraphs: string[];
  lineRects: Array<{ x: number; y: number; width: number; height: number }>;
}

interface Line {
  glyphs: RawGlyph[];
  yCenter: number;
  fontSize: number;
}

const LINE_GROUP_TOLERANCE_RATIO = 0.45;
const PARAGRAPH_GAP_RATIO = 1.45;
const PARAGRAPH_FALLBACK_FONT_RATIO = 1.6;
const WORD_GAP_FACTOR = 0.55;

export function reconstructDocument(glyphs: RawGlyph[]): ReconstructedDocument {
  if (glyphs.length === 0) {
    return { fullText: "", paragraphs: [], lineRects: [] };
  }

  const lines = clusterIntoLines(glyphs);
  if (lines.length === 0) {
    return { fullText: "", paragraphs: [], lineRects: [] };
  }

  lines.sort((left, right) => left.yCenter - right.yCenter);

  const lineGaps = computeLineGaps(lines);
  const medianLineGap = lineGaps.length >= 3 ? median(lineGaps) : 0;

  const paragraphs: string[] = [];
  const lineRects: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }> = [];
  let currentParagraphLines: string[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex]!;
    line.glyphs.sort((left, right) => left.x - right.x);
    const lineText = renderLineText(line);
    if (lineText.length > 0) currentParagraphLines.push(lineText);
    lineRects.push(computeLineRect(line));

    const nextLine = lines[lineIndex + 1];
    if (!nextLine) {
      flushParagraph(paragraphs, currentParagraphLines);
      currentParagraphLines = [];
      continue;
    }
    const gap = nextLine.yCenter - line.yCenter;
    const paragraphThreshold = Math.max(
      medianLineGap * PARAGRAPH_GAP_RATIO,
      line.fontSize * PARAGRAPH_FALLBACK_FONT_RATIO,
    );
    if (gap > paragraphThreshold) {
      flushParagraph(paragraphs, currentParagraphLines);
      currentParagraphLines = [];
    }
  }

  if (currentParagraphLines.length > 0) {
    flushParagraph(paragraphs, currentParagraphLines);
  }

  const fullText = paragraphs.join("\n\n");
  return { fullText, paragraphs, lineRects };
}

function clusterIntoLines(glyphs: RawGlyph[]): Line[] {
  const sorted = [...glyphs].sort((left, right) => left.y - right.y);
  const lines: Line[] = [];
  for (const glyph of sorted) {
    const targetLine = findContainingLine(lines, glyph);
    if (targetLine) {
      targetLine.glyphs.push(glyph);
      targetLine.yCenter =
        (targetLine.yCenter * (targetLine.glyphs.length - 1) + glyph.y) /
        targetLine.glyphs.length;
      targetLine.fontSize = Math.max(targetLine.fontSize, glyph.fontSize);
    } else {
      lines.push({
        glyphs: [glyph],
        yCenter: glyph.y,
        fontSize: glyph.fontSize,
      });
    }
  }
  return lines;
}

function findContainingLine(lines: Line[], glyph: RawGlyph): Line | null {
  for (const line of lines) {
    const tolerance = Math.max(2, line.fontSize * LINE_GROUP_TOLERANCE_RATIO);
    if (Math.abs(line.yCenter - glyph.y) <= tolerance) return line;
  }
  return null;
}

function computeLineGaps(lines: Line[]): number[] {
  const gaps: number[] = [];
  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    gaps.push(lines[lineIndex]!.yCenter - lines[lineIndex - 1]!.yCenter);
  }
  return gaps;
}

function renderLineText(line: Line): string {
  const widths = line.glyphs
    .filter((glyph) => glyph.text.trim().length > 0)
    .map((glyph) => Math.max(glyph.fontSize * 0.4, 1));
  const medianGlyphWidth = median(widths) || line.fontSize * 0.5;
  const wordGap = medianGlyphWidth * 1.5;

  let buffer = "";
  let lastX: number | null = null;
  let lastWidth = medianGlyphWidth;
  for (const glyph of line.glyphs) {
    if (glyph.text.length === 0) continue;
    if (lastX !== null) {
      const gap = glyph.x - lastX - lastWidth;
      const explicitSpace = glyph.text.startsWith(" ");
      if (!explicitSpace && gap > wordGap * WORD_GAP_FACTOR) {
        buffer += " ";
      }
    }
    buffer += glyph.text;
    lastX = glyph.x;
    lastWidth = Math.max(
      glyph.fontSize * glyph.text.length * 0.4,
      medianGlyphWidth,
    );
  }
  return buffer.replace(/\s+/g, " ").trim();
}

function computeLineRect(line: Line): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (line.glyphs.length === 0) {
    return { x: 0, y: line.yCenter, width: 0, height: line.fontSize };
  }
  let minX = Infinity;
  let maxX = -Infinity;
  for (const glyph of line.glyphs) {
    if (glyph.x < minX) minX = glyph.x;
    const right =
      glyph.x + Math.max(glyph.fontSize * glyph.text.length * 0.5, 1);
    if (right > maxX) maxX = right;
  }
  return {
    x: minX,
    y: line.yCenter - line.fontSize * 0.5,
    width: maxX - minX,
    height: line.fontSize * 1.2,
  };
}

function flushParagraph(target: string[], lineTexts: string[]): void {
  const joined = lineTexts.join(" ").replace(/\s+/g, " ").trim();
  if (joined.length > 0) target.push(joined);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1]! + sorted[middle]!) / 2;
  }
  return sorted[middle]!;
}
