export type GoogleDocsFetchResult =
  | { ok: true; fullText: string; paragraphs: string[]; revisionId?: string }
  | {
      ok: false;
      reason:
        | "auth-required"
        | "permission-denied"
        | "not-found"
        | "rate-limited"
        | "office-file"
        | "error";
      status?: number;
      error?: string;
    };

interface DocsApiResponse {
  body?: {
    content?: DocsStructuralElement[];
  };
  revisionId?: string;
}

interface DocsStructuralElement {
  paragraph?: {
    elements?: DocsParagraphElement[];
  };
  table?: {
    tableRows?: {
      tableCells?: {
        content?: DocsStructuralElement[];
      }[];
    }[];
  };
}

interface DocsParagraphElement {
  textRun?: {
    content?: string;
  };
  richLink?: {
    richLinkProperties?: {
      title?: string;
    };
  };
}

const DOCS_API_BASE = "https://docs.googleapis.com/v1/documents";

export async function fetchGoogleDoc(
  docId: string,
  token: string,
): Promise<GoogleDocsFetchResult> {
  if (!docId) {
    return { ok: false, reason: "error", error: "missing docId" };
  }
  let response: Response;
  try {
    response = await fetch(
      `${DOCS_API_BASE}/${encodeURIComponent(docId)}?fields=body.content,revisionId`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    );
  } catch (error) {
    return {
      ok: false,
      reason: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  }

  if (response.status === 401) {
    return { ok: false, reason: "auth-required", status: 401 };
  }
  if (response.status === 403) {
    return { ok: false, reason: "permission-denied", status: 403 };
  }
  if (response.status === 404) {
    return { ok: false, reason: "not-found", status: 404 };
  }
  if (response.status === 429) {
    return { ok: false, reason: "rate-limited", status: 429 };
  }
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    if (response.status === 400 && isOfficeFileError(errorText)) {
      return {
        ok: false,
        reason: "office-file",
        status: 400,
        error: extractApiMessage(errorText) ?? errorText.slice(0, 200),
      };
    }
    return {
      ok: false,
      reason: "error",
      status: response.status,
      error: errorText.slice(0, 200),
    };
  }

  let data: DocsApiResponse;
  try {
    data = (await response.json()) as DocsApiResponse;
  } catch (error) {
    return {
      ok: false,
      reason: "error",
      error: error instanceof Error ? error.message : "invalid JSON",
    };
  }

  const paragraphs = walkContent(data.body?.content ?? []);
  const fullText = paragraphs.join("\n\n");
  return {
    ok: true,
    fullText,
    paragraphs,
    revisionId: data.revisionId,
  };
}

function walkContent(elements: DocsStructuralElement[]): string[] {
  const collected: string[] = [];
  for (const element of elements) {
    if (element.paragraph) {
      const text = renderParagraph(element.paragraph.elements ?? []);
      if (text.length > 0) collected.push(text);
    }
    if (element.table?.tableRows) {
      for (const row of element.table.tableRows) {
        for (const cell of row.tableCells ?? []) {
          collected.push(...walkContent(cell.content ?? []));
        }
      }
    }
  }
  return collected;
}

function renderParagraph(elements: DocsParagraphElement[]): string {
  const parts: string[] = [];
  for (const element of elements) {
    const textRunContent = element.textRun?.content;
    if (typeof textRunContent === "string" && textRunContent.length > 0) {
      parts.push(textRunContent);
    }
    const richLinkTitle = element.richLink?.richLinkProperties?.title;
    if (typeof richLinkTitle === "string" && richLinkTitle.length > 0) {
      parts.push(richLinkTitle);
    }
  }
  return parts.join("").replace(//g, "\n").replace(/\n+$/, "").trim();
}

export function extractDocId(href: string): string | null {
  const match = href.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return match ? (match[1] ?? null) : null;
}

function isOfficeFileError(body: string): boolean {
  if (!body) return false;
  if (/FAILED_PRECONDITION/.test(body) && /Office file/i.test(body))
    return true;
  return /must not be an Office file/i.test(body);
}

function extractApiMessage(body: string): string | null {
  if (!body) return null;
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    if (typeof parsed.error?.message === "string") return parsed.error.message;
  } catch {
    return null;
  }
  return null;
}
