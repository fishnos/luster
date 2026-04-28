export interface StorageBackend {
  getMany: (keys: string[]) => Promise<Record<string, unknown>>;
  setMany: (values: Record<string, unknown>) => Promise<void>;
  remove: (keys: string[]) => Promise<void>;
  clearAll: () => Promise<void>;
}

export function createInMemoryStorage(
  initial: Record<string, unknown> = {},
): StorageBackend {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    async getMany(keys) {
      const result: Record<string, unknown> = {};
      for (const key of keys) {
        if (store.has(key)) result[key] = store.get(key);
      }
      return result;
    },
    async setMany(values) {
      for (const [key, value] of Object.entries(values)) {
        store.set(key, value);
      }
    },
    async remove(keys) {
      for (const key of keys) store.delete(key);
    },
    async clearAll() {
      store.clear();
    },
  };
}

export function createBrowserLocalStorage(): StorageBackend {
  const browserApi = globalThis as unknown as {
    browser?: { storage?: { local?: BrowserStorageArea } };
    chrome?: { storage?: { local?: BrowserStorageArea } };
  };
  const area =
    browserApi.browser?.storage?.local ?? browserApi.chrome?.storage?.local;
  if (!area) {
    return createInMemoryStorage();
  }
  return {
    async getMany(keys) {
      return (await area.get(keys)) as Record<string, unknown>;
    },
    async setMany(values) {
      await area.set(values);
    },
    async remove(keys) {
      await area.remove(keys);
    },
    async clearAll() {
      await area.clear();
    },
  };
}

interface BrowserStorageArea {
  get: (keys: string[]) => Promise<unknown>;
  set: (values: Record<string, unknown>) => Promise<void>;
  remove: (keys: string[]) => Promise<void>;
  clear: () => Promise<void>;
}
