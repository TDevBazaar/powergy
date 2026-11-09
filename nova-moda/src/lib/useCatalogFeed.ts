"use client";

/* ── Feed de productos: cursor infinito sin categoría / paginado (20) con categoría ── */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useCatalogStore,
  useCatalogVersion,
  useCategoryMap,
} from "./catalog-store";
import {
  fetchProductsCursor,
  fetchProductsPage,
  type ProductQueryOptions,
  type ProductView,
} from "./powergy-api";
import type { FilterState } from "./types";

export interface UseCatalogFeedOptions {
  filters: FilterState;
  lockedCategory?: string;
  ready?: boolean;
  pageSize?: number;
  cursorLimit?: number;
}

export interface CatalogFeedResult {
  items: ProductView[];
  totalItems: number | null;
  page: number;
  totalPages: number;
  pageSize: number;
  setPage: (nextPage: number) => void;
  isPaginated: boolean;
  hasMore: boolean;
  loadingInitial: boolean;
  loadingMore: boolean;
  error: string | null;
  loadMoreError: string | null;
  retry: () => void;
  loadMore: () => void;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
}

interface FeedState {
  key: string;
  resolved: boolean;
  items: ProductView[];
  totalItems: number | null;
  totalPages: number;
  nextCursor: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  error: string | null;
  loadMoreError: string | null;
}

const INITIAL_FEED: FeedState = {
  key: "",
  resolved: false,
  items: [],
  totalItems: null,
  totalPages: 0,
  nextCursor: null,
  hasMore: false,
  loadingMore: false,
  error: null,
  loadMoreError: null,
};

export function useCatalogFeed({
  filters,
  lockedCategory,
  ready = true,
  pageSize = 20,
  cursorLimit = 12,
}: UseCatalogFeedOptions): CatalogFeedResult {
  const catalogVersion = useCatalogVersion();
  const categoryMap = useCategoryMap();
  const categoryMapRef = useRef(categoryMap);

  useEffect(() => {
    categoryMapRef.current = categoryMap;
  }, [categoryMap]);

  const [debouncedQ, setDebouncedQ] = useState(filters.q);
  const [debouncedMaxPrice, setDebouncedMaxPrice] = useState(filters.maxPrice);

  useEffect(() => {
    const delay = filters.q.trim() === "" ? 100 : 220;
    const timer = window.setTimeout(() => setDebouncedQ(filters.q), delay);
    return () => window.clearTimeout(timer);
  }, [filters.q]);

  useEffect(() => {
    const delay = filters.maxPrice === 0 ? 100 : 220;
    const timer = window.setTimeout(
      () => setDebouncedMaxPrice(filters.maxPrice),
      delay
    );
    return () => window.clearTimeout(timer);
  }, [filters.maxPrice]);

  const effectiveCategories = useMemo(
    () =>
      lockedCategory
        ? [lockedCategory]
        : [...filters.cats]
            .map((c) => c.trim())
            .filter(Boolean)
            .sort(),
    [lockedCategory, filters.cats]
  );

  const isPaginated = effectiveCategories.length > 0;

  const queryOpts: ProductQueryOptions = useMemo(
    () => ({
      categories: effectiveCategories,
      q: debouncedQ.trim() || undefined,
      maxPrice: debouncedMaxPrice > 0 ? debouncedMaxPrice : undefined,
      onSale: filters.onlyOffers || undefined,
      sort: filters.sort,
    }),
    [
      effectiveCategories,
      debouncedQ,
      debouncedMaxPrice,
      filters.onlyOffers,
      filters.sort,
    ]
  );

  const [retryNonce, setRetryNonce] = useState(0);

  const queryKey = useMemo(
    () =>
      JSON.stringify({
        cats: effectiveCategories,
        q: debouncedQ.trim(),
        maxPrice: debouncedMaxPrice > 0 ? debouncedMaxPrice : 0,
        onlyOffers: filters.onlyOffers,
        sort: filters.sort,
        isPaginated,
        pageSize,
        cursorLimit,
        catalogVersion,
      }),
    [
      effectiveCategories,
      debouncedQ,
      debouncedMaxPrice,
      filters.onlyOffers,
      filters.sort,
      isPaginated,
      pageSize,
      cursorLimit,
      catalogVersion,
    ]
  );

  const [pageState, setPageState] = useState<{ key: string; page: number }>({
    key: queryKey,
    page: 1,
  });
  const page = pageState.key === queryKey ? pageState.page : 1;

  const setPage = useCallback(
    (nextPage: number) => {
      setPageState({ key: queryKey, page: Math.max(1, nextPage) });
    },
    [queryKey]
  );

  const requestKey = isPaginated
    ? `${queryKey}#p=${page}#r=${retryNonce}`
    : `${queryKey}#r=${retryNonce}`;

  const [feed, setFeed] = useState<FeedState>(INITIAL_FEED);

  const moreAbortRef = useRef<AbortController | null>(null);
  const loadingMoreLockRef = useRef<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ready) return;

    const controller = new AbortController();
    const activeKey = requestKey;
    moreAbortRef.current?.abort();
    moreAbortRef.current = null;
    loadingMoreLockRef.current = null;

    if (isPaginated) {
      fetchProductsPage(
        { ...queryOpts, page, pageSize },
        categoryMapRef.current,
        controller.signal
      )
        .then((res) => {
          if (controller.signal.aborted) return;
          useCatalogStore.getState().registerProducts(res.items);
          setFeed({
            key: activeKey,
            resolved: true,
            items: res.items,
            totalItems: res.totalItems,
            totalPages: res.totalPages,
            nextCursor: null,
            hasMore: false,
            loadingMore: false,
            error: null,
            loadMoreError: null,
          });
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setFeed({
            key: activeKey,
            resolved: true,
            items: [],
            totalItems: 0,
            totalPages: 0,
            nextCursor: null,
            hasMore: false,
            loadingMore: false,
            error:
              err instanceof Error
                ? err.message
                : "No se pudieron cargar los productos.",
            loadMoreError: null,
          });
        });
    } else {
      fetchProductsCursor(
        { ...queryOpts, cursor: null, limit: cursorLimit },
        categoryMapRef.current,
        controller.signal
      )
        .then((res) => {
          if (controller.signal.aborted) return;
          useCatalogStore.getState().registerProducts(res.items);
          setFeed({
            key: activeKey,
            resolved: true,
            items: res.items,
            totalItems: res.totalItems,
            totalPages: 0,
            nextCursor: res.nextCursor,
            hasMore: res.hasMore && Boolean(res.nextCursor),
            loadingMore: false,
            error: null,
            loadMoreError: null,
          });
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setFeed({
            key: activeKey,
            resolved: true,
            items: [],
            totalItems: null,
            totalPages: 0,
            nextCursor: null,
            hasMore: false,
            loadingMore: false,
            error:
              err instanceof Error
                ? err.message
                : "No se pudieron cargar los productos.",
            loadMoreError: null,
          });
        });
    }

    return () => {
      controller.abort();
      moreAbortRef.current?.abort();
      moreAbortRef.current = null;
      loadingMoreLockRef.current = null;
    };
  }, [ready, requestKey, isPaginated, queryOpts, page, pageSize, cursorLimit]);

  const isCurrent = ready && feed.key === requestKey && feed.resolved;
  const loadingInitial = !isCurrent;
  const items = isCurrent ? feed.items : [];
  const totalItems = isCurrent ? feed.totalItems : null;
  const totalPages = isCurrent ? feed.totalPages : 0;
  const nextCursor = isCurrent ? feed.nextCursor : null;
  const hasMore = isCurrent ? feed.hasMore : false;
  const loadingMore = isCurrent ? feed.loadingMore : false;
  const error = isCurrent ? feed.error : null;
  const loadMoreError = isCurrent ? feed.loadMoreError : null;

  const loadMore = useCallback(() => {
    if (
      !ready ||
      isPaginated ||
      !isCurrent ||
      !hasMore ||
      !nextCursor ||
      loadingMore
    ) {
      return;
    }

    const activeKey = requestKey;
    const lockKey = `${activeKey}:${nextCursor}`;
    if (loadingMoreLockRef.current === lockKey) return;
    loadingMoreLockRef.current = lockKey;

    const controller = new AbortController();
    moreAbortRef.current?.abort();
    moreAbortRef.current = controller;

    setFeed((curr) =>
      curr.key === activeKey
        ? { ...curr, loadingMore: true, loadMoreError: null }
        : curr
    );

    fetchProductsCursor(
      { ...queryOpts, cursor: nextCursor, limit: cursorLimit },
      categoryMapRef.current,
      controller.signal
    )
      .then((res) => {
        if (controller.signal.aborted) return;
        useCatalogStore.getState().registerProducts(res.items);
        setFeed((curr) => {
          if (curr.key !== activeKey) return curr;
          const seen = new Set(curr.items.map((item) => item.id));
          const uniqueNext = res.items.filter((item) => !seen.has(item.id));
          return {
            ...curr,
            items: [...curr.items, ...uniqueNext],
            nextCursor: res.nextCursor,
            hasMore: res.hasMore && Boolean(res.nextCursor),
            loadingMore: false,
            loadMoreError: null,
          };
        });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setFeed((curr) =>
          curr.key === activeKey
            ? {
                ...curr,
                loadingMore: false,
                loadMoreError:
                  err instanceof Error
                    ? err.message
                    : "No se pudieron cargar más productos.",
              }
            : curr
        );
      })
      .finally(() => {
        if (loadingMoreLockRef.current === lockKey) {
          loadingMoreLockRef.current = null;
        }
        if (moreAbortRef.current === controller) {
          moreAbortRef.current = null;
        }
      });
  }, [
    ready,
    isPaginated,
    isCurrent,
    hasMore,
    nextCursor,
    loadingMore,
    requestKey,
    queryOpts,
    cursorLimit,
  ]);

  const retry = useCallback(() => {
    if (!isPaginated && loadMoreError && !error) {
      loadMore();
      return;
    }
    setRetryNonce((n) => n + 1);
  }, [isPaginated, loadMoreError, error, loadMore]);

  useEffect(() => {
    if (
      isPaginated ||
      !ready ||
      loadingInitial ||
      loadingMore ||
      !hasMore ||
      Boolean(error) ||
      Boolean(loadMoreError)
    ) {
      return;
    }

    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          loadMore();
        }
      },
      { rootMargin: "280px 0px", threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [
    isPaginated,
    ready,
    loadingInitial,
    loadingMore,
    hasMore,
    error,
    loadMoreError,
    requestKey,
    items.length,
    loadMore,
  ]);

  return {
    items,
    totalItems,
    page,
    totalPages,
    pageSize,
    setPage,
    isPaginated,
    hasMore,
    loadingInitial,
    loadingMore,
    error,
    loadMoreError,
    retry,
    loadMore,
    sentinelRef,
  };
}

