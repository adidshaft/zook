type LoadingState = {
  error: string;
  loading: boolean;
  reload?: () => void;
};

type PagedState = LoadingState & {
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
  reload?: () => void;
};

export type { LoadingState, PagedState };
