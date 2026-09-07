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
  setItem(key, value) {
    memory.set(key, String(value))
    try {
      window.sessionStorage.setItem(key, String(value))
    } catch {
      /* The in-memory value remains available until the next document loads. */
    }
  },
}
