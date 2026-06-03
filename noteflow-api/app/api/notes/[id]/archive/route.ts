import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface NoteRow {
  id: string;
  title: string;
  type: 'note' | 'checklist' | 'idea';
  content: string | null;
  color: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

interface NoteResponse {
  id: string;
  title: string;
  type: 'note' | 'checklist' | 'idea';
  content: string | null;
  color: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

function toCamelCaseNote(note: NoteRow): NoteResponse {
  return {
    id: note.id,
    title: note.title,
    type: note.type,
    content: note.content,
    color: note.color,
    isArchived: note.is_archived,
    createdAt: note.created_at,
    updatedAt: note.updated_at,
  };
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    // NOT is_archived invierte el booleano en un solo UPDATE atomico, evitando leer y escribir en dos pasos.
    const updatedNotes = await query<NoteRow>(
      'UPDATE notes SET is_archived = NOT is_archived, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id],
    );

    if (updatedNotes.length === 0) {
      return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 });
    }

    return NextResponse.json(toCamelCaseNote(updatedNotes[0]), { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
