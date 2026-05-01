import { afterEach, describe, expect, it } from "vitest";
import { detectAdapter } from "@/adapters/detectAdapter";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("detectAdapter", () => {
  it("returns the Google Docs adapter when the canvas tile manager is present", () => {
    document.body.innerHTML = `<div class="kix-rotatingtilemanager-content"></div>`;
    const url = new URL("https://docs.google.com/document/d/abc123/edit");
    const adapter = detectAdapter(url, document);
    expect(adapter?.id).toBe("google-docs");
  });

  it("returns null on Google Docs before the canvas tile manager has rendered", () => {
    const url = new URL("https://docs.google.com/document/d/abc123/edit");
    const adapter = detectAdapter(url, document);
    expect(adapter).toBeNull();
  });

  it("returns the Notion adapter on a notion.so page with the page content root", () => {
    document.body.innerHTML = `<div class="notion-page-content"><div data-block-id="x"></div></div>`;
    const url = new URL(
      "https://www.notion.so/My-Page-abcdef0123456789abcdef0123456789",
    );
    const adapter = detectAdapter(url, document);
    expect(adapter?.id).toBe("notion");
  });

  it("returns the ProseMirror adapter on a Substack publish URL with a ProseMirror editor", () => {
    document.body.innerHTML = `<div class="ProseMirror"><p>draft</p></div>`;
    const url = new URL("https://example.substack.com/publish/post/123");
    const adapter = detectAdapter(url, document);
    expect(adapter?.id).toBe("prosemirror");
  });

  it("returns null on Substack publish URL without a ProseMirror editor", () => {
    const url = new URL("https://example.substack.com/publish/post/123");
    const adapter = detectAdapter(url, document);
    expect(adapter).toBeNull();
  });

  it("returns null on an unrelated host like Gmail", () => {
    document.body.innerHTML = `<div class="ProseMirror"><p>draft</p></div>`;
    const url = new URL("https://mail.google.com/mail/u/0/");
    const adapter = detectAdapter(url, document);
    expect(adapter).toBeNull();
  });

  it("returns null on a Notion-themed page hosted elsewhere", () => {
    document.body.innerHTML = `<div class="notion-page-content"></div>`;
    const url = new URL("https://example.com/notion-clone");
    const adapter = detectAdapter(url, document);
    expect(adapter).toBeNull();
  });

  it("returns the Ghost adapter via prosemirror id on a /ghost editor URL", () => {
    document.body.innerHTML = `<div class="ProseMirror"></div>`;
    const url = new URL("https://example.ghost.io/ghost/#/editor/post/1234");
    const adapter = detectAdapter(url, document);
    expect(adapter?.id).toBe("prosemirror");
  });
});
