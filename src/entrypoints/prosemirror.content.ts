import { proseMirrorAdapter } from "@/adapters/prosemirror";
import { runContentScript } from "@/runtime/runContentScript";

export default defineContentScript({
  matches: [
    "https://*.substack.com/publish/*",
    "https://medium.com/*",
    "https://*.medium.com/*",
    "https://*.ghost.io/*",
  ],
  runAt: "document_idle",
  main() {
    runContentScript(proseMirrorAdapter);
  },
});
