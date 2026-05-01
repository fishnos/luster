import {
  createBrowserLocalStorage,
  type StorageBackend,
} from "@/core/storageBackend";

export type GoogleAuthResult =
  | { ok: true; token: string }
  | {
      ok: false;
      reason: "not-configured" | "denied" | "unsupported" | "error";
      error?: string;
    };

interface IdentityApi {
  launchWebAuthFlow?: (
    details: { url: string; interactive: boolean },
    callback?: (responseUrl?: string) => void,
  ) => Promise<string> | void;
  getRedirectURL?: () => string;
}

interface RuntimeWithLastError {
  lastError?: { message?: string };
}

function getIdentity(): IdentityApi | null {
  const globalScope = globalThis as unknown as {
    browser?: { identity?: IdentityApi };
    chrome?: { identity?: IdentityApi };
  };
  return globalScope.browser?.identity ?? globalScope.chrome?.identity ?? null;
}

function getRuntime(): RuntimeWithLastError | null {
  const globalScope = globalThis as unknown as {
    chrome?: { runtime?: RuntimeWithLastError };
    browser?: { runtime?: RuntimeWithLastError };
  };
  return globalScope.chrome?.runtime ?? globalScope.browser?.runtime ?? null;
}

function getClientId(): string {
  const fromImport = (
    import.meta as unknown as {
      env?: { WXT_GOOGLE_OAUTH_CLIENT_ID?: string };
    }
  ).env?.WXT_GOOGLE_OAUTH_CLIENT_ID;
  if (fromImport && fromImport.length > 0) return fromImport;
  return "";
}

const SCOPES = "https://www.googleapis.com/auth/documents.readonly";
const TOKEN_KEY = "luster.gauth.token";
const TOKEN_EXPIRY_KEY = "luster.gauth.expiresAt";

interface CachedToken {
  token: string;
  expiresAt: number;
}

async function readCachedToken(
  storage: StorageBackend,
): Promise<CachedToken | null> {
  try {
    const items = await storage.getMany([TOKEN_KEY, TOKEN_EXPIRY_KEY]);
    const token = items[TOKEN_KEY];
    const expiresAt = items[TOKEN_EXPIRY_KEY];
    if (typeof token !== "string" || token.length === 0) return null;
    if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt)) {
      return null;
    }
    if (expiresAt - 30_000 <= Date.now()) return null;
    return { token, expiresAt };
  } catch {
    return null;
  }
}

async function writeCachedToken(
  storage: StorageBackend,
  token: string,
  expiresAt: number,
): Promise<void> {
  try {
    await storage.setMany({
      [TOKEN_KEY]: token,
      [TOKEN_EXPIRY_KEY]: expiresAt,
    });
  } catch {
    // ignore
  }
}

async function clearCachedToken(storage: StorageBackend): Promise<void> {
  try {
    await storage.remove([TOKEN_KEY, TOKEN_EXPIRY_KEY]);
  } catch {
    // ignore
  }
}

function parseImplicitTokenFromUrl(
  redirectUrl: string,
): { token: string; expiresIn: number } | null {
  if (!redirectUrl) return null;
  let parsed: URL;
  try {
    parsed = new URL(redirectUrl);
  } catch {
    return null;
  }
  const fragment = parsed.hash.startsWith("#")
    ? parsed.hash.slice(1)
    : parsed.hash;
  if (!fragment) return null;
  const params = new URLSearchParams(fragment);
  const accessToken = params.get("access_token");
  if (!accessToken) return null;
  const expiresInRaw = params.get("expires_in");
  const expiresIn = expiresInRaw ? Number.parseInt(expiresInRaw, 10) : 3600;
  return {
    token: accessToken,
    expiresIn: Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600,
  };
}

function buildAuthUrl(clientId: string, redirectUri: string): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "token");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("include_granted_scopes", "true");
  return url.toString();
}

function launchAuthFlow(
  identity: IdentityApi,
  url: string,
  interactive: boolean,
): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof identity.launchWebAuthFlow !== "function") {
      resolve(null);
      return;
    }
    let settled = false;
    function finish(value: string | null): void {
      if (settled) return;
      settled = true;
      resolve(value);
    }
    try {
      const maybePromise = identity.launchWebAuthFlow(
        { url, interactive },
        (responseUrl?: string) => {
          const runtime = getRuntime();
          if (runtime?.lastError) {
            finish(null);
            return;
          }
          finish(typeof responseUrl === "string" ? responseUrl : null);
        },
      );
      if (
        maybePromise &&
        typeof (maybePromise as Promise<string>).then === "function"
      ) {
        (maybePromise as Promise<string>).then(
          (responseUrl) => finish(responseUrl ?? null),
          () => finish(null),
        );
      }
    } catch {
      finish(null);
    }
  });
}

export interface GoogleAuth {
  getToken: (interactive: boolean) => Promise<GoogleAuthResult>;
  forgetToken: (token: string) => Promise<void>;
  describeClient: () => { clientId: string | null; redirectUrl: string | null };
}

export interface GoogleAuthOptions {
  storage?: StorageBackend;
}

export function createGoogleAuth(options: GoogleAuthOptions = {}): GoogleAuth {
  const storage = options.storage ?? createBrowserLocalStorage();

  return {
    async getToken(interactive: boolean): Promise<GoogleAuthResult> {
      const cached = await readCachedToken(storage);
      if (cached) return { ok: true, token: cached.token };

      if (!interactive) {
        return { ok: false, reason: "denied" };
      }

      const identity = getIdentity();
      if (!identity || typeof identity.launchWebAuthFlow !== "function") {
        return { ok: false, reason: "unsupported" };
      }

      const clientId = getClientId();
      if (!clientId) {
        return { ok: false, reason: "not-configured" };
      }
      if (typeof identity.getRedirectURL !== "function") {
        return { ok: false, reason: "unsupported" };
      }

      const redirectUri = identity.getRedirectURL();
      const interactiveResultUrl = await launchAuthFlow(
        identity,
        buildAuthUrl(clientId, redirectUri),
        true,
      );
      const interactiveToken = interactiveResultUrl
        ? parseImplicitTokenFromUrl(interactiveResultUrl)
        : null;
      if (!interactiveToken) {
        return { ok: false, reason: "denied" };
      }
      const expiresAt = Date.now() + interactiveToken.expiresIn * 1000;
      await writeCachedToken(storage, interactiveToken.token, expiresAt);
      return { ok: true, token: interactiveToken.token };
    },

    async forgetToken(_token: string): Promise<void> {
      void _token;
      await clearCachedToken(storage);
    },

    describeClient() {
      const clientId = getClientId() || null;
      const identity = getIdentity();
      const redirectUrl =
        identity && typeof identity.getRedirectURL === "function"
          ? identity.getRedirectURL()
          : null;
      return { clientId, redirectUrl };
    },
  };
}
