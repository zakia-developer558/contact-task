import { promises as fs } from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');

async function ensureDir() {
  await fs.mkdir(dataDir, { recursive: true });
}

export async function readJson<T>(fileName: string): Promise<T | null> {
  await ensureDir();
  const filePath = path.join(dataDir, fileName);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException;
    if (err && err.code === 'ENOENT') return null;
    throw e;
  }
}

export async function writeJson<T>(fileName: string, data: T): Promise<void> {
  await ensureDir();
  const filePath = path.join(dataDir, fileName);
  const json = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, json, 'utf-8');
}

export const CONTACTS_FILE = 'contacts.json';
export const TASKS_FILE = 'tasks.json';
