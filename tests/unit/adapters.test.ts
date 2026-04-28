import { afterEach, describe, expect, it, vi } from "vitest";
import { proseMirrorAdapter } from "@/adapters/prosemirror";
import { notionAdapter } from "@/adapters/notion";
import { googleDocsAdapter } from "@/adapters/google-docs";
import type { CommitDelta } from "@/adapters/types";

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

async function flushDebounceAndObserver(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

describe("proseMirrorAdapter.attach", () => {
  it("reads the editor text by joining block elements", () => {
    document.body.innerHTML = `
      <div class="ProseMirror">
        <p>First paragraph.</p>
        <p>Second paragraph.</p>
      </div>
    `;
    const handle = proseMirrorAdapter.attach(document);
    expect(handle.readText()).toBe("First paragraph.\n\nSecond paragraph.");
    handle.detach();
  });

  it("emits a sentence-completed commit when a new sentence starts", async () => {
    document.body.innerHTML = `<div class="ProseMirror"><p>First.</p></div>`;
    const handle = proseMirrorAdapter.attach(document);
    const commits: CommitDelta[] = [];
    handle.onCommit((delta) => commits.push(delta));

    const paragraph = document.querySelector("p")!;
    paragraph.textContent = "First. Second";
    await flushDebounceAndObserver(400);

    expect(commits).toHaveLength(1);
    expect(commits[0]!.sentence).toBe("First.");
    expect(commits[0]!.reason).toBe("sentence-completed");
    handle.detach();
  });

  it("emits a paragraph-break commit when a new block element appears", async () => {
    document.body.innerHTML = `<div class="ProseMirror"><p>First sentence here.</p></div>`;
    const handle = proseMirrorAdapter.attach(document);
    const commits: CommitDelta[] = [];
    handle.onCommit((delta) => commits.push(delta));

    const editor = document.querySelector(".ProseMirror")!;
    const newParagraph = document.createElement("p");
    newParagraph.textContent = "";
    editor.appendChild(newParagraph);

    await flushDebounceAndObserver(500);

    const lastCommit = commits[commits.length - 1];
    expect(lastCommit?.reason).toBe("paragraph-break");
    handle.detach();
  });

  it("detach stops further commits", async () => {
    document.body.innerHTML = `<div class="ProseMirror"><p>First.</p></div>`;
    const handle = proseMirrorAdapter.attach(document);
    const commits: CommitDelta[] = [];
    handle.onCommit((delta) => commits.push(delta));

    handle.detach();
    document.querySelector("p")!.textContent = "First. Second";
    await flushDebounceAndObserver(400);

    expect(commits).toHaveLength(0);
  });
});

describe("notionAdapter.attach", () => {
  it("reads block-level text from data-block-id elements", () => {
    document.body.innerHTML = `
      <div class="notion-page-content">
        <div data-block-id="a">First block.</div>
        <div data-block-id="b">Second block here.</div>
      </div>
    `;
    const handle = notionAdapter.attach(document);
    expect(handle.readText()).toBe("First block.\n\nSecond block here.");
    handle.detach();
  });

  it("commits a sentence when a new one starts in the same block", async () => {
    document.body.innerHTML = `
      <div class="notion-page-content">
        <div data-block-id="a">First.</div>
      </div>
    `;
    const handle = notionAdapter.attach(document);
    const commits: CommitDelta[] = [];
    handle.onCommit((delta) => commits.push(delta));

    const block = document.querySelector('[data-block-id="a"]')!;
    block.textContent = "First. Second";
    await flushDebounceAndObserver(400);

    expect(commits).toHaveLength(1);
    expect(commits[0]!.sentence).toBe("First.");
    handle.detach();
  });
});

describe("googleDocsAdapter.attach", () => {
  it("reads paragraph text from kix-paragraphrenderer blocks", () => {
    document.body.innerHTML = `
      <div class="kix-page-content-wrap">
        <div class="kix-paragraphrenderer">First paragraph.</div>
        <div class="kix-paragraphrenderer">Second paragraph here.</div>
      </div>
    `;
    const handle = googleDocsAdapter.attach(document);
    expect(handle.readText()).toBe(
      "First paragraph.\n\nSecond paragraph here.",
    );
    expect(handle.caretRect()).toBeNull();
    handle.detach();
  });

  it("commits when a new paragraph block is added", async () => {
    document.body.innerHTML = `
      <div class="kix-page-content-wrap">
        <div class="kix-paragraphrenderer">First sentence here.</div>
      </div>
    `;
    const handle = googleDocsAdapter.attach(document);
    const commits: CommitDelta[] = [];
    handle.onCommit((delta) => commits.push(delta));

    const wrap = document.querySelector(".kix-page-content-wrap")!;
    const newBlock = document.createElement("div");
    newBlock.className = "kix-paragraphrenderer";
    newBlock.textContent = "Second.";
    wrap.appendChild(newBlock);

    await flushDebounceAndObserver(700);

    const lastCommit = commits[commits.length - 1];
    expect(lastCommit).toBeDefined();
    expect(lastCommit!.reason).toBe("paragraph-break");
    handle.detach();
  });
});
