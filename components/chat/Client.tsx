'use client'

import { useChat } from 'ai/react'
import { useEffect, useRef } from 'react'
import Form from '@/components/base/Form'
import Input from '@/components/base/Input'
import Button from '@/components/base/Button'

const ChatClient: React.FC = () => {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error
  } = useChat()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Scroll when loading state changes
  useEffect(() => {
    if (isLoading && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [isLoading])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (input.trim()) {
        handleSubmit(new Event('submit') as any)
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-4"
        style={{
          backgroundImage: 'radial-gradient(circle at center, #f5f7fa 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-sm text-center">
              <div className="text-4xl mb-4">👋</div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Bienvenue sur le chat</h2>
              <p className="text-gray-500 mb-6">
                Commence une conversation avec le modèle deepseek-r1:1.5b
              </p>
              <div className="text-sm text-gray-400">
                Essaye "Qu'est-ce que l'intelligence artificielle ?" ou "Explique-moi un concept"
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl w-full mx-auto space-y-4">
            {messages.map((message) => (
              <div 
                key={message.id}
                className={`flex w-full mb-4 ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`flex items-start gap-2.5 max-w-[85%] ${message.role === 'user' ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm 
                    ${message.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                    {message.role === 'user' ? '👤' : '🤖'}
                  </div>
                  
                  <div>
                    <div className={`px-4 py-3 rounded-2xl shadow-sm 
                      ${message.role === 'user' 
                        ? 'bg-blue-500 text-white rounded-bl-none' 
                        : 'bg-white border border-gray-100 text-gray-800 rounded-br-none'}`}
                    >
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </div>
                    </div>
                    <div className={`text-xs mt-1 text-gray-500 ${message.role === 'user' ? 'text-left' : 'text-right'}`}>
                      {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Indicateur de chargement */}
            {isLoading && (
              <div className="flex justify-end mb-4">
                <div className="flex items-start gap-2.5">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                    🤖
                  </div>
                  
                  <div>
                    <div className="px-4 py-3 rounded-2xl shadow-sm bg-white border border-gray-100">
                      <div className="flex items-center">
                        <div className="flex space-x-1.5">
                          <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                          <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse" style={{ animationDelay: '600ms' }}></div>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs mt-1 text-right text-gray-500">
                      L'IA réfléchit...
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
        
        {error && (
          <div className="max-w-2xl w-full mx-auto p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <div>
                <p className="font-medium">Une erreur est survenue</p>
                <p className="text-sm">{error.message}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Zone de saisie */}
      <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-gray-50 to-transparent pt-4">
        <div className="max-w-2xl mx-auto px-4 pb-4 md:px-8">
          <Form onSubmit={handleSubmit} className="relative">
            <div className="relative flex items-end bg-white rounded-2xl shadow-sm border border-gray-200 focus-within:border-blue-300 focus-within:ring-1 focus-within:ring-blue-300">
              <textarea
                value={input}
                onChange={handleInputChange as any}
                onKeyDown={handleKeyDown}
                placeholder="Écris ton message ici..."
                className="w-full p-4 pr-14 bg-transparent border-0 resize-none focus:ring-0 focus:outline-none min-h-[56px] max-h-[120px] text-gray-700"
                disabled={isLoading}
                rows={1}
                style={{
                  height: 'auto',
                  maxHeight: '120px',
                  overflowY: 'auto'
                }}
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                variant={input.trim() ? 'primary' : 'secondary'}
                size="sm"
                className="absolute right-3 bottom-3 p-2 rounded-full"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                  />
                </svg>
              </Button>
            </div>
            {isLoading && (
              <p className="text-xs text-center mt-2 text-gray-500">deepseek-r1:1.5b analyse ta demande...</p>
            )}
          </Form>
        </div>
      </div>
    </div>
  )
}

export default ChatClient
