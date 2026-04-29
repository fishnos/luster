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
