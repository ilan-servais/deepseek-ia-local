-- Migration pour ajouter le support des métadonnées et des tags

-- Vérification de l'existence de la table documents et création si nécessaire
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  normalized_filename TEXT,
  content TEXT,
  title TEXT,
  author TEXT,
  category TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Mise à jour de la table documents pour les installations existantes
-- (ne fera rien si les colonnes existent déjà grâce au IF NOT EXISTS)
ALTER TABLE IF EXISTS documents 
  ADD COLUMN IF NOT EXISTS normalized_filename TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT, 
  ADD COLUMN IF NOT EXISTS author TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Création d'un index sur le nom de fichier normalisé pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_documents_normalized_filename ON documents(normalized_filename);

-- Mise à jour des documents existants pour ajouter la version normalisée du nom de fichier
UPDATE documents SET normalized_filename = LOWER(filename) WHERE normalized_filename IS NULL;
UPDATE documents SET title = filename WHERE title IS NULL;

-- Table des tags
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table de jointure entre documents et tags (relation many-to-many)
CREATE TABLE IF NOT EXISTS document_tags (
  document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (document_id, tag_id)
);

-- Mise à jour de la table embeddings pour ajouter le nom du modèle
ALTER TABLE IF EXISTS embeddings
  ADD COLUMN IF NOT EXISTS model_name TEXT DEFAULT 'unknown';

-- Création d'index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_document_tags_document_id ON document_tags(document_id);
CREATE INDEX IF NOT EXISTS idx_document_tags_tag_id ON document_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
