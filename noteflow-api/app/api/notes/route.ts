import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';

// Define el contrato de entrada para crear una nota y validar antes de tocar la base.
const noteCreateSchema = z.object({
  // El cliente genera el UUID con Crypto.randomUUID() antes de llamar a la API.
  id: z.string().uuid(),
  // title es obligatorio y debe tener al menos 1 carácter.
  title: z.string().min(1),
  // type solo acepta los valores que la aplicación y la base de datos conocen.
  type: z.enum(['note', 'checklist', 'idea']),
  // content es opcional porque una nota puede crearse vacía.
  content: z.string().optional(),
  // color es opcional porque solo las ideas lo usan.
  color: z.string().optional(),
  // isArchived no se acepta en creación: toda nota nueva nace activa (FALSE hardcodeado en SQL).
});

// Representa una fila devuelta directamente desde la tabla notes en snake_case.
interface NoteRow {
  id: string;
  title: string;
  type: 'note' | 'checklist' | 'idea';
  content: string | null;
  color: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  items: unknown;  // viene como string JSON o array según el driver
  tags: unknown;   // viene como string JSON o array según el driver
}
// Convierte una fila SQL (snake_case) al formato que espera la app móvil (camelCase).
// Centralizar esta conversión aquí evita olvidar campos al devolver datos.
function toNote(row: NoteRow) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    content: row.content,
    color: row.color,
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Parseamos items: puede venir como string JSON, array, o null
    items: row.items
      ? (typeof row.items === 'string' ? JSON.parse(row.items) : row.items)
      : [],
    // Parseamos tags: igual que items
    tags: row.tags
      ? (typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags)
      : [],
  };
}

// Maneja GET /api/notes — devuelve solo las notas activas ordenadas por fecha de creación.
export async function GET() {
  try {
    const notes = await query<NoteRow>(
      `SELECT
        n.id, n.title, n.type, n.content, n.color, n.is_archived, n.created_at, n.updated_at,
        json_agg(
          json_build_object('id', ci.id, 'text', ci.text, 'isCompleted', ci.is_completed)
        ) FILTER (WHERE ci.id IS NOT NULL) AS items,
        json_agg(nt.tag) FILTER (WHERE nt.id IS NOT NULL) AS tags
      FROM notes n
      LEFT JOIN checklist_items ci ON n.id = ci.note_id
      LEFT JOIN note_tags nt ON n.id = nt.note_id
      WHERE n.is_archived = FALSE
      GROUP BY n.id
      ORDER BY n.created_at DESC`
    );

    // Reutilizamos toNote para la conversión, sin duplicar lógica
    return NextResponse.json(notes.map(toNote));
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// Maneja POST /api/notes — crea una nota nueva con validación previa.
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    // Validamos el payload antes de ejecutar cualquier SQL.
    const result = noteCreateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ errors: result.error.issues }, { status: 400 });
    }

    const { id, title, type, content, color } = result.data;

    // is_archived va hardcodeado como FALSE: una nota nueva nunca está archivada.
    // El cliente no puede controlar este campo en la creación.
    const createdNotes = await query<NoteRow>(
      'INSERT INTO notes (id, title, type, content, color, is_archived) VALUES ($1, $2, $3, $4, $5, FALSE) RETURNING *',
      [id, title, type, content ?? null, color ?? null],
    );

    // RETURNING * devuelve exactamente una fila, la nota recién creada.
    const createdNote = createdNotes[0];

    // Convertimos a camelCase antes de devolver al cliente.
    return NextResponse.json(toNote(createdNote), { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}