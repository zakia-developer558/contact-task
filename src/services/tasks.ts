import { readJson, writeJson, TASKS_FILE } from './store';
import { getContact } from './contacts';

export type Task = {
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

export type TaskListParams = {
  contactId?: string;
  q?: string;
  sortBy?: keyof Task;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  completed?: boolean;
};

export type TaskListResult = {
  data: Task[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
};

export type TaskCreateInput = {
  contactId: string;
  title: string;
  notes?: string;
  dueDate?: number;
  priority?: 'low' | 'medium' | 'high';
};

export type TaskUpdateInput = {
  title?: string;
  notes?: string;
  dueDate?: number;
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
};

// File-backed storage; load from JSON on each operation
let TASKS_CACHE: Task[] | null = null;

function normalize(s: string) {
  return s.toLowerCase();
}

function pad(num: number, size = 5): string {
  let s = String(num);
  while (s.length < size) s = '0' + s;
  return s;
}

function seedTasks(count = 0): Task[] {
  // Start with empty persistent tasks; we'll grow via UI actions
  const now = Date.now();
  const titles = [
    'Follow up email',
    'Schedule demo',
    'Prepare quote',
    'Update contract',
    'Check-in call',
    'Share roadmap',
    'Collect feedback',
    'Onboarding session',
    'Invoice review',
    'Bug triage',
  ];
  const notes = [
    'Mention new feature release.',
    'Include discount details.',
    'Ask for availability next week.',
    'Confirm billing address.',
    'Record pain points.',
    'Add training materials.',
  ];
  const prios: Array<Task['priority']> = ['low', 'medium', 'high'];

  const out: Task[] = [];
  for (let i = 1; i <= count; i++) {
    const createdAt = now - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 120);
    const updatedAt = createdAt + Math.floor(Math.random() * (now - createdAt));
    out.push({
      id: `T${pad(i)}`,
      contactId: `C${pad((i * 13) % 5000, 5)}`,
      title: titles[i % titles.length],
      notes: notes[i % notes.length],
      dueDate: createdAt + Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30),
      completed: Math.random() < 0.35,
      priority: prios[i % prios.length],
      createdAt,
      updatedAt,
    });
  }
  return out;
}

async function ensureSeeded() {
  if (!TASKS_CACHE) {
    const existing = await readJson<Task[]>(TASKS_FILE);
    if (existing) {
      TASKS_CACHE = existing;
    } else {
      TASKS_CACHE = seedTasks(0);
      await writeJson(TASKS_FILE, TASKS_CACHE);
    }
  }
}

export async function listTasks(params: TaskListParams = {}): Promise<TaskListResult> {
  await ensureSeeded();
  const {
    contactId,
    q = '',
    sortBy = 'updatedAt',
    sortOrder = 'desc',
    page = 1,
    pageSize = 50,
    completed,
  } = params;

  await new Promise((r) => setTimeout(r, 120 + Math.random() * 180));
  if (Math.random() < 0.05) throw new Error('TransientError: simulated network failure');

  const qn = normalize(q);
  const filtered = (TASKS_CACHE ?? []).filter((t) => {
    if (contactId && t.contactId !== contactId) return false;
    if (completed !== undefined && t.completed !== completed) return false;
    if (!qn) return true;
    return normalize(t.title).includes(qn) || (t.notes ? normalize(t.notes).includes(qn) : false);
  });

  const sorted = filtered.sort((a, b) => {
    const av = a[sortBy];
    const bv = b[sortBy];
    let cmp = 0;
    if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
    else cmp = String(av).localeCompare(String(bv));
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  const start = (page - 1) * pageSize;
  const data = sorted.slice(start, start + pageSize);
  const total = filtered.length;
  const hasNext = start + pageSize < total;
  return { data, total, page, pageSize, hasNext };
}

export async function createTask(input: TaskCreateInput): Promise<Task> {
  await ensureSeeded();
  try {
    await getContact(input.contactId);
  } catch {
    throw new Error('ValidationError: contact does not exist');
  }
  const title = input.title?.trim();
  if (!title) throw new Error('ValidationError: title required');
  if (title.length > 120) throw new Error('ValidationError: title too long');

  await new Promise((r) => setTimeout(r, 150 + Math.random() * 250));
  if (Math.random() < 0.12) throw new Error('TransientError: simulate mutation failure');

  const now = Date.now();
  const maxNum =
    (TASKS_CACHE ?? []).reduce((m, t) => Math.max(m, Number(t.id.slice(1)) || 0), 0) + 1;
  const id = `T${pad(maxNum)}`;
  const task: Task = {
    id,
    contactId: input.contactId,
    title,
    notes: input.notes,
    dueDate: input.dueDate,
    completed: false,
    priority: input.priority ?? 'medium',
    createdAt: now,
    updatedAt: now,
  };
  TASKS_CACHE!.push(task);
  await writeJson(TASKS_FILE, TASKS_CACHE!);
  return task;
}

export async function updateTask(id: string, updates: TaskUpdateInput): Promise<Task> {
  await ensureSeeded();
  await new Promise((r) => setTimeout(r, 150 + Math.random() * 250));
  if (Math.random() < 0.12) throw new Error('TransientError: simulate mutation failure');

  const idx = TASKS_CACHE!.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error('NotFoundError: task not found');
  const prev = TASKS_CACHE![idx];

  const next: Task = {
    ...prev,
    title: updates.title !== undefined ? updates.title.trim() || prev.title : prev.title,
    notes: updates.notes !== undefined ? updates.notes : prev.notes,
    dueDate: updates.dueDate !== undefined ? updates.dueDate : prev.dueDate,
    completed: updates.completed !== undefined ? updates.completed : prev.completed,
    priority: updates.priority !== undefined ? updates.priority : prev.priority,
    updatedAt: Date.now(),
  };

  TASKS_CACHE![idx] = next;
  await writeJson(TASKS_FILE, TASKS_CACHE!);
  return next;
}

export async function deleteTask(id: string): Promise<boolean> {
  await ensureSeeded();
  await new Promise((r) => setTimeout(r, 120 + Math.random() * 200));
  if (Math.random() < 0.12) throw new Error('TransientError: simulate mutation failure');
  const idx = TASKS_CACHE!.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error('NotFoundError: task not found');
  TASKS_CACHE!.splice(idx, 1);
  await writeJson(TASKS_FILE, TASKS_CACHE!);
  return true;
}
