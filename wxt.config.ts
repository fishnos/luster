import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: "src",
  outDir: ".output",
  manifest: {
    name: "Luster",
    description:
      "Interrogates your prose as you write — reading, interrogation, and critic modes.",
    version: "0.1.0",
    permissions: ["storage", "activeTab"],
    host_permissions: [
      "https://docs.google.com/*",
      "https://www.notion.so/*",
      "https://*.notion.site/*",
      "https://*.substack.com/*",
      "https://medium.com/*",
      "https://*.medium.com/*",
      "https://*.ghost.io/*",
    ],
    action: {
      default_title: "Luster",
      default_popup: "popup.html",
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
  },
});
