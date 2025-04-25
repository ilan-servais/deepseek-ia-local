'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function RegenerateEmbeddingsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const regenerateEmbeddings = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/regenerate-embeddings')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Une erreur est survenue')
      }
      
      setResults(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }
  
  const runDiagnostic = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/diagnostics')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Une erreur est survenue')
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
            <span className="text-blue-500">🔄</span> Maintenance
          </h1>
          <div className="flex space-x-2">
            <Link href="/" className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-medium">
              Chat
            </Link>
            <Link href="/documents" className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-medium">
              Documents
            </Link>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Maintenance du système</h2>
          <p className="text-gray-600 mb-4">
            Cette page vous permet de regenerer les embeddings pour les documents existants ou de diagnostiquer les problèmes.
          </p>
          
          <div className="flex flex-wrap gap-4 mb-8">
            <button
              onClick={regenerateEmbeddings}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'En cours...' : 'Régénérer les embeddings manquants'}
            </button>
            
            <button
              onClick={runDiagnostic}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              {isLoading ? 'En cours...' : 'Exécuter un diagnostic'}
            </button>
          </div>
          
          {error && (
            <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <h3 className="font-semibold mb-1">Erreur:</h3>
              <p>{error}</p>
            </div>
          )}
          
          {results && (
            <div className="p-4 bg-white shadow-md rounded-lg border border-gray-200">
              <h3 className="font-semibold mb-2">Résultats:</h3>
              <pre className="bg-gray-50 p-3 rounded overflow-x-auto text-sm">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
