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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0])
      setError(null)
    }
  }

  const handleFileSelectClick = () => {
    fileInputRef.current?.click()
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
      
      // Simplification: ne plus ajouter de métadonnées

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
