# noteflow-api

API de notas construida con Next.js App Router y PostgreSQL en Neon. Expone endpoints para crear, editar, archivar y eliminar notas, además de manejar checklist items y tags asociados.
Está pensada para integrarse con clientes que generan los IDs en el frontend y consumen respuestas en JSON.

## Stack tecnológico

- Next.js 15 con App Router
- React 19
- TypeScript
- PostgreSQL en Neon
- `@neondatabase/serverless` para acceso a base de datos
- Zod para validación de payloads
- ESLint para linting

## Prerrequisitos

- Node.js 20 o superior
- npm
- Una cuenta de Neon con una base de datos PostgreSQL creada
- El archivo `schema.sql` ejecutado en la base de datos de Neon

## Setup paso a paso

1. Clona el repositorio.

   ```bash
   git clone <URL_DEL_REPOSITORIO> 
   cd noteflow-api/noteflow-api
````

   > El proyecto vive en la carpeta interior `noteflow-api/noteflow-api`.

2. Entra a la carpeta de la app.

   ```bash
   cd noteflow-api
````

La aplicación vive dentro de esta carpeta anidada.

3. Instala las dependencias.

   ```bash
   npm install
   ```

4. Crea el archivo `.env.local` en la raíz de la carpeta de la app.

   ```bash
   DATABASE_URL=postgresql://usuario:password@host:puerto/base_de_datos?sslmode=require
   ```

5. Ejecuta el esquema en Neon.
   - Abre Neon.
   - Selecciona tu base de datos.
   - Pega y ejecuta el contenido de `sql/schema.sql`.
   - Verifica que existan las tablas `notes`, `checklist_items` y `note_tags`.

6. Levanta el servidor de desarrollo.

   ```bash
   npm run dev
   ```

7. Abre la API en:

   ```bash
   http://localhost:3000
   ```

## Variables de entorno necesarias

### `DATABASE_URL`

- Descripción: cadena de conexión a la base de datos PostgreSQL de Neon.
- Uso: la lee `lib/db.ts` para crear la conexión con la base de datos.
- Requerida: sí.
- Formato esperado: una URL válida de PostgreSQL compatible con Neon.

No hay otras variables de entorno obligatorias para ejecutar la API.

## Endpoints de la API

Las respuestas exitosas están en JSON, salvo los casos `204 No Content`.
Los errores de validación devuelven `400`, los recursos inexistentes devuelven `404` cuando aplica y los fallos no controlados devuelven `500`.

### Notas activas y archivadas

| Método | Ruta                  | Body esperado                                                                                                                                                                                                                       | Respuesta exitosa                                                                                                                                                | Códigos de error posibles |
| ------ | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| GET    | `/api/notes`          | No aplica                                                                                                                                                                                                                           | `200 OK` con un arreglo de notas activas. Cada nota incluye `id`, `title`, `type`, `content`, `color`, `isArchived`, `createdAt`, `updatedAt`, `items` y `tags`. | `500`                     |
| GET    | `/api/notes/archived` | No aplica                                                                                                                                                                                                                           | `200 OK` con un arreglo de notas archivadas con la misma forma de respuesta que `/api/notes`.                                                                    | `500`                     |
| POST   | `/api/notes`          | `{ id, title, type, content?, color? }`<br>`id`: UUID generado por el cliente.<br>`title`: string obligatorio.<br>`type`: `note`, `checklist` o `idea`.<br>`content`: string opcional.<br>`color`: string opcional.                 | `201 Created` con la nota creada en formato JSON. `isArchived` siempre se crea en `false`.                                                                       | `400`, `500`              |
| GET    | `/api/notes/:id`      | No aplica                                                                                                                                                                                                                           | `200 OK` con la nota encontrada en formato JSON.                                                                                                                 | `404`, `500`              |
| PATCH  | `/api/notes/:id`      | `{ title?, content?, color?, tags? }`<br>`title`: string opcional.<br>`content`: string opcional.<br>`color`: string opcional.<br>`tags`: arreglo de strings opcional; si se envía, reemplaza todos los tags existentes de la nota. | `200 OK` con la nota actualizada.                                                                                                                                | `400`, `404`, `500`       |
| DELETE | `/api/notes/:id`      | No aplica                                                                                                                                                                                                                           | `204 No Content`. La eliminación hace cascade sobre checklist items y tags asociados.                                                                            | `404`, `500`              |

### Archivado de notas

| Método | Ruta                     | Body esperado | Respuesta exitosa                                                                                                              | Códigos de error posibles |
| ------ | ------------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| PATCH  | `/api/notes/:id/archive` | No aplica     | `200 OK` con la nota luego de alternar `isArchived`. Si estaba activa, pasa a archivada; si estaba archivada, vuelve a activa. | `404`, `500`              |

### Checklist items

| Método | Ruta                             | Body esperado                                                                        | Respuesta exitosa                                                                                      | Códigos de error posibles |
| ------ | -------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------- |
| GET    | `/api/notes/:id/checklist-items` | No aplica                                                                            | `200 OK` con un arreglo de checklist items de la nota. Cada item incluye `id`, `text` e `isCompleted`. | `500`                     |
| POST   | `/api/notes/:id/checklist-items` | `{ id, text }`<br>`id`: UUID generado por el cliente.<br>`text`: string obligatorio. | `201 Created` con el checklist item creado.                                                            | `400`, `500`              |
| PATCH  | `/api/checklist-items/:itemId`   | No aplica                                                                            | `200 OK` con el item actualizado. La operación alterna `isCompleted`.                                  | `404`, `500`              |
| DELETE | `/api/checklist-items/:itemId`   | No aplica                                                                            | `204 No Content`.                                                                                      | `500`                     |

### Tags

| Método | Ruta                  | Body esperado                                                     | Respuesta exitosa                                                       | Códigos de error posibles |
| ------ | --------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------- |
| GET    | `/api/notes/:id/tags` | No aplica                                                         | `200 OK` con un arreglo de strings, uno por tag asociado a la nota.     | `500`                     |
| POST   | `/api/notes/:id/tags` | `{ tag }`<br>`tag`: string obligatorio, entre 1 y 100 caracteres. | `201 Created` con el tag registrado, incluyendo `id`, `noteId` y `tag`. | `400`, `500`              |

## Estructura de carpetas explicada

```text
noteflow-api/
├── app/
│   ├── api/
│   │   ├── notes/
│   │   │   ├── route.ts
│   │   │   ├── archived/route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       ├── archive/route.ts
│   │   │       ├── checklist-items/route.ts
│   │   │       └── tags/route.ts
│   │   └── checklist-items/
│   │       └── [itemId]/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── docs/
│   ├── backend-teoria.md
│   └── seguridad-api.md
├── lib/
│   └── db.ts
├── public/
├── sql/
│   └── schema.sql
├── package.json
├── next.config.ts
└── tsconfig.json
```

- `app/api/`: contiene toda la lógica de los endpoints REST.
- `lib/db.ts`: encapsula la conexión a Neon y expone la función `query`.
- `sql/schema.sql`: define el esquema de la base de datos y debe ejecutarse en Neon antes de usar la API.
- `docs/`: documentación de apoyo sobre el backend y la seguridad.
- `app/`: incluye la estructura base de Next.js y la UI mínima de entrada.

## Despliegue en Vercel

1. Sube el repositorio a GitHub, GitLab o Bitbucket.
2. Importa el proyecto desde Vercel.
3. Configura la variable de entorno `DATABASE_URL` en el panel de Vercel.
4. Asegúrate de que la base de datos de Neon tenga aplicado `sql/schema.sql`.
5. Deja el comando de build por defecto de Next.js, que en este proyecto es `npm run build`.
6. Despliega el proyecto.

### Recomendaciones para producción

- Usa la cadena de conexión de Neon adecuada para entornos serverless.
- Verifica que el proyecto tenga acceso a la base de datos antes de publicar.
- Si cambias el esquema, vuelve a ejecutar el SQL correspondiente en Neon antes de lanzar una nueva versión.
