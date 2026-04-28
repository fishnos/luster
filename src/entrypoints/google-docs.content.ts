import { googleDocsAdapter } from "@/adapters/google-docs";
import { runContentScript } from "@/runtime/runContentScript";

export default defineContentScript({
  matches: ["https://docs.google.com/document/*"],
  runAt: "document_idle",
  main() {
    runContentScript(googleDocsAdapter);
  },
});
