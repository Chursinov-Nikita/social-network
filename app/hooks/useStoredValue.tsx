import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
};

/**
 * A string value persisted in localStorage and shared between all components that read it.
 * The server render always uses `fallback`, so there is no hydration mismatch.
 */
export const useStoredValue = <T extends string>(
  key: string,
  fallback: T,
  allowed: readonly T[],
) => {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      const stored = localStorage.getItem(key) as T | null;
      return stored && allowed.includes(stored) ? stored : fallback;
    },
    () => fallback,
  );

  const setValue = useCallback(
    (next: T) => {
      localStorage.setItem(key, next);
      listeners.forEach((listener) => listener());
    },
    [key],
  );

  return [value, setValue] as const;
};
