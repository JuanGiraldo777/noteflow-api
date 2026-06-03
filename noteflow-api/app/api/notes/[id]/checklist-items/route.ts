import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';

interface ChecklistItemRow {
  id: string;
  note_id: string;
  text: string;
  is_completed: boolean;
}

interface ChecklistItemResponse {
  id: string;
  text: string;
  isCompleted: boolean;
}

const checklistItemCreateSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1),
});

function toChecklistItem(item: ChecklistItemRow): ChecklistItemResponse {
  return {
    id: item.id,
    text: item.text,
    isCompleted: item.is_completed,
  };
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id: noteId } = await params;

    // PostgreSQL no tiene rowid, asi que devolvemos los items sin un orden especifico.
    const items = await query<ChecklistItemRow>(
      'SELECT id, note_id, text, is_completed FROM checklist_items WHERE note_id = $1',
      [noteId],
    );

    return NextResponse.json(items.map(toChecklistItem));
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id: noteId } = await params;
    const body: unknown = await request.json();
    const result = checklistItemCreateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ errors: result.error.issues }, { status: 400 });
    }

    const { id, text } = result.data;

    const createdItems = await query<ChecklistItemRow>(
      'INSERT INTO checklist_items (id, note_id, text) VALUES ($1, $2, $3) RETURNING *',
      [id, noteId, text],
    );

    return NextResponse.json(toChecklistItem(createdItems[0]), { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
