import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';

interface TagRow {
  tag: string;
}

interface NoteTagRow {
  id: string;
  note_id: string;
  tag: string;
}

interface NoteTagResponse {
  id: string;
  noteId: string;
  tag: string;
}

const tagCreateSchema = z.object({
  tag: z.string().min(1).max(100),
});

function toNoteTag(row: NoteTagRow): NoteTagResponse {
  return {
    id: row.id,
    noteId: row.note_id,
    tag: row.tag,
  };
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id: noteId } = await params;

    const rows = await query<TagRow>('SELECT tag FROM note_tags WHERE note_id = $1', [noteId]);

    return NextResponse.json(rows.map((row) => row.tag));
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id: noteId } = await params;
    const body: unknown = await request.json();
    const result = tagCreateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ errors: result.error.issues }, { status: 400 });
    }

    const { tag } = result.data;

    const createdTags = await query<NoteTagRow>(
      'INSERT INTO note_tags (note_id, tag) VALUES ($1, $2) RETURNING *',
      [noteId, tag],
    );

    return NextResponse.json(toNoteTag(createdTags[0]), { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}