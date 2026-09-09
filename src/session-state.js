/* Preferences and transition hints are optional. Keep this document usable even
   when the storage getter, reads, or writes are denied by the browser. */
const memory = new Map()

export const sessionState = {
  getItem(key) {
    if (memory.has(key)) return memory.get(key)
    try {
      return window.sessionStorage.getItem(key)
    } catch {
      return null
    }
  },
  removeItem(key) {
    memory.delete(key)
    try { window.sessionStorage.removeItem(key) } catch { /* Storage is optional. */ }
  },
  setItem(key, value) {
    try {
      window.sessionStorage.setItem(key, String(value))
      // Successful writes must not shadow updates made by another document
      // while this one is sitting in the browser's back/forward cache.
      memory.delete(key)
    } catch {
      memory.set(key, String(value))
    }
  },
}
