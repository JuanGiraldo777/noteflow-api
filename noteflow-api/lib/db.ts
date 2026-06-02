import { neon } from '@neondatabase/serverless';

// Creamos la conexión usando el connection string del .env.local
// El ! le dice a TypeScript que confiamos en que la variable existe
const sql = neon(process.env.DATABASE_URL!);

// Función genérica reutilizable para todas las queries del proyecto
// T es el tipo del resultado, params son los valores parametrizados ($1, $2...)
export async function query<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
  const result = await sql.query(text, params);
  return result as T[];
}