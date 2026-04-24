"use client";

import { useEffect, useRef, useState } from "react";
import { webApiFetch } from "./api-client";

export function useOperationalResource<T>({
  path,
  enabled = true,
  initialData,
  refreshMs
}: {
  path?: string | undefined;
  enabled?: boolean | undefined;
  initialData?: T | undefined;
  refreshMs?: number | undefined;
}) {
  const hasLoadedRef = useRef(initialData !== undefined);
  const [data, setData] = useState<T | undefined>(initialData);
  const [loading, setLoading] = useState(Boolean(enabled && path && initialData === undefined));
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (initialData === undefined) {
      return;
    }
    hasLoadedRef.current = true;
    setData(initialData);
  }, [initialData]);

  useEffect(() => {
    const resourcePath = path;

    if (!enabled || !resourcePath) {
      return;
    }
    const resolvedPath: string = resourcePath;
    let active = true;

    async function load(showSpinner: boolean) {
      if (showSpinner && !hasLoadedRef.current) {
        setLoading(true);
      }
      try {
        const payload = await webApiFetch<T>(resolvedPath);
        if (!active) {
          return;
        }
        hasLoadedRef.current = true;
        setData(payload);
        setError("");
      } catch (cause) {
        if (!active) {
          return;
        }
        setError(cause instanceof Error ? cause.message : "Unable to load this surface.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load(revision === 0);

    if (!refreshMs) {
      return () => {
        active = false;
      };
    }

    const timer = window.setInterval(() => {
      void load(false);
    }, refreshMs);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [enabled, path, refreshMs, revision]);

  return {
    data,
    loading,
    error,
    reload() {
      setRevision((current) => current + 1);
    }
  };
}
