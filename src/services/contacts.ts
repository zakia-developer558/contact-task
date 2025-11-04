import { readJson, writeJson, CONTACTS_FILE } from './store';
import type { Task } from './tasks';

export type Contact = {
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

export type ListParams = {
  q?: string;
  sortBy?: keyof Contact;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
};

export type ListResult = {
  data: Contact[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
};

export type ContactCreateInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  city?: string;
  state?: string;
  tags?: string[];
};

// File-backed storage for contacts (cached in-memory for performance)
let CONTACTS_CACHE: Contact[] | null = null;

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pad(num: number, size = 4): string {
  let s = String(num);
  while (s.length < size) s = '0' + s;
  return s;
}

function seedContacts(count = 12000): Contact[] {
  const firstNames = [
    'Avery',
    'Jordan',
    'Taylor',
    'Casey',
    'Riley',
    'Skyler',
    'Alex',
    'Morgan',
    'Jamie',
    'Quinn',
  ];
  const lastNames = [
    'Chen',
    'Singh',
    'Garcia',
    'Patel',
    'Kim',
    'Nguyen',
    'Lopez',
    'Brown',
    'Khan',
    'Ivanov',
  ];
  const companies = [
    'Lumina Labs',
    'Vertex Systems',
    'NovaWorks',
    'BluePeak',
    'Quantica',
    'Hyperion',
    'Apexio',
    'Terranova',
    'Orchid',
    'Zennic',
  ];
  const cities = [
    'San Francisco',
    'New York',
    'Austin',
    'Seattle',
    'Chicago',
    'Toronto',
    'London',
    'Berlin',
    'Sydney',
    'Tokyo',
  ];
  const states = ['CA', 'NY', 'TX', 'WA', 'IL', 'ON', 'ENG', 'BE', 'NSW', 'TK'];
  const tagsPool = ['vip', 'lead', 'customer', 'partner', 'prospect', 'churn-risk', 'beta'];

  const now = Date.now();
  const out: Contact[] = [];
  for (let i = 1; i <= count; i++) {
    const firstName = randomChoice(firstNames);
    const lastName = randomChoice(lastNames);
    const company = randomChoice(companies);
    const city = randomChoice(cities);
    const state = states[cities.indexOf(city)] ?? randomChoice(states);
    const id = `C${pad(i, 5)}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@${company
      .toLowerCase()
      .replace(/\s+/g, '')}.com`;
    const phone = `+1-(${100 + (i % 900)})-${pad(i % 1000, 3)}-${pad((i * 7) % 10000, 4)}`;
    const createdAt = now - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 365);
    const lastActivityAt = createdAt + Math.floor(Math.random() * (now - createdAt));
    const tags = Array.from(new Set([randomChoice(tagsPool), randomChoice(tagsPool)])).slice(0, 2);
    out.push({
      id,
      firstName,
      lastName,
      email,
      phone,
      company,
      city,
      state,
      tags,
      createdAt,
      lastActivityAt,
    });
  }
  return out;
}

async function ensureSeeded() {
  if (!CONTACTS_CACHE) {
    const existing = await readJson<Contact[]>(CONTACTS_FILE);
    if (existing && existing.length) {
      CONTACTS_CACHE = existing;
    } else {
      CONTACTS_CACHE = seedContacts();
      await writeJson(CONTACTS_FILE, CONTACTS_CACHE);
    }
  }
}

function normalize(str: string): string {
  return str.toLowerCase();
}

// Core listing logic: search, sort, paginate
export async function listContacts(params: ListParams = {}): Promise<ListResult> {
  await ensureSeeded();
  const { q = '', sortBy = 'lastActivityAt', sortOrder = 'desc', page = 1, pageSize = 50 } = params;

  // Simulate network latency and occasional failures (5%)
  await new Promise((res) => setTimeout(res, 120 + Math.random() * 180));
  const roulette = Math.random();
  if (roulette < 0.05) {
    throw new Error('TransientError: simulated network failure');
  }

  const qn = normalize(q);
  const filtered = (CONTACTS_CACHE ?? []).filter((c) => {
    if (!qn) return true;
    return (
      normalize(c.firstName + ' ' + c.lastName).includes(qn) ||
      normalize(c.email).includes(qn) ||
      normalize(c.company).includes(qn) ||
      normalize(c.city).includes(qn) ||
      normalize(c.state).includes(qn) ||
      c.tags.some((t) => normalize(t).includes(qn))
    );
  });

  const sorted = filtered.sort((a, b) => {
    const av = a[sortBy];
    const bv = b[sortBy];
    let cmp = 0;
    if (typeof av === 'number' && typeof bv === 'number') {
      cmp = av - bv;
    } else {
      cmp = String(av).localeCompare(String(bv));
    }
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  const start = (page - 1) * pageSize;
  const data = sorted.slice(start, start + pageSize);
  const total = filtered.length;
  const hasNext = start + pageSize < total;
  return { data, total, page, pageSize, hasNext };
}

// Expose raw contacts for future features (tasks linkages, optimistic updates)
export function _getAllContactsUnsafe(): Contact[] {
  // For legacy callers; returns cached list. Call listContacts for async freshness.
  return CONTACTS_CACHE ?? [];
}

export async function getContact(id: string): Promise<Contact> {
  await ensureSeeded();
  await new Promise((res) => setTimeout(res, 100 + Math.random() * 200));
  if (Math.random() < 0.05) throw new Error('TransientError: simulated network failure');
  const c = (CONTACTS_CACHE ?? []).find((x) => x.id === id);
  if (!c) throw new Error('NotFoundError: contact not found');
  return c;
}

function nextContactId(contacts: Contact[]): string {
  const max = contacts.reduce((m, c) => Math.max(m, Number(c.id.slice(1)) || 0), 0) + 1;
  return `C${pad(max, 5)}`;
}

export async function createContact(input: ContactCreateInput): Promise<Contact> {
  await ensureSeeded();
  const firstName = String(input.firstName || '').trim();
  const lastName = String(input.lastName || '').trim();
  const email = String(input.email || '').trim();
  if (!firstName || !lastName || !email)
    throw new Error('ValidationError: firstName, lastName, email required');
  if ((CONTACTS_CACHE ?? []).some((c) => c.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('ValidationError: email already exists');
  }
  const now = Date.now();
  const contact: Contact = {
    id: nextContactId(CONTACTS_CACHE ?? []),
    firstName,
    lastName,
    email,
    phone: input.phone ?? '',
    company: input.company ?? '',
    city: input.city ?? '',
    state: input.state ?? '',
    tags: input.tags ?? [],
    createdAt: now,
    lastActivityAt: now,
  };
  CONTACTS_CACHE = [contact, ...(CONTACTS_CACHE ?? [])];
  await writeJson(CONTACTS_FILE, CONTACTS_CACHE);
  return contact;
}

export async function deleteContact(id: string): Promise<boolean> {
  await ensureSeeded();
  const idx = (CONTACTS_CACHE ?? []).findIndex((c) => c.id === id);
  if (idx === -1) throw new Error('NotFoundError: contact not found');
  CONTACTS_CACHE!.splice(idx, 1);
  await writeJson(CONTACTS_FILE, CONTACTS_CACHE!);
  // Cascade delete related tasks
  try {
    const { readJson, writeJson, TASKS_FILE } = await import('./store');
    const tasks = (await readJson<Task[]>(TASKS_FILE)) ?? [];
    const filtered = tasks.filter((t) => t.contactId !== id);
    await writeJson(TASKS_FILE, filtered);
  } catch {
    // Ignore if tasks store not available
  }
  return true;
}
