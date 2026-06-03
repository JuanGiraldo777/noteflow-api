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

export async function GET() {
  try {
    // A diferencia de GET /api/notes (activas), aqui filtramos solo is_archived = TRUE.
    const notes = await query<NoteRow>(
      'SELECT id, title, type, content, color, is_archived, created_at, updated_at FROM notes WHERE is_archived = TRUE ORDER BY created_at DESC',
    );

    return NextResponse.json(notes.map(toCamelCaseNote));
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
