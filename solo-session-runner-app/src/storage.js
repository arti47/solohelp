// Drop-in replacement for the Claude artifact `window.storage` API.
// Same async shape, backed by localStorage, so component code is unchanged.
const NS = "ssr:";
export const storage = {
  async get(key) {
    const v = localStorage.getItem(NS + key);
    if (v === null) throw new Error("key not found");
    return { key, value: v, shared: false };
  },
  async set(key, value) {
    localStorage.setItem(NS + key, value);
    return { key, value, shared: false };
  },
  async delete(key) {
    localStorage.removeItem(NS + key);
    return { key, deleted: true, shared: false };
  },
  async list(prefix = "") {
    const keys = Object.keys(localStorage)
      .filter((k) => k.startsWith(NS + prefix))
      .map((k) => k.slice(NS.length));
    return { keys, prefix, shared: false };
  }
};
