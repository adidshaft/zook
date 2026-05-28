"use client";

import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
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
  const query = useQuery<T, Error>({
    queryKey: ["operational-resource", path],
    enabled: Boolean(enabled && path),
    queryFn: () => webApiFetch<T>(path!),
    ...(initialData !== undefined ? { initialData } : {}),
    ...(initialData !== undefined ? { initialDataUpdatedAt: Date.now() } : {}),
    placeholderData: keepPreviousData,
    staleTime: refreshMs ? Math.min(refreshMs, 60_000) : 120_000,
    gcTime: 10 * 60_000,
    ...(refreshMs ? { refetchInterval: refreshMs } : {}),
    refetchOnWindowFocus: false,
  });

  return {
    data: query.data,
    loading: query.isLoading && !query.data,
    error: query.error?.message ?? "",
    async reload() {
      if (!path) return;
      await query.refetch();
    }
  };
}

export function usePagedOperationalResource<TPage extends CursorPage, TItem>({
  path,
  enabled = true,
  itemKey,
  refreshMs,
}: {
  path?: string | undefined;
  enabled?: boolean | undefined;
  itemKey: keyof TPage & string;
  refreshMs?: number | undefined;
}) {
  const query = useInfiniteQuery<TPage, Error>({
    queryKey: ["operational-resource", path],
    enabled: Boolean(enabled && path),
    initialPageParam: null,
    queryFn: ({ pageParam }) => webApiFetch<TPage>(withCursor(path!, pageParam as string | null)),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
    staleTime: refreshMs ? Math.min(refreshMs, 60_000) : 60_000,
    gcTime: 10 * 60_000,
    ...(refreshMs ? { refetchInterval: refreshMs } : {}),
    refetchOnWindowFocus: false,
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
