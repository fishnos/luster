import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: "src",
  outDir: ".output",
  manifest: {
    name: "Luster",
    description:
      "Interrogates your prose as you write — reading, interrogation, and critic modes.",
    version: "1.0.0",
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
  },
});
