import type { Adapter } from "@/adapters/types";
import { googleDocsAdapter } from "@/adapters/google-docs";
import { notionAdapter } from "@/adapters/notion";
import { proseMirrorAdapter } from "@/adapters/prosemirror";

export const allAdapters: Adapter[] = [
  googleDocsAdapter,
  notionAdapter,
  proseMirrorAdapter,
];

export function detectAdapter(
  url: URL,
  hostDocument: Document,
): Adapter | null {
  for (const adapter of allAdapters) {
    if (adapter.match(url, hostDocument)) return adapter;
  }
  return null;
}
