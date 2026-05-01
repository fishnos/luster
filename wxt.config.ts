import { defineConfig } from "wxt";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnv(): void {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

const chromeManifestKey =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxSshTvs7+kAaKSg2SQiAN3qOosK8Ct0wiPEzIrf2tUBT3QrzN7QCNI33arOWddAilGh2964IF8klT7lg+wYSXdWJFQvjK/RZ+VlxnWHQx9UUSNtZrbU6ZTPrWDCeHVduvLJ0oy1wFIkfdZuI3kPI7XDaQ/vOmvBui6HafF23jQ0j60aSVFMzr5RO9x/rP3x1oxVFMm7g8pEHrMf30CJcydOaJWRB16I9sQ3iQBK86qRT9oAE+7NUAKz8EWhRDCdhgRSMGwR/qE06O8ag5XOngTSvahglgmtF2mnxdw9o2rdmfShqgHGib2P5nUdGpb3L4ibcNiG0+iFoFfU+vb8SZwIDAQAB";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: "src",
  outDir: ".output",
  manifest: ({ browser }) => {
    const isChrome = browser === "chrome";
    return {
      name: "Luster",
      description:
        "Interrogates your prose as you write — reading, interrogation, and critic modes.",
      version: "1.1.0",
      ...(isChrome ? { key: chromeManifestKey } : {}),
      permissions: [
        "storage",
        "activeTab",
        "identity",
        "cookies",
        "declarativeNetRequest",
      ],
      host_permissions: [
        "https://docs.google.com/*",
        "https://www.notion.so/*",
        "https://*.notion.site/*",
        "https://*.substack.com/*",
        "https://medium.com/*",
        "https://*.medium.com/*",
        "https://*.ghost.io/*",
        "https://generativelanguage.googleapis.com/*",
        "https://api.anthropic.com/*",
        "https://api.openai.com/*",
        "https://accounts.google.com/*",
      ],
      icons: {
        16: "icon/16.png",
        32: "icon/32.png",
        48: "icon/48.png",
        96: "icon/96.png",
        128: "icon/128.png",
      },
      action: {
        default_title: "Luster",
        default_popup: "popup.html",
        default_icon: {
          16: "icon/16.png",
          32: "icon/32.png",
          48: "icon/48.png",
        },
      },
      options_ui: {
        page: "options.html",
        open_in_tab: true,
      },
      browser_specific_settings: {
        gecko: {
          id: "luster@vtsyp.dev",
          strict_min_version: "115.0",
        },
      },
      web_accessible_resources: [
        {
          resources: ["icon/*.png", "icons/*.png"],
          matches: [
            "https://docs.google.com/*",
            "https://www.notion.so/*",
            "https://*.notion.site/*",
            "https://*.substack.com/*",
            "https://medium.com/*",
            "https://*.medium.com/*",
            "https://*.ghost.io/*",
          ],
        },
      ],
    };
  },
});
