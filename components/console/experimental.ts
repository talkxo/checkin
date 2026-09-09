// Experimental-features preference for the console. Stored per-browser in
// localStorage — it's a viewer preference (which nav items show), not data.
// Default OFF: the console presents as a workspace management system; the
// not-yet-built modules only appear when someone opts into the preview.

const KEY = "console.experimental";

export function isExperimentalEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setExperimentalEnabled(value: boolean): void {
  try {
    window.localStorage.setItem(KEY, value ? "1" : "0");
  } catch {
    // storage blocked (private mode etc.) — toggle just won't persist
  }
  window.dispatchEvent(new CustomEvent(EXPERIMENTAL_EVENT));
}

export const EXPERIMENTAL_EVENT = "console:experimental-changed";

export function onExperimentalChange(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(EXPERIMENTAL_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EXPERIMENTAL_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
