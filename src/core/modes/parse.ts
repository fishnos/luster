import type { ZodTypeAny, infer as ZodInfer } from "zod";

export interface ParseSuccess<TParsed> {
  ok: true;
  data: TParsed;
}

export interface ParseFailure {
  ok: false;
  error: string;
}

export type ParseResult<TParsed> = ParseSuccess<TParsed> | ParseFailure;

export function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(
    /^```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```\s*$/,
  );
  const withoutFence =
    fenceMatch && fenceMatch[1] ? fenceMatch[1].trim() : trimmed;

  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return withoutFence.slice(firstBrace, lastBrace + 1);
  }

  const firstBracket = withoutFence.indexOf("[");
  const lastBracket = withoutFence.lastIndexOf("]");
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    return withoutFence.slice(firstBracket, lastBracket + 1);
  }

  return withoutFence;
}

export function safeParse<TSchema extends ZodTypeAny>(
  schema: TSchema,
  text: string,
): ParseResult<ZodInfer<TSchema>> {
  let candidate: unknown;
  try {
    candidate = JSON.parse(extractJson(text));
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? `invalid JSON: ${error.message}`
          : "invalid JSON",
    };
  }

  const result = schema.safeParse(candidate);
  if (result.success) return { ok: true, data: result.data };

  const issueSummary = result.error.issues
    .map((issue) => {
      const path = issue.path.join(".") || "(root)";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
  return { ok: false, error: `schema validation failed — ${issueSummary}` };
}
