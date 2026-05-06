"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { webApiFetch } from "./api-client";

type CursorPage = {
  nextCursor?: string | null;
};

function withCursor(path: string, cursor: string | null) {
  const url = new URL(path, window.location.origin);
  if (cursor) {
    url.searchParams.set("cursor", cursor);
  }
  return `${url.pathname}${url.search}`;
}

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

  const initialDataString = JSON.stringify(initialData);

  useEffect(() => {
    if (!initialDataString) {
      return;
    }
    hasLoadedRef.current = true;
    setData(JSON.parse(initialDataString));
  }, [initialDataString]);

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
        setError(cause instanceof Error ? cause.message : "Unable to load this view.");
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

export function usePagedOperationalResource<TPage extends CursorPage, TItem>({
  path,
  enabled = true,
  itemKey,
}: {
  path?: string | undefined;
  enabled?: boolean | undefined;
  itemKey: keyof TPage & string;
}) {
  const query = useInfiniteQuery<TPage, Error>({
    queryKey: ["operational-resource", path],
    enabled: Boolean(enabled && path),
    initialPageParam: null,
    queryFn: ({ pageParam }) => webApiFetch<TPage>(withCursor(path!, pageParam as string | null)),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
  const pages = query.data?.pages ?? [];
  const items = pages.flatMap((page) => {
    const pageItems = page[itemKey];
    return Array.isArray(pageItems) ? (pageItems as TItem[]) : [];
  });

  return {
    items,
    loading: query.isLoading,
    loadingMore: query.isFetchingNextPage,
    error: query.error?.message ?? "",
    hasMore: Boolean(query.hasNextPage),
    loadMore() {
      void query.fetchNextPage();
    },
    reload() {
      void query.refetch();
    },
  };
}
