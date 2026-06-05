# Seguridad de la API

Este documento resume los riesgos de seguridad más importantes en una API como `noteflow-api` y explica cómo están mitigados en el proyecto.

## 1. SQL Injection

La SQL Injection ocurre cuando una aplicación mezcla datos del usuario dentro de una consulta SQL como texto plano. Si el valor no se separa de la consulta, el atacante puede alterar la sentencia original y ejecutar instrucciones no deseadas.

### Ejemplo de ataque con concatenación de strings

Supón una búsqueda construida así:

```ts
const title = requestUrl.searchParams.get("title");
const sql = `SELECT * FROM notes WHERE title = '${title}'`;
```

Si el atacante envía este valor:

```txt
' OR '1'='1' --
```

la consulta final queda así:

```sql
SELECT * FROM notes WHERE title = '' OR '1'='1' --'
```

El comentario `--` anula el resto de la sentencia y la condición `'1'='1'` siempre es verdadera, así que la base de datos podría devolver más datos de los previstos.

### Por qué es peligroso

Una SQL Injection puede permitir:

- leer datos que no deberían ser accesibles;
- modificar o borrar registros;
- saltarse filtros o validaciones;
- comprometer la integridad de toda la base de datos.

En una API de notas, esto podría exponer contenido privado, etiquetas, checklist items o incluso permitir borrados masivos.

### Cómo la parametrización con $1, $2 la previene

La defensa correcta consiste en separar la estructura SQL de los datos. En PostgreSQL, eso se hace con consultas parametrizadas:

```ts
const sql = "SELECT * FROM notes WHERE title = $1";
const params = [title];
```

Aquí la base de datos entiende que `$1` es un valor, no parte del código SQL. Aunque `title` contenga comillas, operadores o texto malicioso, el driver lo envía como dato y no como instrucciones.

### Código vulnerable vs código seguro

```ts
// Vulnerable
const sql = `SELECT * FROM notes WHERE id = '${id}'`;
const result = await query(sql);
```

```ts
// Seguro
const sql = "SELECT * FROM notes WHERE id = $1";
const result = await query(sql, [id]);
```

En este proyecto, la función `query` de `lib/db.ts` se usa junto con parámetros como `$1`, `$2`, por ejemplo en `app/api/notes/[id]/route.ts` y en `app/api/checklist-items/[itemId]/route.ts`.

## 2. Variables de entorno

### Qué son y para qué sirven

Las variables de entorno son valores de configuración que la aplicación lee desde fuera del código fuente. Sirven para guardar datos que cambian según el entorno de ejecución, como desarrollo, pruebas o producción.

En este proyecto, la más importante es `DATABASE_URL`, que contiene la cadena de conexión a Neon.

### Por qué `DATABASE_URL` nunca debe aparecer en el código

La URL de conexión puede incluir usuario, contraseña, host y otros datos sensibles. Si se escribe directamente en el código:

- cualquier persona con acceso al repositorio la verá;
- puede quedar expuesta en capturas, logs o historiales de Git;
- se vuelve más difícil rotarla si hay una fuga.

Por eso debe vivir en `.env.local` y no en archivos `.ts` o `.js`.

### Qué pasaría si `.env.local` se sube a GitHub por error

Si ese archivo se publica por accidente:

- la base de datos podría quedar expuesta;
- un tercero podría conectarse y leer o modificar información;
- tendrías que cambiar la contraseña o regenerar la conexión cuanto antes;
- aunque luego borres el archivo, podría seguir accesible en el historial del repositorio.

Por eso un error así debe tratarse como una fuga de credenciales.

### Cómo verificar que está protegido

En este repositorio, `.gitignore` ya incluye la regla `.env*`, lo que evita subir `.env.local` y otros archivos de entorno.

Puedes comprobarlo así:

```bash
git check-ignore -v .env.local
```

Si el archivo está correctamente ignorado, Git mostrará la regla que lo cubre. También conviene revisar que `.env.local` no aparezca en `git status`.

## 3. Exposición de errores internos

### Por qué nunca se devuelve el error real de la base de datos

Los errores internos de la base de datos pueden incluir detalles sensibles como nombres de tablas, estructura de columnas, consultas SQL, restricciones o información del motor. No se deben devolver al cliente porque facilitan ataques y revelan información interna del sistema.

### Qué información podría filtrar un error expuesto

Un mensaje de error detallado podría mostrar:

- nombres reales de tablas y columnas;
- sentencias SQL completas;
- claves foráneas o restricciones de integridad;
- pistas sobre la estructura interna de la API;
- datos del proveedor o del entorno de despliegue.

Eso ayuda a un atacante a afinar pruebas y a explotar vulnerabilidades.

### Cómo se maneja en este proyecto

En los handlers de la API se usa `try/catch`. Si algo falla, la respuesta al cliente devuelve un mensaje genérico como `Error interno` en lugar del error técnico real.

Por ejemplo:

```ts
try {
  // lógica de base de datos
} catch {
  return NextResponse.json({ error: "Error interno" }, { status: 500 });
}
```

Este enfoque mantiene la información sensible fuera de la respuesta HTTP y permite registrar o depurar el problema por otros medios sin exponerlo públicamente.

## 4. Validación de entrada con Zod

### Por qué validar antes de tocar la base de datos

La validación previa evita que datos incorrectos lleguen a la base de datos. Así se detectan errores antes de ejecutar la query y se mantiene la coherencia de los datos.

Sin validación, podrías guardar:

- tipos incorrectos, por ejemplo un número donde esperas un texto;
- campos vacíos o incompletos;
- propiedades inesperadas que la API no reconoce;
- valores que rompen restricciones de la base de datos.

### Qué ocurre si no se valida

Si no hay validación:

- la base de datos puede rechazar la operación con un error;
- el frontend puede recibir respuestas inconsistentes;
- pueden aparecer datos corruptos o incompletos;
- la aplicación queda más difícil de mantener y depurar.

### Cómo Zod lo resuelve en este proyecto

Zod define un esquema de entrada y verifica el body antes de hacer cualquier inserción o actualización. Si el payload no cumple el formato esperado, la API responde con `400` y no toca la base de datos.

Ejemplo en la creación de notas:

```ts
const noteCreateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  type: z.enum(["note", "checklist", "idea"]),
  content: z.string().optional(),
  color: z.string().optional(),
});

const result = noteCreateSchema.safeParse(body);

if (!result.success) {
  return NextResponse.json({ errors: result.error.issues }, { status: 400 });
}
```

El mismo patrón se usa para checklist items y tags. Esto asegura que solo entren a la base de datos valores que ya pasaron una validación mínima y explícita.

## Resumen práctico

En `noteflow-api` la seguridad se apoya en cuatro ideas simples:

- consultas parametrizadas para evitar SQL Injection;
- variables de entorno para no exponer credenciales;
- mensajes genéricos para no filtrar detalles internos;
- Zod para validar la entrada antes de persistirla.

Este conjunto no elimina todos los riesgos posibles, pero sí cubre los puntos básicos que debe dominar una API bien construida en un contexto académico y profesional.
