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
  if (!trimmed) return "";

  const fenceMatch = trimmed.match(/```(?:json|JSON)?\s*([\s\S]*?)```/);
  const content = fenceMatch ? fenceMatch[1].trim() : trimmed;

  if (!content) return "";

  const firstBrace = content.search(/[\{\[]/);
  if (firstBrace === -1) return content;

  const jsonCandidate = content.slice(firstBrace);

  const lastBrace = Math.max(jsonCandidate.lastIndexOf("}"), jsonCandidate.lastIndexOf("]"));

  if (lastBrace !== -1) {
    return jsonCandidate.slice(0, lastBrace + 1);
  }

  return jsonCandidate;
}

function repairJson(json: string): string {
  let repaired = json.trim();

  repaired = repaired
    .replace(/}(\s*){/g, "},$1{")
    .replace(/](\s*)\[/g, "],$1[")
    .replace(/}(\s*)\[/g, "},$1[")
    .replace(/](\s*){/g, "],$1{");

  repaired = repaired.replace(/[,\s:]+$/, "");

  const stack: ("{" | "[")[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];
    if (escaped) { escaped = false; continue; }
    if (char === "\\") { escaped = true; continue; }
    if (char === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (char === "{") stack.push("{");
    else if (char === "[") stack.push("[");
    else if (char === "}") stack.pop();
    else if (char === "]") stack.pop();
  }

  if (inString) repaired += '"';
  while (stack.length > 0) {
    const last = stack.pop();
    if (last === "{") repaired += "}";
    else if (last === "[") repaired += "]";
  }

  return repaired;
}

export function safeParse<TSchema extends ZodTypeAny>(
  schema: TSchema,
  text: string,
): ParseResult<ZodInfer<TSchema>> {
  const extracted = extractJson(text);

  let candidate: unknown;
  let parseError: any = null;

  if (extracted) {
    try {
      candidate = JSON.parse(extracted);
    } catch (e) {
      parseError = e;
      try {
        candidate = JSON.parse(repairJson(extracted));
      } catch (e2) {
        // repair failed
      }
    }
  }

  if (candidate) {
    const result = schema.safeParse(candidate);
    if (result.success) return { ok: true, data: result.data };
  }

    const regexCandidate = attemptRegexExtraction(text, schema);
  if (regexCandidate) {
    const result = schema.safeParse(regexCandidate);
    if (result.success) return { ok: true, data: result.data };

    const issueSummary = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    return { ok: false, error: `schema validation failed — ${issueSummary}` };
  }

  if (!text.trim()) {
    return { ok: false, error: "empty AI response" };
  }

  return {
    ok: false,
    error: parseError
      ? `invalid JSON: ${parseError.message} (Raw: ${text.trim().slice(-40)})`
      : `no valid JSON or fields found (Raw: ${text.trim().slice(-40)})`,
  };
}

function attemptRegexExtraction(text: string, schema: ZodTypeAny): any {
  let targetSchema: any = schema;
  while (targetSchema && targetSchema._def && targetSchema._def.innerType) {
    targetSchema = targetSchema._def.innerType;
  }

  const shape = targetSchema?.shape || targetSchema?._def?.shape;
  if (!shape) return null;

  const result: any = {};
  let foundAny = false;

  for (const key in shape) {
    const stringRegex = new RegExp(`"${key}"\\s*[:=]\\s*["']([^"']*)["']`, "i");
    const stringMatch = text.match(stringRegex);
    if (stringMatch) {
      result[key] = stringMatch[1];
      foundAny = true;
      continue;
    }

    const numberRegex = new RegExp(`"${key}"\\s*[:=]\\s*(\\d+(?:\\.\\d+)?)`, "i");
    const numberMatch = text.match(numberRegex);
    if (numberMatch) {
      result[key] = Number(numberMatch[1]);
      foundAny = true;
      continue;
    }

    const arrayRegex = new RegExp(`"${key}"\\s*[:=]\\s*\\[([^\\]]*)\\]`, "i");
    const arrayMatch = text.match(arrayRegex);
    if (arrayMatch) {
      try {
        const items = arrayMatch[1]
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""))
          .filter((s) => s.length > 0);
        result[key] = items;
        foundAny = true;
      } catch { /* skip */ }
    }
  }

  return foundAny ? result : null;
}
