'use client';

import Link from 'next/link';
import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

type Task = {
  id: string;
  contactId: string;
  title: string;
  notes?: string;
  dueDate?: number;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
  updatedAt: number;
};

type TaskListResult = {
  data: Task[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
};

export default function ContactTasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = use(params);

  const [contact, setContact] = useState<Contact | null>(null);
  const [tasks, setTasks] = useState<(Task & { _optimistic?: boolean; _error?: string })[]>([]);
  const [loadingContact, setLoadingContact] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<Task['priority']>('medium');
  const [editDueDate, setEditDueDate] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<
    { id: string; message: string; type: 'success' | 'error' }[]
  >([]);

  function showToast(message: string, type: 'success' | 'error' = 'success', duration = 2500) {
    const id = Math.random().toString(36).slice(2, 8);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }

  const [q, setQ] = useState('');
  const [completedFilter, setCompletedFilter] = useState<'all' | 'open' | 'done'>('all');
  const [sortBy, setSortBy] = useState<keyof Task>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const abortRef = useRef<AbortController | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Persist sort and page size preferences for Tasks
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sb = window.localStorage.getItem('tasksSortBy') as keyof Task | null;
    const so = window.localStorage.getItem('tasksSortOrder') as 'asc' | 'desc' | null;
    const ps = window.localStorage.getItem('tasksPageSize');
    const allowed: Array<keyof Task> = ['updatedAt', 'createdAt', 'dueDate', 'title', 'priority'];
    if (sb && allowed.includes(sb)) setSortBy(sb);
    if (so === 'asc' || so === 'desc') setSortOrder(so);
    if (ps && !Number.isNaN(Number(ps))) setPageSize(Number(ps));
  }, []);
  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem('tasksSortBy', String(sortBy));
  }, [sortBy]);
  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem('tasksSortOrder', sortOrder);
  }, [sortOrder]);
  useEffect(() => {
    if (typeof window !== 'undefined')
      window.localStorage.setItem('tasksPageSize', String(pageSize));
  }, [pageSize]);

  // Persist query and completed filter
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tq = window.localStorage.getItem('tasksQuery');
    const cf = window.localStorage.getItem('tasksCompletedFilter') as
      | 'all'
      | 'open'
      | 'done'
      | null;
    if (typeof tq === 'string') setQ(tq);
    if (cf === 'all' || cf === 'open' || cf === 'done') setCompletedFilter(cf);
  }, []);
  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem('tasksQuery', q);
  }, [q]);
  useEffect(() => {
    if (typeof window !== 'undefined')
      window.localStorage.setItem('tasksCompletedFilter', completedFilter);
  }, [completedFilter]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('contactId', contactId);
    if (q) params.set('q', q);
    if (completedFilter !== 'all') params.set('completed', String(completedFilter === 'done'));
    params.set('sortBy', String(sortBy));
    params.set('sortOrder', sortOrder);
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    return params.toString();
  }, [contactId, q, completedFilter, sortBy, sortOrder, page, pageSize]);

  const loadContact = useCallback(async () => {
    setLoadingContact(true);
    setError(null);
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        headers: { accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const c: Contact = await res.json();
      setContact(c);
      setLoadingContact(false);
    } catch (e) {
      setError((e as Error).message);
      setLoadingContact(false);
    }
  }, [contactId]);

  const loadTasks = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoadingTasks(true);
    setError(null);
    const url = `/api/tasks?${queryString}`;
    const attempts = 3;
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { accept: 'application/json' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: TaskListResult = await res.json();
        setTasks(json.data);
        setLoadingTasks(false);
        return;
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        if (i === attempts - 1) {
          setError((e as Error).message);
          setLoadingTasks(false);
        } else {
          await new Promise((r) => setTimeout(r, 200 * (i + 1)));
        }
      }
    }
  }, [queryString]);

  // Reset filters and sorting to defaults
  const resetControls = () => {
    setQ('');
    setCompletedFilter('all');
    setSortBy('updatedAt');
    setSortOrder('desc');
    setPageSize(25);
    setPage(1);
  };

  // Global keyboard shortcuts: '/' focuses search, 'r' resets filters
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      const isTyping =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        (document.activeElement as HTMLElement | null)?.isContentEditable;
      if (isTyping) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        resetControls();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    loadContact();
  }, [loadContact]);

  useEffect(() => {
    loadTasks();
    return () => abortRef.current?.abort();
  }, [loadTasks]);

  // Actions
  // Retry utilities for transient failures
  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  async function withRetry<T>(fn: () => Promise<T>, attempts = 3) {
    let lastError: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (e) {
        lastError = e;
        if (i === attempts - 1) break;
        const base = 200 * (i + 1);
        const jitter = Math.floor(Math.random() * 200);
        await sleep(base + jitter);
      }
    }
    throw lastError as Error;
  }
  async function createTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const title = String(fd.get('title') || '').trim();
    const priority = (fd.get('priority') || 'medium') as Task['priority'];
    const dueDateStr = fd.get('dueDate') as string | null;
    const dueDate = dueDateStr ? new Date(dueDateStr).getTime() : undefined;
    if (!title) return;

    const optimistic: Task & { _optimistic?: boolean; _error?: string } = {
      id: `TEMP-${Math.random().toString(36).slice(2, 8)}`,
      contactId,
      title,
      notes: undefined,
      dueDate,
      completed: false,
      priority,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      _optimistic: true,
    };
    setTasks((prev) => [optimistic, ...prev]);
    form.reset();

    try {
      const created: Task = await withRetry(async () => {
        const res = await fetch(`/api/tasks`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ contactId, title, priority, dueDate }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      });
      setTasks((prev) => prev.map((t) => (t.id === optimistic.id ? created : t)));
      showToast('Task created', 'success');
    } catch (err) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === optimistic.id ? { ...t, _optimistic: false, _error: (err as Error).message } : t
        )
      );
      showToast('Failed to create task', 'error');
    }
  }

  async function setCompleted(task: Task, completed: boolean) {
    const next = { ...task, completed };
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...next, _optimistic: true } : t)));
    try {
      const updated: Task = await withRetry(async () => {
        const res = await fetch(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ completed }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
      showToast(completed ? 'Task completed' : 'Task reopened', 'success');
    } catch (err) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...task, _optimistic: false, _error: (err as Error).message } : t
        )
      );
      showToast('Failed to update task', 'error');
    }
  }

  async function deleteTask(task: Task) {
    const prev = tasks;
    setTasks((cur) => cur.filter((t) => t.id !== task.id));
    try {
      await withRetry(async () => {
        const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return true;
      });
      showToast('Task deleted', 'success');
    } catch (err) {
      setTasks(
        prev.map((t) =>
          t.id === task.id ? { ...task, _optimistic: false, _error: (err as Error).message } : t
        )
      );
      showToast('Failed to delete task', 'error');
    }
  }

  async function retryCreateOptimistic(task: Task & { _optimistic?: boolean; _error?: string }) {
    // Re-attempt a failed optimistic creation using the task's fields
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, _optimistic: true, _error: undefined } : t))
    );
    try {
      const created: Task = await withRetry(async () => {
        const res = await fetch(`/api/tasks`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            contactId,
            title: task.title,
            priority: task.priority,
            dueDate: task.dueDate,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? created : t)));
    } catch (err) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...task, _optimistic: false, _error: (err as Error).message } : t
        )
      );
    }
  }

  function startEdit(task: Task) {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditPriority(task.priority);
    setEditDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '');
  }

  function cancelEdit() {
    setEditingTaskId(null);
    setEditTitle('');
    setEditPriority('medium');
    setEditDueDate('');
  }

  async function saveEdit(task: Task) {
    const title = editTitle.trim();
    if (!title) return;
    const dueDate = editDueDate ? new Date(editDueDate).getTime() : undefined;
    const next = { ...task, title, priority: editPriority, dueDate };
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...next, _optimistic: true, _error: undefined } : t))
    );
    try {
      const updated: Task = await withRetry(async () => {
        const res = await fetch(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ title, priority: editPriority, dueDate }),
        });
        if (res.status === 404) {
          // Preserve specific 404 signal so caller can reconcile
          const json = await res.json().catch(() => ({ message: 'NotFoundError: task not found' }));
          throw new Error(json?.message || 'NotFoundError: task not found');
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
      cancelEdit();
      showToast('Task updated', 'success');
    } catch (err) {
      const msg = (err as Error).message;
      // If the task no longer exists on the server (e.g., dev server reseeded),
      // refresh list to reconcile local state.
      if (msg.startsWith('NotFoundError')) {
        setTasks((prev) => prev.filter((t) => t.id !== task.id));
        cancelEdit();
        // Soft refresh in background; ignore errors
        loadTasks();
        showToast('Task no longer exists', 'error');
      } else {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...task, _optimistic: false, _error: msg } : t))
        );
        showToast('Failed to update task', 'error');
      }
    }
  }

  const totalOpen = tasks.filter((t) => !t.completed).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-black dark:to-zinc-900">
      <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-black/40 border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center gap-4">
          <Link
            href="/contacts"
            className="rounded-lg px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ← Contacts
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Tasks
          </h1>
          <div className="ml-auto text-sm text-zinc-600 dark:text-zinc-400">Open: {totalOpen}</div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-6">
        {loadingContact ? (
          <div className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">Loading contact…</div>
        ) : contact ? (
          <section className="mb-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <div className="flex items-start gap-4">
              <div className="size-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white grid place-items-center text-sm font-semibold">
                {contact.firstName[0]}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {contact.firstName} {contact.lastName}
                  </div>
                  <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:text-zinc-400">
                    {contact.id}
                  </span>
                </div>
                <div className="truncate text-xs text-zinc-500">{contact.email}</div>
                <div className="text-xs text-zinc-500">
                  {contact.company} · {contact.city}, {contact.state}
                </div>
              </div>
            </div>
          </section>
        ) : (
          <div className="mb-4 text-sm text-red-700 dark:text-red-300">
            {error?.startsWith('HTTP 404') ? (
              <span>
                Contact not found. Please return to{' '}
                <Link href="/contacts" className="underline">
                  Contacts
                </Link>{' '}
                and choose a contact from the list.
              </span>
            ) : (
              <span>Failed to load contact.</span>
            )}
          </div>
        )}

        <section className="mb-4">
          <form onSubmit={createTask} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[260px]">
              <label
                htmlFor="title"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Title
              </label>
              <input
                id="title"
                name="title"
                required
                placeholder="e.g., Follow up email"
                className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="priority"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                className="mt-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="dueDate"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Due
              </label>
              <input
                id="dueDate"
                name="dueDate"
                type="date"
                className="mt-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Add Task
            </button>
          </form>
        </section>

        <section className="sticky top-16 z-20 -mx-6 px-6 py-2 mb-2 flex items-center gap-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-zinc-900/70 border-b border-zinc-200 dark:border-zinc-800">
          <input
            aria-label="Search tasks"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search tasks…"
            ref={searchInputRef}
            title="Shortcut: / to focus search, r to reset"
            className="w-64 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
          />
          <select
            aria-label="Completed filter"
            value={completedFilter}
            onChange={(e) => {
              setCompletedFilter(e.target.value as 'all' | 'open' | 'done');
              setPage(1);
            }}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="done">Done</option>
          </select>
          <select
            aria-label="Sort by"
            value={String(sortBy)}
            onChange={(e) => {
              setSortBy(e.target.value as keyof Task);
              setPage(1);
            }}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
          >
            <option title="Sort by last update time" value="updatedAt">
              Updated
            </option>
            <option title="Sort by creation time" value="createdAt">
              Created
            </option>
            <option title="Sort by due date" value="dueDate">
              Due
            </option>
            <option title="Sort by task title" value="title">
              Title
            </option>
            <option title="Sort by priority (high→low/low→high)" value="priority">
              Priority
            </option>
          </select>
          <select
            aria-label="Sort order"
            title="Choose ascending or descending order for current sort field"
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value as 'asc' | 'desc');
              setPage(1);
            }}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
          >
            <option title="Descending order" value="desc">
              Desc
            </option>
            <option title="Ascending order" value="asc">
              Asc
            </option>
          </select>
          <select
            aria-label="Page size"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <button
            type="button"
            onClick={resetControls}
            title="Shortcut: r to reset filters"
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
            aria-label="Reset filters and sorting"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                if (typeof window !== 'undefined') {
                  window.localStorage.removeItem('contactsSortBy');
                  window.localStorage.removeItem('contactsSortOrder');
                  window.localStorage.removeItem('contactsPageSize');
                  window.localStorage.removeItem('tasksSortBy');
                  window.localStorage.removeItem('tasksSortOrder');
                  window.localStorage.removeItem('tasksPageSize');
                  window.localStorage.removeItem('tasksQuery');
                  window.localStorage.removeItem('tasksCompletedFilter');
                }
              } catch {}
              resetControls();
              showToast('Preferences cleared', 'success');
            }}
            title="Clears saved preferences and resets controls"
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
            aria-label="Reset all and clear preferences"
          >
            Reset All
          </button>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-2">
            Hint: Press / to search, r to reset
          </span>
        </section>

        {error && (
          <div
            role="alert"
            className="mb-3 rounded-lg border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-200"
          >
            {error}
            <button className="ml-3 underline" onClick={() => loadTasks()}>
              Retry
            </button>
          </div>
        )}

        <section className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          {loadingTasks ? (
            <div
              role="status"
              aria-live="polite"
              className="divide-y divide-zinc-200 dark:divide-zinc-800"
            >
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <span
                    aria-hidden
                    className="mt-0.5 inline-block size-4 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="block h-3 w-48 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                      <span className="block h-3 w-12 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="block h-2 w-24 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                      <span className="block h-2 w-32 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                    </div>
                  </div>
                  <span className="h-5 w-16 rounded-full bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                  <span className="h-7 w-20 rounded-lg bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                  <span className="h-7 w-16 rounded-lg bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                  <span className="h-7 w-16 rounded-lg bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                </div>
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-6 text-sm text-zinc-600 dark:text-zinc-400">No tasks found.</div>
          ) : (
            <ul role="list" className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {tasks.map((t) => (
                <li
                  key={t.id}
                  onClick={() => setSelectedTaskId(t.id)}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer ${selectedTaskId === t.id ? 'ring-2 ring-indigo-400/60' : ''}`}
                >
                  {editingTaskId === t.id ? (
                    <div className="flex w-full items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-end gap-2">
                          <input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm"
                          />
                          <select
                            value={editPriority}
                            onChange={(e) => setEditPriority(e.target.value as Task['priority'])}
                            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                          <input
                            type="date"
                            value={editDueDate}
                            onChange={(e) => setEditDueDate(e.target.value)}
                            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm"
                          />
                        </div>
                        {t._error && <div className="mt-1 text-xs text-red-600">{t._error}</div>}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          saveEdit(t);
                        }}
                        className="rounded-lg bg-indigo-600 px-2 py-1 text-sm font-medium text-white hover:bg-indigo-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelEdit();
                        }}
                        className="rounded-lg px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span
                        aria-hidden
                        className={`mt-0.5 inline-block size-4 rounded ${t.completed ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      ></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div
                            className={`truncate text-sm ${t.completed ? 'line-through text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'}`}
                          >
                            {t.title}
                          </div>
                          {t._optimistic && (
                            <span className="text-[10px] text-zinc-500">saving…</span>
                          )}
                          {t._error && (
                            <span className="text-[10px] text-red-600">
                              {t._error}
                              {t.id.startsWith('TEMP-') && (
                                <button
                                  className="ml-2 underline"
                                  onClick={() => retryCreateOptimistic(t)}
                                >
                                  Retry
                                </button>
                              )}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {t.dueDate ? `Due ${new Date(t.dueDate).toLocaleDateString()}` : 'No due'}{' '}
                          ·
                          <span className="ml-1">
                            Updated {new Date(t.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${t.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200' : t.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'}`}
                      >
                        {t.priority}
                      </span>
                      {!t.completed ? (
                        <button
                          aria-label="Mark complete"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCompleted(t, true);
                          }}
                          className="rounded-lg bg-emerald-600 px-2 py-1 text-sm font-medium text-white hover:bg-emerald-700"
                        >
                          Complete
                        </button>
                      ) : (
                        <span className="rounded-lg px-2 py-1 text-sm text-zinc-500">
                          Completed
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(t);
                        }}
                        className="rounded-lg px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        Edit
                      </button>
                      <button
                        aria-label="Delete task"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTask(t);
                        }}
                        className="rounded-lg px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
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
