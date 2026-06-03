import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';

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

const notePatchSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  color: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

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

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    const notes = await query<NoteRow>('SELECT * FROM notes WHERE id = $1', [id]);

    if (notes.length === 0) {
      return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 });
    }

    return NextResponse.json(toCamelCaseNote(notes[0]));
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body: unknown = await request.json();
    const result = notePatchSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ errors: result.error.issues }, { status: 400 });
    }

    const { title, content, color, tags } = result.data;

    // COALESCE toma el primer valor no nulo: si un campo no viene, conserva el valor actual en DB.
    const updatedNotes = await query<NoteRow>(
      'UPDATE notes SET title = COALESCE($1, title), content = COALESCE($2, content), color = COALESCE($3, color), updated_at = NOW() WHERE id = $4 RETURNING *',
      [title ?? null, content ?? null, color ?? null, id],
    );

    if (updatedNotes.length === 0) {
      return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 });
    }

    if (tags !== undefined) {
      // Reemplazar todos los tags en bloque es mas simple que sincronizar altas/bajas individuales.
      // Primero limpiamos los tags previos y luego insertamos la lista nueva completa.
      await query('DELETE FROM note_tags WHERE note_id = $1', [id]);

      for (const tag of tags) {
        await query('INSERT INTO note_tags (note_id, tag) VALUES ($1, $2)', [id, tag]);
      }
    }

    return NextResponse.json(toCamelCaseNote(updatedNotes[0]));
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const deletedNotes = await query<NoteRow>('DELETE FROM notes WHERE id = $1 RETURNING id', [id]);

    if (deletedNotes.length === 0) {
      return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 });
    }

    // ON DELETE CASCADE elimina automaticamente checklist_items y note_tags relacionados.
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
