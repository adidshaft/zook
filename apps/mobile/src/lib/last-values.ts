import { useCallback, useEffect, useState } from "react";
import { getStoredValue, setStoredValue } from "./storage";
import { compactLastValues } from "./last-values-core";

export { compactLastValues };

export function useLastValues<T>(key: string, max = 5) {
  const storageKey = `zook:last-values:${key}`;
  const [values, setValues] = useState<T[]>([]);

  useEffect(() => {
    let cancelled = false;
    void getStoredValue(storageKey).then((stored) => {
      if (cancelled || !stored) return;
      try {
        const parsed = JSON.parse(stored) as T[];
        if (Array.isArray(parsed)) setValues(parsed.slice(0, max));
      } catch {
        setValues([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [max, storageKey]);

  const remember = useCallback(
    async (nextValue: T) => {
      const nextValues = compactLastValues(values, nextValue, max);
      setValues(nextValues);
      await setStoredValue(storageKey, JSON.stringify(nextValues));
    },
    [max, storageKey, values],
  );

  return { remember, values };
}
