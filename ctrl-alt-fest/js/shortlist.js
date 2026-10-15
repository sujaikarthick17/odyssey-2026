export const SHORTLIST_KEY = 'odyssey.shortlist.v1';

// Store IDs only. Browsing still works when storage is blocked or full.
export function createShortlist(storage) {
  let ids = new Set();
  function refresh() {
    if (!storage) return;
    try {
      const value = JSON.parse(storage.getItem(SHORTLIST_KEY) || '[]');
      ids = new Set(Array.isArray(value) ? value.filter(id => typeof id === 'string' || (typeof id === 'number' && Number.isFinite(id))).map(String) : []);
    } catch { /* Retain this tab's selection if storage cannot be read. */ }
  }
  refresh();
  return {
    has: id => ids.has(String(id)),
    ids: () => [...ids],
    refresh,
    toggle(id) {
      refresh();
      const key = String(id);
      const saved = !ids.has(key);
      if (saved) ids.add(key); else ids.delete(key);
      let persisted = false;
      try {
        if (storage) { storage.setItem(SHORTLIST_KEY, JSON.stringify([...ids])); persisted = true; }
      } catch { storage = null; }
      return { saved, persisted };
    }
  };
}
