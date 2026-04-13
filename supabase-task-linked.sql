-- Aggiunge colonna opportunity_id alla tabella tasks
-- per collegare una task a un'opportunità di vendita (pipeline)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES project_pipeline(id) ON DELETE SET NULL;
