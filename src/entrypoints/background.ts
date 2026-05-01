import { createBackgroundServices } from "@/core/backgroundServices";
import { createRequestHandler } from "@/core/requestHandler";
import {
  fail,
  type LusterRequest,
  type LusterResponse,
} from "@/core/messaging";
import { createFirstRunStore } from "@/core/firstRun";
import { createBrowserLocalStorage } from "@/core/storageBackend";

export default defineBackground(() => {
  const services = createBackgroundServices();
  const handle = createRequestHandler(services);
  const firstRun = createFirstRunStore(createBrowserLocalStorage());

  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
      void firstRun.initializeOnInstall();
    }
  });

  void registerExportInlineRule();
  void resetGoogleDocsEnabledOnce();

  browser.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    const respond = sendResponse as (response: LusterResponse) => void;
    if (!isLusterRequest(request)) {
      respond(fail("unrecognized message"));
      return true;
    }
    handle(request)
      .then(respond)
      .catch((error) =>
        respond(fail(error instanceof Error ? error.message : String(error))),
      );
    return true;
  });
});

function isLusterRequest(value: unknown): value is LusterRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { type?: unknown }).type === "string"
  );
}

const EXPORT_INLINE_RULE_ID = 1001;

interface DnrApi {
  updateDynamicRules: (options: {
    removeRuleIds?: number[];
    addRules?: unknown[];
  }) => Promise<void>;
}

function getDnrApi(): DnrApi | null {
  const scope = globalThis as unknown as {
    browser?: { declarativeNetRequest?: DnrApi };
    chrome?: { declarativeNetRequest?: DnrApi };
  };
  return (
    scope.browser?.declarativeNetRequest ??
    scope.chrome?.declarativeNetRequest ??
    null
  );
}

const GDOCS_DEFAULT_ON_MIGRATION_KEY = "luster.googleDocsDefaultOnV1";

async function resetGoogleDocsEnabledOnce(): Promise<void> {
  try {
    const storage = createBrowserLocalStorage();
    const items = await storage.getMany([GDOCS_DEFAULT_ON_MIGRATION_KEY]);
    if (items[GDOCS_DEFAULT_ON_MIGRATION_KEY] === true) return;
    await storage.remove(["luster.googleDocsEnabled"]);
    await storage.setMany({ [GDOCS_DEFAULT_ON_MIGRATION_KEY]: true });
    console.info(
      "[Luster bg] Reset Google Docs integration to default ON (one-time migration)",
    );
  } catch (error) {
    console.warn("[Luster bg] Google Docs default-on migration failed:", error);
  }
}

async function registerExportInlineRule(): Promise<void> {
  const dnr = getDnrApi();
  if (!dnr) {
    console.warn(
      "[Luster bg] declarativeNetRequest unavailable — page reader iframe path will be blocked by Content-Disposition.",
    );
    return;
  }
  const rule = {
    id: EXPORT_INLINE_RULE_ID,
    priority: 1,
    action: {
      type: "modifyHeaders",
      responseHeaders: [
        { header: "content-disposition", operation: "remove" },
        { header: "x-frame-options", operation: "remove" },
        { header: "content-security-policy", operation: "remove" },
      ],
    },
    condition: {
      urlFilter: "|https://docs.google.com/document/*/export?*",
      resourceTypes: ["sub_frame", "main_frame", "xmlhttprequest"],
    },
  };
  try {
    await dnr.updateDynamicRules({
      removeRuleIds: [EXPORT_INLINE_RULE_ID],
      addRules: [rule],
    });
    console.info("[Luster bg] export-inline DNR rule registered");
  } catch (error) {
    console.warn(
      "[Luster bg] failed to register export-inline DNR rule:",
      error,
    );
  }
}
