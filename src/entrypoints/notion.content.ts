import { notionAdapter } from "@/adapters/notion";
import { runContentScript } from "@/runtime/runContentScript";

export default defineContentScript({
  matches: ["https://www.notion.so/*", "https://*.notion.site/*"],
  runAt: "document_idle",
  main() {
    runContentScript(notionAdapter);
  },
});
