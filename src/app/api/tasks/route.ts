import { NextResponse } from 'next/server';
import { createTask, listTasks } from '@/services/tasks';
import type { Task } from '@/services/tasks';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get('contactId') ?? undefined;
  const q = searchParams.get('q') ?? undefined;
  const sortBy = (searchParams.get('sortBy') ?? undefined) as keyof Task | undefined;
  const sortOrder = (searchParams.get('sortOrder') ?? undefined) as 'asc' | 'desc' | undefined;
  const page = Number(searchParams.get('page') ?? 1);
  const pageSize = Number(searchParams.get('pageSize') ?? 50);
  const completedRaw = searchParams.get('completed');
  const completed = completedRaw === null ? undefined : completedRaw === 'true';

  try {
    const result = await listTasks({ contactId, q, sortBy, sortOrder, page, pageSize, completed });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { message: (err as Error).message || 'Unknown error' },
      { status: 503 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const task = await createTask(body);
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    const msg = (err as Error).message || 'Unknown error';
    const status = msg.startsWith('ValidationError')
      ? 400
      : msg.startsWith('NotFoundError')
        ? 404
        : 503;
    return NextResponse.json({ message: msg }, { status });
  }
}
