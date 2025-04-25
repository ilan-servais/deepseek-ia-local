'use client'

import { useState } from 'react'
import Button from '@/components/base/Button'

const DocumentUploader: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [status, setStatus] = useState<'idle' | 'checking' | 'initializing' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  
  // Vérifier la connexion à la base de données
  const checkDatabaseConnection = async () => {
    setStatus('checking')
    setMessage('Vérification de la connexion à la base de données...')
    
    try {
      const response = await fetch('/api/database/check-connection')
      const data = await response.json()
      
      if (data.success) {
        setStatus('success')
        setMessage('Connexion à la base de données réussie ! Vous pouvez maintenant initialiser les tables.')
      } else {
        setStatus('error')
        setMessage(`Erreur de connexion : ${data.error}`)
      }
    } catch (error) {
      setStatus('error')
      setMessage('Impossible de vérifier la connexion à la base de données')
    }
  }

  // Initialiser la base de données
  const initializeDatabase = async () => {
    setStatus('initializing')
    setMessage('Initialisation des tables dans la base de données...')
    
    try {
      const response = await fetch('/api/database/setup')
      const data = await response.json()
      
      if (data.success) {
        setStatus('success')
        setMessage('Base de données initialisée avec succès ! Vous pouvez maintenant uploader des documents.')
      } else {
        setStatus('error')
        setMessage(`Erreur lors de l'initialisation : ${data.error}`)
      }
    } catch (error) {
      setStatus('error')
      setMessage('Impossible d\'initialiser la base de données')
    }
  }
  
  return (
    <div className="flex flex-col items-center mt-8">
      <Button 
        onClick={() => setIsModalOpen(true)}
        variant="primary"
      >
        Configurer la Base de Données
      </Button>
      
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration de la Base de Données</h3>
            
            <p className="text-sm text-gray-500 mb-4">
              Suivez ces étapes pour configurer correctement votre base de données:
            </p>
            
            <ol className="list-decimal list-inside space-y-3 text-sm text-gray-700 mb-4">
              <li>Assurez-vous que votre conteneur Docker est démarré</li>
              <li>Vérifiez la connexion à la base de données</li>
              <li>Initialisez les tables nécessaires</li>
            </ol>
            
            <div className="p-4 bg-gray-50 rounded-lg mb-4">
              <p className="text-xs font-mono mb-2 text-gray-600">Paramètres de connexion à PostgreSQL:</p>
              <pre className="text-xs bg-gray-800 text-gray-200 p-2 rounded overflow-auto">
                <code>{`POSTGRES_USER: postgres
POSTGRES_PASSWORD: postgres
POSTGRES_DB: postgres`}</code>
              </pre>
            </div>
            
            {(status === 'checking' || status === 'initializing') && (
              <div className="flex items-center justify-center p-4">
                <div className="w-6 h-6 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
                <span className="ml-3 text-sm text-gray-600">{message}</span>
              </div>
            )}
            
            {status === 'success' && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative mb-4">
                {message}
              </div>
            )}
            
            {status === 'error' && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4">
                {message}
                <p className="text-xs mt-2">Conseil: Vérifiez les paramètres dans .env.local et assurez-vous qu'ils correspondent à votre Docker.</p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <Button
                onClick={() => setIsModalOpen(false)}
                variant="outline"
                size="sm"
              >
                Fermer
              </Button>
              <Button
                onClick={checkDatabaseConnection}
                variant="secondary"
                size="sm"
                disabled={status === 'checking' || status === 'initializing'}
              >
                Vérifier la connexion
              </Button>
              <Button
                onClick={initializeDatabase}
                variant="primary"
                size="sm"
                disabled={status === 'checking' || status === 'initializing'}
              >
                Initialiser les tables
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DocumentUploader
