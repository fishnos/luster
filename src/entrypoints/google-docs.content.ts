import { googleDocsAdapter } from "@/adapters/google-docs";
import { runContentScript } from "@/runtime/runContentScript";
import { createKeyVault } from "@/core/keyVault";
import { createBrowserLocalStorage } from "@/core/storageBackend";

export default defineContentScript({
  matches: ["https://docs.google.com/document/*"],
  runAt: "document_idle",
  cssInjectionMode: "ui",
  async main(ctx) {
    const keyVault = createKeyVault(createBrowserLocalStorage());
    const enabled = await keyVault.getGoogleDocsEnabled();
    if (!enabled) {
      console.info(
        "[Luster] Google Docs integration disabled — mounting overlay only so you can re-enable in settings.",
      );
      await runContentScript(ctx, googleDocsAdapter, { attachAdapter: false });
      return;
    }
    console.info("[Luster] Google Docs content script attaching");
    await runContentScript(ctx, googleDocsAdapter);
  },
});
