import { describe, expect, it } from "vitest";
import { z } from "zod";
import { extractJson, safeParse } from "@/core/modes/parse";

const ExampleSchema = z.object({
  voice: z.string().min(1),
  notes: z.array(z.string()).max(3).default([]),
});

describe("extractJson", () => {
  it("returns the input unchanged when it is already a JSON object", () => {
    const input = '{"a":1}';
    expect(extractJson(input)).toBe('{"a":1}');
  });

  it("strips ```json fences", () => {
    const input = '```json\n{"a":1}\n```';
    expect(extractJson(input)).toBe('{"a":1}');
  });

  it("strips bare ``` fences", () => {
    const input = '```\n{"a":1}\n```';
    expect(extractJson(input)).toBe('{"a":1}');
  });

  it("extracts the JSON object from a response with a preamble", () => {
    const input = 'Here\'s the result: {"a":1, "b":2} hope that helps';
    expect(extractJson(input)).toBe('{"a":1, "b":2}');
  });

  it("extracts a JSON array when no object is present", () => {
    const input = '```json\n["one","two"]\n```';
    expect(extractJson(input)).toBe('["one","two"]');
  });
});

describe("safeParse", () => {
  it("parses a clean JSON object against a schema", () => {
    const result = safeParse(
      ExampleSchema,
      '{"voice":"measured","notes":["a"]}',
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.data.voice).toBe("measured");
    expect(result.data.notes).toEqual(["a"]);
  });

  it("applies the schema default when an optional field is missing", () => {
    const result = safeParse(ExampleSchema, '{"voice":"measured"}');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.data.notes).toEqual([]);
  });

  it("parses fenced JSON", () => {
    const result = safeParse(
      ExampleSchema,
      '```json\n{"voice":"measured"}\n```',
    );
    expect(result.ok).toBe(true);
  });

  it("returns a parse-error result for invalid JSON", () => {
    const result = safeParse(ExampleSchema, "not actually json at all");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.error).toMatch(/invalid JSON/);
  });

  it("returns a parse-error result for schema violations", () => {
    const result = safeParse(ExampleSchema, '{"voice":""}');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.error).toMatch(/schema validation failed/);
    expect(result.error).toMatch(/voice/);
  });
});
