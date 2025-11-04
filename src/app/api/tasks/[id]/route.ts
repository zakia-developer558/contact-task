import { NextResponse } from 'next/server';
import { deleteTask, updateTask } from '@/services/tasks';

export const dynamic = 'force-dynamic';

export async function PATCH(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await _req.json();
    const updated = await updateTask(id, body);
    return NextResponse.json(updated, { status: 200 });
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

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await deleteTask(id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const msg = (err as Error).message || 'Unknown error';
    const status = msg.startsWith('NotFoundError') ? 404 : 503;
    return NextResponse.json({ message: msg }, { status });
  }
}
