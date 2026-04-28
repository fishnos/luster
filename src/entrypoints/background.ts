import { createBackgroundServices } from "@/core/backgroundServices";
import { createRequestHandler } from "@/core/requestHandler";
import {
  fail,
  type LusterRequest,
  type LusterResponse,
} from "@/core/messaging";

export default defineBackground(() => {
  const services = createBackgroundServices();
  const handle = createRequestHandler(services);

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
