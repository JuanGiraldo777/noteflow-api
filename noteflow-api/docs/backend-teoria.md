# Diagrama Entidad-Relación

El esquema está compuesto por tres tablas principales: `notes`, `checklist_items` y `note_tags`. En conjunto representan una nota, sus elementos de checklist cuando aplica, y las etiquetas asociadas a cada nota.

## Tablas y columnas principales

### `notes`

Es la tabla central del modelo. Guarda la información principal de cada nota.

- `id`: identificador único de la nota.
- `title`: título visible de la nota.
- `type`: tipo de nota. Solo permite `note`, `checklist` o `idea`.
- `content`: contenido libre de la nota.
- `color`: color asociado a la nota en formato hexadecimal.
- `is_archived`: indica si la nota fue archivada.
- `created_at`: fecha y hora de creación.
- `updated_at`: fecha y hora de última actualización.

### `checklist_items`

Guarda los ítems que pertenecen a una nota de tipo checklist.

- `id`: identificador único del ítem.
- `note_id`: referencia a la nota a la que pertenece.
- `text`: texto del ítem del checklist.
- `is_completed`: indica si el ítem fue marcado como completado.

### `note_tags`

Almacena las etiquetas asociadas a una nota.

- `id`: identificador único de la etiqueta registrada.
- `note_id`: referencia a la nota a la que pertenece.
- `tag`: nombre de la etiqueta.

## Relaciones entre tablas

### `checklist_items.note_id` -> `notes.id`

Cada ítem de checklist pertenece a una sola nota. La tabla `checklist_items` depende de `notes` porque no tiene sentido que exista un ítem sin la nota que lo agrupa.

### `note_tags.note_id` -> `notes.id`

Cada registro de `note_tags` representa una etiqueta asociada a una nota concreta. Esta relación permite que una nota tenga varias etiquetas, sin duplicar la información principal de la nota.

### Por qué estas relaciones existen

La tabla `notes` funciona como entidad padre y concentra la información base. Las otras dos tablas separan datos repetitivos o dependientes de la nota para mantener el modelo normalizado:

- una nota puede tener muchos ítems de checklist;
- una nota puede tener muchas etiquetas;
- tanto checklist items como tags no deben existir aislados.

## Por qué se usa UUID en lugar de INTEGER autoincremental

Se usa `UUID` para que los identificadores sean globalmente únicos y no dependan de un contador secuencial de la base de datos. Esto aporta varias ventajas prácticas:

- evita colisiones en escenarios distribuidos o con sincronización entre servicios;
- permite generar IDs antes de insertar el registro;
- dificulta adivinar o enumerar registros por orden secuencial;
- reduce la dependencia de una secuencia centralizada.

En un backend como este, donde las entidades pueden crearse desde distintos puntos de la aplicación, el UUID ofrece más flexibilidad que un entero autoincremental.

## Qué hace `ON DELETE CASCADE` en la práctica

La cláusula `ON DELETE CASCADE` indica que, si se elimina una nota en `notes`, la base de datos eliminará automáticamente todos los registros relacionados en `checklist_items` y `note_tags`.

En términos prácticos, esto significa:

- no quedan registros huérfanos apuntando a una nota que ya no existe;
- la limpieza de datos ocurre automáticamente a nivel de base de datos;
- la aplicación no necesita borrar manualmente primero los hijos y luego el padre;
- se evita inconsistencias entre una nota eliminada y sus elementos asociados.

Este comportamiento es especialmente útil porque `checklist_items` y `note_tags` dependen completamente de la existencia de `notes`.
