-- Obtiene todas las notas activas con sus items y tags en una sola consulta.
-- LEFT JOIN porque una nota puede no tener items ni tags y debe aparecer igualmente.
SELECT
  -- Todos los campos de la nota
  n.id,
  n.title,
  n.type,
  n.content,
  n.color,
  n.is_archived,
  n.created_at,
  n.updated_at,

  -- Agrupa los items del checklist como array JSON.
  -- FILTER (WHERE ci.id IS NOT NULL) evita incluir un null cuando no hay items.
  json_agg(
    json_build_object(
      'id', ci.id,
      'text', ci.text,
      'isCompleted', ci.is_completed
    )
  ) FILTER (WHERE ci.id IS NOT NULL) AS items,

  -- Agrupa los tags como array JSON simple de strings.
  json_agg(nt.tag) FILTER (WHERE nt.id IS NOT NULL) AS tags

FROM notes n

-- LEFT JOIN con items: si no tiene items, la nota aparece con items = null
LEFT JOIN checklist_items ci ON n.id = ci.note_id

-- LEFT JOIN con tags: si no tiene tags, la nota aparece con tags = null
LEFT JOIN note_tags nt ON n.id = nt.note_id

-- WHERE filtra solo notas activas
WHERE n.is_archived = FALSE

-- GROUP BY obligatorio cuando usas json_agg: agrupa todas las filas de la misma nota
GROUP BY n.id

ORDER BY n.created_at DESC;