'use client'

import { useState, useRef } from 'react'
import Button from '@/components/base/Button'

interface FileUploaderProps {
  onUploadSuccess?: (data: any) => void
  onUploadError?: (error: Error) => void
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onUploadSuccess,
  onUploadError,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // État pour les métadonnées
  const [showMetadata, setShowMetadata] = useState(false)
  const [metadata, setMetadata] = useState({
    title: '',
    author: '',
    category: '',
    source_url: '',
    date: new Date().toISOString().split('T')[0] // Date du jour par défaut
  })

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0])
      setError(null)
    }
  }

  const handleFileSelectClick = () => {
    fileInputRef.current?.click()
  }

  const handleMetadataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setMetadata(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Veuillez sélectionner un fichier')
      return
    }

    const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown', 'text/x-markdown']
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Seuls les fichiers PDF, texte et Markdown sont acceptés')
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      
      // Ajout des métadonnées
      const metadataObj = {
        ...metadata,
        title: metadata.title || selectedFile.name.replace(/\.[^/.]+$/, ""), // Utiliser le nom du fichier si aucun titre n'est fourni
        author: metadata.author || 'Inconnu',
        date: metadata.date || new Date().toISOString().split('T')[0]
      }
      
      formData.append('metadata', JSON.stringify(metadataObj))

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de l\'upload')
      }

      const data = await response.json()
      
      // Réinitialiser le formulaire
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      if (onUploadSuccess) {
        onUploadSuccess(data)
      }
    } catch (err) {
      const error = err as Error
      setError(error.message || 'Une erreur est survenue')
      
      if (onUploadError) {
        onUploadError(error)
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto p-4 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-800">Ajouter un document</h3>
        <p className="text-sm text-gray-500 mt-1">
          Téléchargez un fichier PDF, texte ou Markdown pour l'ajouter à votre base de connaissances.
        </p>
      </div>

      <div 
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-4 hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={handleFileSelectClick}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          accept=".pdf,.txt,.md" 
          onChange={handleFileChange}
          className="hidden" 
        />
        
        <div className="flex flex-col items-center justify-center">
          <svg className="h-10 w-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {selectedFile ? (
            <p className="text-sm text-gray-700 font-medium">{selectedFile.name}</p>
          ) : (
            <p className="text-sm text-gray-500">
              Cliquez pour sélectionner un fichier ou glissez-déposez un fichier ici
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">PDF, TXT ou MD (max 10MB)</p>
        </div>
      </div>

      {selectedFile && (
        <div className="mb-4">
          <button 
            type="button" 
            onClick={() => setShowMetadata(!showMetadata)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            {showMetadata ? '▲ Masquer les métadonnées' : '▼ Ajouter des métadonnées (recommandé)'}
          </button>
          
          {showMetadata && (
            <div className="mt-3 space-y-3 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Titre
                  </label>
                  <input
                    type="text"
                    name="title"
                    placeholder="Titre du document"
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    value={metadata.title}
                    onChange={handleMetadataChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Auteur
                  </label>
                  <input
                    type="text"
                    name="author"
                    placeholder="Auteur du document"
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    value={metadata.author}
                    onChange={handleMetadataChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Catégorie
                  </label>
                  <select 
                    name="category"
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    value={metadata.category}
                    onChange={handleMetadataChange}
                  >
                    <option value="">Sélectionnez une catégorie</option>
                    <option value="CV">CV</option>
                    <option value="Fiche Produit">Fiche Produit</option>
                    <option value="Tutoriel">Tutoriel</option>
                    <option value="Article">Article</option>
                    <option value="Rapport">Rapport</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    value={metadata.date}
                    onChange={handleMetadataChange}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL source
                  </label>
                  <input
                    type="url"
                    name="source_url"
                    placeholder="https://..."
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    value={metadata.source_url}
                    onChange={handleMetadataChange}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          variant={selectedFile ? 'primary' : 'secondary'}
          size="md"
        >
          {uploading ? 'Traitement en cours...' : 'Télécharger'}
        </Button>
      </div>
    </div>
  )
}

export default FileUploader
