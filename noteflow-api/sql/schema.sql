CREATE TABLE notes (

  id            UUID PRIMARY KEY,

  title         VARCHAR(255)  NOT NULL,

  type          VARCHAR(50)   NOT NULL CHECK (type IN ('note', 'checklist', 'idea')),

  content       TEXT,

  color         VARCHAR(7),

  is_archived   BOOLEAN       NOT NULL DEFAULT FALSE,

  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()

);

CREATE TABLE checklist_items (

  id            UUID PRIMARY KEY,

  note_id       UUID          NOT NULL REFERENCES notes(id) ON DELETE CASCADE,

  text          VARCHAR(255)  NOT NULL,

  is_completed  BOOLEAN       NOT NULL DEFAULT FALSE

);

CREATE TABLE note_tags (

  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  note_id       UUID          NOT NULL REFERENCES notes(id) ON DELETE CASCADE,

  tag           VARCHAR(100)  NOT NULL

);
