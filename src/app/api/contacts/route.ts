import { NextResponse } from 'next/server';
import { listContacts, createContact } from '@/services/contacts';
import type { Contact } from '@/services/contacts';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? undefined;
  const sortBy = (searchParams.get('sortBy') ?? undefined) as keyof Contact | undefined;
  const sortOrder = (searchParams.get('sortOrder') ?? undefined) as 'asc' | 'desc' | undefined;
  const page = Number(searchParams.get('page') ?? 1);
  const pageSize = Number(searchParams.get('pageSize') ?? 50);

  try {
    const result = await listContacts({ q, sortBy, sortOrder, page, pageSize });
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
    const contact = await createContact(body);
    return NextResponse.json(contact, { status: 201 });
  } catch (err) {
    const msg = (err as Error).message || 'Unknown error';
    const status = msg.startsWith('ValidationError') ? 400 : 503;
    return NextResponse.json({ message: msg }, { status });
  }
}
