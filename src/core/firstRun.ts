import type { StorageBackend } from "@/core/storageBackend";

const WELCOME_SEEN_KEY = "luster.welcomeSeen";
const INSTALLED_AT_KEY = "luster.installedAt";

export interface FirstRunStore {
  hasSeenWelcome: () => Promise<boolean>;
  markWelcomeSeen: () => Promise<void>;
  resetWelcome: () => Promise<void>;
  initializeOnInstall: () => Promise<void>;
}

export function createFirstRunStore(storage: StorageBackend): FirstRunStore {
  return {
    async hasSeenWelcome() {
      const result = await storage.getMany([WELCOME_SEEN_KEY]);
      return result[WELCOME_SEEN_KEY] === true;
    },
    async markWelcomeSeen() {
      await storage.setMany({ [WELCOME_SEEN_KEY]: true });
    },
    async resetWelcome() {
      await storage.remove([WELCOME_SEEN_KEY]);
    },
    async initializeOnInstall() {
      const existing = await storage.getMany([
        WELCOME_SEEN_KEY,
        INSTALLED_AT_KEY,
      ]);
      const updates: Record<string, unknown> = {};
      if (existing[INSTALLED_AT_KEY] === undefined) {
        updates[INSTALLED_AT_KEY] = Date.now();
      }
      if (existing[WELCOME_SEEN_KEY] === undefined) {
        updates[WELCOME_SEEN_KEY] = false;
      }
      if (Object.keys(updates).length > 0) {
        await storage.setMany(updates);
      }
    },
  };
}
