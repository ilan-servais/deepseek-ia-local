'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [exactSearch, setExactSearch] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!searchTerm.trim()) {
      setError('Veuillez entrer un terme de recherche')
      return
    }
    
    setIsLoading(true)
    setError(null)
    setResults(null)
    
    try {
      const response = await fetch('/api/documents/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchTerm,
          exact: exactSearch
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la recherche')
      }
      
      setResults(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex flex-col min-h-screen bg-gradient-to-b from-blue-50 to-gray-50">
      <header className="sticky top-0 z-10 p-4 bg-white/90 backdrop-blur-md shadow-md border-b border-gray-100">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-2">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
            <span className="text-blue-500">🔍</span> Recherche de documents
          </h1>
          <div className="px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full text-xs font-medium shadow-sm">
            Outil de diagnostic
          </div>
        </div>
      </header>
      
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Recherche dans les documents</h2>
          <p className="text-gray-600">
            Utilisez cet outil pour tester la recherche dans vos documents et diagnostiquer les problèmes de RAG.
          </p>
        </div>
        
        <form onSubmit={handleSearch} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="mb-4">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Terme de recherche
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Entrez votre recherche..."
            />
          </div>
          
          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              id="exactSearch"
              checked={exactSearch}
              onChange={(e) => setExactSearch(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="exactSearch" className="text-sm text-gray-700">
              Recherche exacte par nom de fichier (sans utiliser les embeddings)
            </label>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Recherche en cours...' : 'Rechercher'}
            </button>
          </div>
        </form>
        
        {error && (
          <div className="p-4 mb-4 bg-red-50 border border-red-100 rounded-lg text-red-700">
            {error}
          </div>
        )}
        
        {results && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold mb-4">
              Résultats de recherche pour "{results.searchTerm}"
            </h3>
            
            {results.searchType === 'exact' ? (
              <div>
                <p className="text-sm text-gray-500 mb-4">
                  Mode de recherche: Correspondance exacte par nom de fichier
                </p>
                
                {results.results.length === 0 ? (
                  <p className="text-gray-700">Aucun document trouvé</p>
                ) : (
                  <div className="space-y-4">
                    {results.results.map((doc: any) => (
                      <div key={doc.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{doc.filename}</h4>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {doc.chunk_count} chunks
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">ID: {doc.id}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <p className="text-sm text-gray-500">
                    Mode de recherche: Sémantique par embeddings ({results.embeddingDimensions} dimensions)
                  </p>
                </div>
                
                <h4 className="text-md font-medium mb-2">Documents pertinents:</h4>
                {results.documentResults.length === 0 ? (
                  <p className="text-gray-700">Aucun document trouvé</p>
                ) : (
                  <div className="space-y-6 mb-6">
                    {results.documentResults.map((doc: any) => (
                      <div key={doc.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{doc.filename}</h4>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            Similarité: {Math.round(doc.maxSimilarity * 100)}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">ID: {doc.id} • {doc.chunks.length} chunks trouvés</p>
                        
                        <div className="mt-3 space-y-2">
                          <h5 className="text-xs font-medium text-gray-700">Extraits les plus pertinents:</h5>
                          {doc.chunks.slice(0, 3).map((chunk: any) => (
                            <div key={chunk.id} className="text-sm p-2 bg-white border border-gray-100 rounded">
                              <p className="text-xs text-gray-400 mb-1">
                                Chunk #{chunk.index} • Similarité: {Math.round(chunk.similarity * 100)}%
                              </p>
                              <p className="text-gray-800 text-sm whitespace-pre-wrap line-clamp-3">
                                {chunk.content.substring(0, 200)}...
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <details>
                  <summary className="text-sm text-gray-500 cursor-pointer mb-2">
                    Afficher les résultats bruts
                  </summary>
                  <pre className="bg-gray-50 p-3 rounded overflow-auto text-xs">
                    {JSON.stringify(results, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
