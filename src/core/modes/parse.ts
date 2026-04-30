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
  const content = fenceMatch ? (fenceMatch[1] ?? "").trim() : trimmed;

  if (!content) return "";

  const firstBrace = content.search(/[\{\[]/);
  if (firstBrace === -1) return content;

  const jsonCandidate = content.slice(firstBrace);

  const lastBrace = Math.max(
    jsonCandidate.lastIndexOf("}"),
    jsonCandidate.lastIndexOf("]"),
  );

  if (lastBrace !== -1) {
    return jsonCandidate.slice(0, lastBrace + 1);
  }

  return jsonCandidate;
}

function repairTruncatedArrayObject(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) return null;
  const arrayMatch = trimmed.match(/"([A-Za-z_][\w]*)"\s*:\s*\[/);
  if (!arrayMatch) return null;
  const arrayKey = arrayMatch[1];
  const arrayStart = arrayMatch.index! + arrayMatch[0].length;
  const completed: string[] = [];
  let cursor = arrayStart;
  while (cursor < trimmed.length) {
    while (cursor < trimmed.length && /[\s,]/.test(trimmed[cursor]!)) cursor++;
    if (cursor >= trimmed.length) break;
    if (trimmed[cursor] === "]") break;
    if (trimmed[cursor] !== "{") break;
    let depth = 0;
    let insideString = false;
    let escaped = false;
    const objectStart = cursor;
    let closed = false;
    while (cursor < trimmed.length) {
      const character = trimmed[cursor]!;
      if (escaped) {
        escaped = false;
        cursor++;
        continue;
      }
      if (character === "\\") {
        escaped = true;
        cursor++;
        continue;
      }
      if (character === '"') {
        insideString = !insideString;
        cursor++;
        continue;
      }
      if (insideString) {
        cursor++;
        continue;
      }
      if (character === "{") depth++;
      else if (character === "}") {
        depth--;
        if (depth === 0) {
          cursor++;
          completed.push(trimmed.slice(objectStart, cursor));
          closed = true;
          break;
        }
      }
      cursor++;
    }
    if (!closed) break;
  }
  return `{"${arrayKey}":[${completed.join(",")}]}`;
}

function repairJson(json: string): string {
  let repaired = json.trim();

  repaired = repaired.replace(
    /: \s*"([\s\S]*?)"\s*([,}\]])/g,
    (match, content, suffix) => {
      const fixedContent = content.replace(/(?<!\\)"/g, '\\"');
      return `: "${fixedContent}"${suffix}`;
    },
  );

  repaired = repaired.replace(/: \s*"([^"]*)"/g, (match, p1) => {
    return `: "${p1.replace(/\n/g, "\\n")}"`;
  });

  repaired = repaired.replace(/("?\s*[:=]\s*[^,\]\}\s]+)\s*\n\s*"/g, '$1,\n"');
  repaired = repaired.replace(/\}\s*\{/g, "}, {");

  const stack: ("{" | "[")[] = [];
  let inString = false;
  let escaped = false;
  let clean = "";

  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];
    if (escaped) {
      clean += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      clean += char;
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      clean += char;
      continue;
    }
    if (inString) {
      if (char === "\n") clean += "\\n";
      else if (char === "\r") clean += "\\r";
      else if (char === "\t") clean += "\\t";
      else clean += char;
      continue;
    }

    if (char === "{") stack.push("{");
    else if (char === "[") stack.push("[");
    else if (char === "}") {
      if (stack[stack.length - 1] === "{") stack.pop();
      else continue;
    } else if (char === "]") {
      if (stack[stack.length - 1] === "[") stack.pop();
      else continue; // drop stray ]
    }
    clean += char;
  }

  repaired = clean;

  if (inString) {
    // Try to close the string. If it ends with a stray backslash, drop it.
    if (repaired.endsWith("\\")) repaired = repaired.slice(0, -1);
    repaired += '"';
  }

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
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "empty AI response" };

  let candidate: any = null;
  let parseSucceeded = false;
  let lastSchemaError: string | null = null;

  const extracted = extractJson(text);
  if (extracted) {
    try {
      candidate = JSON.parse(extracted);
      parseSucceeded = true;
    } catch (e) {
      try {
        candidate = JSON.parse(repairJson(extracted));
        parseSucceeded = true;
      } catch (e2) {
        const truncated = repairTruncatedArrayObject(extracted);
        if (truncated) {
          try {
            candidate = JSON.parse(truncated);
            parseSucceeded = true;
          } catch (e3) {
            // truncation repair failed
          }
        }
      }
    }
  }

  if (candidate) {
    const result = schema.safeParse(candidate);
    if (result.success) return { ok: true, data: result.data };
    lastSchemaError = formatZodIssues(result.error);
  }

  if (!candidate) {
    candidate = parseFuzzyTags(text);
    if (candidate) {
      const result = schema.safeParse(candidate);
      if (result.success) return { ok: true, data: result.data };
      lastSchemaError = lastSchemaError ?? formatZodIssues(result.error);
    }
  }

  const regexCandidate = attemptRegexExtraction(text, schema);
  if (regexCandidate) {
    const result = schema.safeParse(regexCandidate);
    if (result.success) return { ok: true, data: result.data };
    lastSchemaError = lastSchemaError ?? formatZodIssues(result.error);
  }

  if (!parseSucceeded && !candidate && !regexCandidate) {
    return {
      ok: false,
      error: `invalid JSON in response (Raw: ${trimmed.slice(-60)})`,
    };
  }

  if (lastSchemaError) {
    return {
      ok: false,
      error: `schema validation failed: ${lastSchemaError} (Raw: ${trimmed.slice(-60)})`,
    };
  }

  return {
    ok: false,
    error: `could not parse response (Raw: ${trimmed.slice(-60)})`,
  };
}

function formatZodIssues(error: {
  issues: { path: (string | number)[]; message: string }[];
}): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
    .join("; ");
}

function parseFuzzyTags(text: string): any {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const result: any = {};

  const arrays: Record<string, any[]> = {
    issues: [],
    questions: [],
    notes: [],
  };

  let currentBlock: any = null;
  let currentArrayName: string | null = null;

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Detect array/block starts
    if (
      lower.includes("issue") &&
      !lower.includes(":") &&
      !lower.includes("/")
    ) {
      currentBlock = {};
      currentArrayName = "issues";
      continue;
    }
    if (
      lower.includes("question") &&
      !lower.includes(":") &&
      !lower.includes("/")
    ) {
      currentBlock = {};
      currentArrayName = "questions";
      continue;
    }

    // Detect field values
    const colonIndex = line.indexOf(":");
    if (colonIndex !== -1) {
      let key = line
        .slice(0, colonIndex)
        .trim()
        .toLowerCase()
        .replace(/[^a-z]/g, "");
      let value = line
        .slice(colonIndex + 1)
        .trim()
        .replace(/^["']|["']$/g, "");

      if (currentBlock) {
        // Special case: spans (e.g., "Span: 10, 20" or "Start: 10")
        if (key === "span") {
          const nums = value.match(/\d+/g);
          if (nums) {
            currentBlock.span = {
              start: Number(nums[0]),
              end: Number(nums[1] || nums[0] + 1),
            };
          }
        } else if (key === "start") {
          currentBlock.span = currentBlock.span || { start: 0, end: 1 };
          currentBlock.span.start = Number(value);
        } else if (key === "end") {
          currentBlock.span = currentBlock.span || { start: 0, end: 1 };
          currentBlock.span.end = Number(value);
        } else {
          currentBlock[key] = value;
        }
      } else {
        // Root fields
        if (key === "voicetrend") result.voiceTrend = value;
        else if (key === "paragraphpurpose") result.paragraphPurpose = value;
        else if (key === "transitionstrength")
          result.transitionStrength = value;
        else result[key] = value;
      }
      continue;
    }

    // Handle end of blocks
    if (
      lower.includes("/issue") ||
      lower.includes("end_issue") ||
      (currentBlock && lower.includes("issue"))
    ) {
      if (currentBlock && currentArrayName) {
        const bucket = arrays[currentArrayName];
        if (bucket) bucket.push(currentBlock);
        currentBlock = null;
      }
    }

    // Handle notes (simple list items)
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const notes = arrays.notes;
      if (notes) notes.push(line.slice(2).trim());
    }
  }

  // If a block was left open, close it
  if (currentBlock && currentArrayName) {
    const bucket = arrays[currentArrayName];
    if (bucket) bucket.push(currentBlock);
  }

  // Merge arrays into result
  const issuesArray = arrays.issues;
  const questionsArray = arrays.questions;
  const notesArray = arrays.notes;
  if (issuesArray && issuesArray.length > 0) result.issues = issuesArray;
  if (questionsArray && questionsArray.length > 0)
    result.questions = questionsArray;
  if (notesArray && notesArray.length > 0) result.notes = notesArray;

  return Object.keys(result).length > 0 ? result : null;
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
    const arrayRegex = new RegExp(`"${key}"\\s*[:=]\\s*\\[([^\\]]*)\\]`, "i");
    const arrayMatch = text.match(arrayRegex);
    if (arrayMatch) {
      const items = (arrayMatch[1] ?? "")
        .split(",")
        .map((item) =>
          item
            .trim()
            .replace(/^["']|["']$/g, "")
            .trim(),
        )
        .filter((item) => item.length > 0);
      result[key] = items;
      foundAny = true;
      continue;
    }

    const stringRegex = new RegExp(`"${key}"\\s*[:=]\\s*["']([^"']*)["']`, "i");
    const stringMatch = text.match(stringRegex);
    if (stringMatch) {
      result[key] = stringMatch[1];
      foundAny = true;
      continue;
    }

    const numberRegex = new RegExp(
      `"${key}"\\s*[:=]\\s*(\\d+(?:\\.\\d+)?)`,
      "i",
    );
    const numberMatch = text.match(numberRegex);
    if (numberMatch) {
      result[key] = Number(numberMatch[1]);
      foundAny = true;
      continue;
    }
  }

  return foundAny ? result : null;
}
