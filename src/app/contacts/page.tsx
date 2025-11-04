'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as React from 'react';
// Lightweight virtualized list without external dependencies
function VirtualizedList({
  height,
  itemCount,
  itemSize,
  header,
  headerHeight = 0,
  children,
  containerRef,
  onKeyDown,
}: {
  height: number;
  itemCount: number;
  itemSize: number;
  header?: React.ReactElement;
  headerHeight?: number;
  children: (index: number, style: React.CSSProperties) => React.ReactElement;
  containerRef?: React.Ref<HTMLDivElement>;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop((e.currentTarget as HTMLDivElement).scrollTop);
  };
  const buffer = 3;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemSize) - buffer);
  const visibleCount = Math.ceil(height / itemSize) + buffer * 2;
  const endIndex = Math.min(itemCount - 1, startIndex + visibleCount);
  const totalHeight = itemCount * itemSize + headerHeight;

  const items: React.ReactElement[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    const style: React.CSSProperties = {
      position: 'absolute',
      top: headerHeight + i * itemSize,
      height: itemSize,
      left: 0,
      right: 0,
    };
    items.push(children(i, style));
  }

  return (
    <div
      ref={containerRef}
      style={{
        height,
        overflowY: 'auto',
        overflowX: 'hidden',
        position: 'relative',
        width: '100%',
      }}
      onScroll={onScroll}
      onKeyDown={onKeyDown}
      role="list"
      tabIndex={0}
      aria-label="Contacts list"
    >
      {header && (
        <div
          style={{ position: 'sticky', top: 0, zIndex: 5 }}
          className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800"
          role="presentation"
        >
          {header}
        </div>
      )}
      <div style={{ height: totalHeight, position: 'relative' }}>{items}</div>
    </div>
  );
}

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  city: string;
  state: string;
  tags: string[];
  createdAt: number;
  lastActivityAt: number;
};

type ListResult = {
  data: Contact[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
};

export default function ContactsPage() {
  const [toasts, setToasts] = useState<
    { id: string; message: string; type: 'success' | 'error' }[]
  >([]);
  function showToast(message: string, type: 'success' | 'error' = 'success', duration = 2000) {
    const id = Math.random().toString(36).slice(2, 8);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState<keyof Contact>('lastActivityAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [data, setData] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listHeight, setListHeight] = useState<number>(600);
  const listRef = useRef<HTMLDivElement | null>(null);
  const listScrollRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    params.set('sortBy', String(sortBy));
    params.set('sortOrder', sortOrder);
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    return params.toString();
  }, [q, sortBy, sortOrder, page, pageSize]);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    const url = `/api/contacts?${queryString}`;

    // Basic retry for transient errors (up to 3 attempts)
    const attempts = 3;
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { accept: 'application/json' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: ListResult = await res.json();
        setData(json.data);
        setTotal(json.total);
        setLoading(false);
        return;
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        if (i === attempts - 1) {
          setError((e as Error).message);
          setLoading(false);
        } else {
          await new Promise((r) => setTimeout(r, 200 * (i + 1)));
        }
      }
    }
  }, [queryString]);

  useEffect(() => {
    fetchData();
    return () => abortRef.current?.abort();
  }, [fetchData]);

  // Compute a reasonable virtual list height based on viewport
  useEffect(() => {
    function updateHeight() {
      if (typeof window === 'undefined') {
        setListHeight(600);
        return;
      }
      const top = listRef.current?.getBoundingClientRect().top ?? 100;
      // Reserve ~140px for pagination and bottom spacing
      const h = Math.max(280, Math.floor(window.innerHeight - top - 140));
      setListHeight(h);
    }
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const itemSize = density === 'compact' ? 56 : 68;
  const rowPaddingClass = density === 'compact' ? 'py-2.5' : 'py-3.5';
  const gridCols =
    'grid grid-cols-[minmax(280px,1.6fr)_minmax(200px,1fr)_minmax(180px,1fr)_minmax(100px,0.7fr)]';
  const skeletonCount = React.useMemo(
    () => Math.min(Math.ceil(listHeight / itemSize) + 2, 12),
    [listHeight, itemSize]
  );

  // Persist density preference
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('contactsRowDensity');
    const savedDensity =
      saved === 'comfortable' ? 'comfortable' : saved === 'compact' ? 'compact' : null;
    if (savedDensity) setDensity(savedDensity);
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('contactsRowDensity', density);
  }, [density]);

  // Persist sort and page size preferences
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sb = window.localStorage.getItem('contactsSortBy') as keyof Contact | null;
    const so = window.localStorage.getItem('contactsSortOrder') as 'asc' | 'desc' | null;
    const ps = window.localStorage.getItem('contactsPageSize');
    if (
      sb &&
      ['firstName', 'lastName', 'company', 'city', 'state', 'createdAt', 'lastActivityAt'].includes(
        sb
      )
    )
      setSortBy(sb);
    if (so === 'asc' || so === 'desc') setSortOrder(so);
    if (ps && !Number.isNaN(Number(ps))) setPageSize(Number(ps));
  }, []);
  useEffect(() => {
    if (typeof window !== 'undefined')
      window.localStorage.setItem('contactsSortBy', String(sortBy));
  }, [sortBy]);
  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem('contactsSortOrder', sortOrder);
  }, [sortOrder]);
  useEffect(() => {
    if (typeof window !== 'undefined')
      window.localStorage.setItem('contactsPageSize', String(pageSize));
  }, [pageSize]);

  // Persist query for Contacts
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cq = window.localStorage.getItem('contactsQuery');
    if (typeof cq === 'string') setQ(cq);
  }, []);
  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem('contactsQuery', q);
  }, [q]);

  // Reset filters and sorting
  const resetControls = useCallback(() => {
    setQ('');
    setSortBy('lastActivityAt');
    setSortOrder('desc');
    setPageSize(50);
    setPage(1);
  }, []);

  // Reset all: clear local storage preferences and reset controls
  const resetAllControls = () => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('contactsSortBy');
        window.localStorage.removeItem('contactsSortOrder');
        window.localStorage.removeItem('contactsPageSize');
        window.localStorage.removeItem('contactsQuery');
      } catch {}
    }
    resetControls();
    showToast('Preferences cleared', 'success');
  };

  // Keyboard navigation: j/k, arrows, Home/End, Enter
  useEffect(() => {
    setSelectedIndex(0);
  }, [data, page]);
  useEffect(() => {
    const container = listScrollRef.current;
    if (!container) return;
    container.scrollTop = selectedIndex * itemSize;
    const el = container.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement | null;
    el?.focus();
  }, [selectedIndex, itemSize]);
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!data.length) return;
    if (e.key === 'j' || e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(data.length - 1, i + 1));
    } else if (e.key === 'k' || e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSelectedIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSelectedIndex(data.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const el = listScrollRef.current?.querySelector(
        `[data-index="${selectedIndex}"]`
      ) as HTMLAnchorElement | null;
      el?.click();
    }
  };

  // Global keyboard shortcuts: '/' to focus search, 'r' to reset
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable === true);
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
        const input = searchInputRef.current as HTMLInputElement | null;
        if (input) {
          const len = input.value.length;
          input.setSelectionRange(len, len);
        }
      } else if (e.key === 'r' && !isTyping) {
        e.preventDefault();
        resetControls();
      } else if ((e.key === 'd' || e.key === 'D') && !isTyping) {
        e.preventDefault();
        setDensity((prev) => (prev === 'comfortable' ? 'compact' : 'comfortable'));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [resetControls]);

  // Clickable header sorting
  const handleHeaderSort = (key: keyof Contact) => {
    setPage(1);
    if (sortBy === key) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };
  const sortArrow = (key: keyof Contact) =>
    sortBy === key ? (sortOrder === 'asc' ? '▲' : '▼') : '';

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-black dark:to-zinc-900">
      <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-black/40 border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center gap-4">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Contacts
          </h1>
          <button
            type="button"
            onClick={resetAllControls}
            title="Clears saved preferences and resets controls"
            className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2 text-sm"
            aria-label="Reset all and clear preferences"
          >
            Reset All
          </button>
          <div className="ml-auto flex items-center gap-3">
            <label className="sr-only" htmlFor="search">
              Search
            </label>
            <input
              id="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, email, company, city…"
              ref={searchInputRef}
              title="Shortcut: / to focus search, r to reset"
              className="w-64 md:w-80 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-zinc-400/50"
            />
            <select
              aria-label="Sort by"
              value={String(sortBy)}
              title="Select a field to sort; click headers to toggle asc/desc"
              onChange={(e) => {
                setSortBy(e.target.value as keyof Contact);
                setPage(1);
              }}
              className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-2 py-2 text-sm"
            >
              <option value="lastActivityAt">Last Activity</option>
              <option value="createdAt">Created</option>
              <option value="firstName">First Name</option>
              <option value="lastName">Last Name</option>
              <option value="company">Company</option>
              <option value="city">City</option>
              <option value="state">State</option>
            </select>
            <select
              aria-label="Sort order"
              value={sortOrder}
              title="Choose ascending or descending order for current sort field"
              onChange={(e) => {
                setSortOrder(e.target.value as 'asc' | 'desc');
                setPage(1);
              }}
              className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-2 py-2 text-sm"
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
            <select
              aria-label="Page size"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-2 py-2 text-sm"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <div
              role="group"
              aria-label="Row density"
              className="inline-flex rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700"
            >
              <button
                type="button"
                onClick={() => setDensity('comfortable')}
                title="Comfort density"
                aria-label="Comfort density"
                aria-pressed={density === 'comfortable'}
                className={`${density === 'comfortable' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300'} h-9 w-9 grid place-items-center`}
              >
                <svg
                  viewBox="0 0 20 20"
                  className="size-4"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3 5h14M3 10h14M3 15h14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="sr-only">Comfort</span>
              </button>
              <button
                type="button"
                onClick={() => setDensity('compact')}
                title="Compact density"
                aria-label="Compact density"
                aria-pressed={density === 'compact'}
                className={`${density === 'compact' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300'} h-9 w-9 grid place-items-center border-l border-zinc-200 dark:border-zinc-700`}
              >
                <svg
                  viewBox="0 0 20 20"
                  className="size-4"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3 4h14M3 8h14M3 12h14M3 16h14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="sr-only">Compact</span>
              </button>
            </div>
            <button
              type="button"
              onClick={resetControls}
              title="Shortcut: r to reset filters"
              className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2 text-sm"
              aria-label="Reset filters and sorting"
            >
              Reset
            </button>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-2">
              Hint: Press / to search, r to reset
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-6">
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-200"
          >
            Failed to load: {error}{' '}
            <button className="ml-3 underline" onClick={() => fetchData()}>
              Retry
            </button>
          </div>
        )}
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          {loading ? (
            <div ref={listRef}>
              <div
                style={{ position: 'sticky', top: 0, zIndex: 5 }}
                className="bg-zinc-50/60 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800"
              >
                <div
                  className={`${gridCols} gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300`}
                >
                  <button
                    type="button"
                    onClick={() => handleHeaderSort('firstName')}
                    aria-sort={
                      sortBy === 'firstName'
                        ? sortOrder === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                    className="px-4 py-3 text-left hover:underline"
                  >
                    Contact {sortArrow('firstName')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleHeaderSort('company')}
                    aria-sort={
                      sortBy === 'company'
                        ? sortOrder === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                    className="px-4 py-3 text-left hover:underline"
                  >
                    Company {sortArrow('company')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleHeaderSort('city')}
                    aria-sort={
                      sortBy === 'city'
                        ? sortOrder === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                    className="px-4 py-3 text-left hover:underline"
                  >
                    Location {sortArrow('city')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleHeaderSort('lastActivityAt')}
                    aria-sort={
                      sortBy === 'lastActivityAt'
                        ? sortOrder === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                    className="px-4 py-3 text-right hover:underline"
                  >
                    Activity {sortArrow('lastActivityAt')}
                  </button>
                </div>
              </div>
              <div style={{ height: listHeight }}>
                {Array.from({ length: skeletonCount }).map((_, i) => (
                  <div
                    key={i}
                    className={`${gridCols} items-center gap-2 px-4 ${rowPaddingClass} border-b border-zinc-200 dark:border-zinc-800`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-28 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                          <div className="h-3 w-10 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                        </div>
                        <div className="mt-2 h-3 w-40 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                      </div>
                    </div>
                    <div className="h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                    <div className="h-3 w-28 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                    <div className="h-3 w-16 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse ml-auto" />
                  </div>
                ))}
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 grid place-items-center">
                <span className="text-zinc-500">🗂️</span>
              </div>
              <div className="text-sm text-zinc-700 dark:text-zinc-300">No contacts found.</div>
              <div className="mt-2 text-xs text-zinc-500">Try adjusting filters or search.</div>
              <button
                className="mt-4 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
                onClick={() => {
                  setQ('');
                  setPage(1);
                }}
              >
                Clear search
              </button>
            </div>
          ) : (
            <div ref={listRef}>
              <VirtualizedList
                height={listHeight}
                itemCount={data.length}
                itemSize={itemSize}
                headerHeight={48}
                header={
                  <div
                    className={`${gridCols} gap-2 bg-zinc-50/60 dark:bg-zinc-800/40 text-xs font-medium text-zinc-700 dark:text-zinc-300`}
                  >
                    <button
                      type="button"
                      onClick={() => handleHeaderSort('firstName')}
                      aria-sort={
                        sortBy === 'firstName'
                          ? sortOrder === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                      className="px-4 py-3 text-left hover:underline"
                    >
                      Contact {sortArrow('firstName')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleHeaderSort('company')}
                      aria-sort={
                        sortBy === 'company'
                          ? sortOrder === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                      className="px-4 py-3 text-left hover:underline"
                    >
                      Company {sortArrow('company')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleHeaderSort('city')}
                      aria-sort={
                        sortBy === 'city'
                          ? sortOrder === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                      className="px-4 py-3 text-left hover:underline"
                    >
                      Location {sortArrow('city')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleHeaderSort('lastActivityAt')}
                      aria-sort={
                        sortBy === 'lastActivityAt'
                          ? sortOrder === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                      className="px-4 py-3 text-right hover:underline"
                    >
                      Activity {sortArrow('lastActivityAt')}
                    </button>
                  </div>
                }
                containerRef={listScrollRef}
                onKeyDown={handleKeyDown}
              >
                {(index, style) => {
                  const c = data[index];
                  return (
                    <a
                      style={style}
                      href={`/contacts/${c.id}`}
                      className={`group ${gridCols} items-center gap-2 px-4 ${rowPaddingClass} hover:bg-zinc-50 dark:hover:bg-zinc-800/40 odd:bg-zinc-50/40 dark:odd:bg-zinc-800/30 border-b border-zinc-200 dark:border-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 cursor-pointer ${selectedIndex === index ? 'ring-1 ring-indigo-400/50' : ''}`}
                      role="listitem"
                      key={c.id}
                      data-index={index}
                      aria-label={`Open contact ${c.firstName} ${c.lastName}`}
                      title={`${c.firstName} ${c.lastName}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 size-8 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white grid place-items-center text-xs font-semibold shadow-sm">
                          {c.firstName[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100 group-hover:underline">
                              {c.firstName} {c.lastName}
                            </span>
                            <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:text-zinc-400">
                              {c.id}
                            </span>
                          </div>
                          <div className="truncate text-xs text-zinc-500">{c.email}</div>
                        </div>
                      </div>
                      <div className="truncate text-sm text-zinc-700 dark:text-zinc-300">
                        {c.company}
                      </div>
                      <div className="truncate text-sm text-zinc-700 dark:text-zinc-300">
                        {c.city}, {c.state}
                      </div>
                      <div className="text-right text-sm tabular-nums text-zinc-700 dark:text-zinc-300">
                        {new Date(c.lastActivityAt).toLocaleDateString()}
                      </div>
                    </a>
                  );
                }}
              </VirtualizedList>
            </div>
          )}
        </div>

        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Page {page} of {totalPages} · {total.toLocaleString()} results
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
            >
              Previous
            </button>
            <button
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm disabled:opacity-50"
              onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
              disabled={page >= totalPages || loading}
            >
              Next
            </button>
          </div>
        </nav>
      </main>
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg px-4 py-2 shadow-lg text-sm ${t.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
