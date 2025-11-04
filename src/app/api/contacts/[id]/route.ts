import { NextResponse } from 'next/server';
import { getContact, deleteContact } from '@/services/contacts';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!id) return NextResponse.json({ message: 'BadRequest: missing id' }, { status: 400 });
    const c = await getContact(id);
    return NextResponse.json(c, { status: 200 });
  } catch (err) {
    const msg = (err as Error).message || 'Unknown error';
    const status = msg.startsWith('NotFoundError') ? 404 : 503;
    return NextResponse.json({ message: msg }, { status });
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!id) return NextResponse.json({ message: 'BadRequest: missing id' }, { status: 400 });
    await deleteContact(id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const msg = (err as Error).message || 'Unknown error';
    const status = msg.startsWith('NotFoundError') ? 404 : 503;
    return NextResponse.json({ message: msg }, { status });
  }
}
