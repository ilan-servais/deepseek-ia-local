-- Migration pour ajouter des métadonnées enrichies et améliorer les documents

-- Enrichir la table documents avec les nouveaux champs de métadonnées
ALTER TABLE IF EXISTS documents 
  ADD COLUMN IF NOT EXISTS title TEXT;
  
ALTER TABLE IF EXISTS documents
  ADD COLUMN IF NOT EXISTS author TEXT;
  
ALTER TABLE IF EXISTS documents
  ADD COLUMN IF NOT EXISTS date DATE;
  
ALTER TABLE IF EXISTS documents
  ADD COLUMN IF NOT EXISTS category TEXT;
  
ALTER TABLE IF EXISTS documents
  ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Mettre à jour les documents existants avec des valeurs par défaut si nécessaire
UPDATE documents SET 
  title = filename WHERE title IS NULL;
  
UPDATE documents SET
  author = 'Inconnu' WHERE author IS NULL;
  
UPDATE documents SET
  date = CURRENT_DATE WHERE date IS NULL;
  
UPDATE documents SET
  category = 'Non catégorisé' WHERE category IS NULL;

-- Créer un index pour faciliter les recherches par date/catégorie/auteur
CREATE INDEX IF NOT EXISTS idx_documents_date ON documents(date);

CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);

CREATE INDEX IF NOT EXISTS idx_documents_author ON documents(author);
