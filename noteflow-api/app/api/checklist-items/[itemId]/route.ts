import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface ChecklistItemRow {
  id: string;
  note_id: string;
  text: string;
  is_completed: boolean;
}

interface ChecklistItemResponse {
  id: string;
  noteId: string;
  text: string;
  isCompleted: boolean;
}

function toChecklistItem(item: ChecklistItemRow): ChecklistItemResponse {
  return {
    id: item.id,
    noteId: item.note_id,
    text: item.text,
    isCompleted: item.is_completed,
  };
}

interface RouteContext {
  params: Promise<{ itemId: string }>;
}

export async function PATCH(_: Request, { params }: RouteContext) {
  try {
    const { itemId } = await params;

    // NOT is_completed invierte el estado en una sola operacion atomica, en vez de confiar en un valor enviado por el cliente.
    const updatedItems = await query<ChecklistItemRow>(
      'UPDATE checklist_items SET is_completed = NOT is_completed WHERE id = $1 RETURNING *',
      [itemId],
    );

    if (updatedItems.length === 0) {
      return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 });
    }

    return NextResponse.json(toChecklistItem(updatedItems[0]));
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { itemId } = await params;

    await query('DELETE FROM checklist_items WHERE id = $1', [itemId]);

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
