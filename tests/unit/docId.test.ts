import { describe, expect, it } from "vitest";
import { docIdFor } from "@/lib/docId";

describe("docIdFor", () => {
  it("extracts the Google Docs document id", () => {
    const id = docIdFor(
      "https://docs.google.com/document/d/1aBCdEFghIJK_LmNoPq/edit",
      "My Essay",
    );
    expect(id).toBe("gdocs:1aBCdEFghIJK_LmNoPq");
  });

  it("extracts the trailing 32-hex page id from Notion", () => {
    const id = docIdFor(
      "https://www.notion.so/Workspace/My-Page-0123456789abcdef0123456789abcdef",
      "My Page",
    );
    expect(id).toBe("notion:0123456789abcdef0123456789abcdef");
  });

  it("extracts the Substack post id", () => {
    const id = docIdFor(
      "https://example.substack.com/publish/post/123456",
      "Draft Title",
    );
    expect(id).toBe("substack:123456");
  });

  it("extracts the Medium post id", () => {
    const id = docIdFor("https://medium.com/p/abc123def456", "Title");
    expect(id).toBe("medium:abc123def456");
  });

  it("falls back to a deterministic url hash for unknown hosts", () => {
    const first = docIdFor("https://example.com/some/path", "Title");
    const second = docIdFor("https://example.com/some/path", "Title");
    const different = docIdFor("https://example.com/other/path", "Title");
    expect(first).toBe(second);
    expect(first).not.toBe(different);
    expect(first.startsWith("url:")).toBe(true);
  });

  it("handles malformed URLs without throwing", () => {
    const id = docIdFor("not a url", "Title");
    expect(id.startsWith("unknown:")).toBe(true);
  });
});
