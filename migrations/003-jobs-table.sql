-- Ajout d'une table pour suivre les tâches d'arrière-plan comme la régénération des embeddings

CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'running', 'completed', 'failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  result JSONB
);

CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
