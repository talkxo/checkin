'use client';

import { useEffect, useState } from 'react';

// Per-user experimental-features preference. Stored in localStorage under a
// slug-scoped key, mirroring how display-name and reminders are persisted —
// it's a viewer opt-in, not data. Default OFF: experimental features only
// exist in the UI after the user enables them from the sandwich menu.

export const EXPERIMENTAL_EVENT = 'exp-features-changed';

function storageKey(slug: string): string {
  return `exp-features:${slug}`;
}

function readShown(slug: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(storageKey(slug)) === '1';
  } catch {
    return false;
  }
}

export function isExperimentalShown(slug: string): boolean {
  return readShown(slug);
}

export function setExperimentalShown(slug: string, value: boolean): void {
  try {
    window.localStorage.setItem(storageKey(slug), value ? '1' : '0');
  } catch {
    // storage blocked — toggle just won't persist
  }
  window.dispatchEvent(new CustomEvent(EXPERIMENTAL_EVENT));
}

/** Reactive shown-flag for the given user; re-renders on toggle or cross-tab change. */
export function useExperimentalShown(slug: string): boolean {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const sync = () => setShown(readShown(slug));
    sync();
    window.addEventListener(EXPERIMENTAL_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EXPERIMENTAL_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [slug]);

  return shown;
}
