class MemoryStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

const memoryStorageInstance = new MemoryStorage();

export const safeStorage = {
  getItem(key: string): string | null {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return memoryStorageInstance.getItem(key);
      }
    }
    return memoryStorageInstance.getItem(key);
  },

  setItem(key: string, value: string): void {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch {
        memoryStorageInstance.setItem(key, value);
        return;
      }
    }
    memoryStorageInstance.setItem(key, value);
  },

  removeItem(key: string): void {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch {
        memoryStorageInstance.removeItem(key);
        return;
      }
    }
    memoryStorageInstance.removeItem(key);
  },

  clear(): void {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        window.localStorage.clear();
        return;
      } catch {
        memoryStorageInstance.clear();
        return;
      }
    }
    memoryStorageInstance.clear();
  },
};
