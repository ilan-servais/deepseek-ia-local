'use client'

import { useState, useEffect } from 'react'

interface Document {
  id: number
  filename: string
  created_at: string
  chunk_count: number
}

const DocumentList: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await fetch('/api/documents/list')
        
        if (!response.ok) {
          throw new Error('Erreur lors du chargement des documents')
        }
        
        const data = await response.json()
        setDocuments(data.documents)
      } catch (err) {
        setError('Impossible de charger la liste des documents')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchDocuments()
  }, [])
  
  return (
    <div className="w-full max-w-xl mx-auto p-4 bg-white rounded-xl shadow-sm border border-gray-100 mt-6">
      <h3 className="text-lg font-medium text-gray-800 mb-4">Documents chargés</h3>
      
      {isLoading ? (
        <div className="py-4 text-center text-gray-500">
          Chargement des documents...
        </div>
      ) : error ? (
        <div className="py-4 text-center text-red-500">
          {error}
        </div>
      ) : documents.length === 0 ? (
        <div className="py-4 text-center text-gray-500">
          Aucun document n'a encore été chargé
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {documents.map((doc) => (
            <div key={doc.id} className="py-3">
              <div className="flex justify-between items-center">
                <p className="font-medium text-gray-800">{doc.filename}</p>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  {doc.chunk_count} chunks
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Ajouté le {new Date(doc.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default DocumentList
