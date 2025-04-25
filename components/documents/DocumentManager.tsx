'use client'

import { useState } from 'react'
import FileUploader from '@/components/documents/FileUploader'
import DocumentList from '@/components/documents/DocumentList'

const DocumentManager: React.FC = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleUploadSuccess = (data: any) => {
    console.log('Document téléchargé avec succès', data)
    // Déclencher un rafraîchissement de la liste
    setRefreshTrigger(prev => prev + 1)
  }

  const handleUploadError = (error: Error) => {
    console.error('Erreur lors du téléchargement', error)
  }

  return (
    <>
      <FileUploader 
        onUploadSuccess={handleUploadSuccess}
        onUploadError={handleUploadError}
      />
      <DocumentList key={refreshTrigger} />
    </>
  )
}

export default DocumentManager
