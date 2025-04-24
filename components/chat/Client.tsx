'use client'

import { useChat } from 'ai/react'
import { useEffect, useRef } from 'react'
import Form from '@/components/base/Form'
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

  // Handle keydown events for the textarea
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
        className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6"
        style={{
          backgroundImage: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.05) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-lg text-center transform transition-all hover:scale-105 duration-300">
              <div className="text-5xl mb-6">👋</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Bienvenue sur le chat</h2>
              <p className="text-gray-600 mb-8 text-lg">
                Commence une conversation avec le modèle deepseek-r1:1.5b
              </p>
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <p className="font-medium text-blue-700 mb-2">Suggestions :</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="px-3 py-2 bg-white rounded-full text-sm text-gray-600 shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-200">
                    "Qu'est-ce que l'IA ?"
                  </span>
                  <span className="px-3 py-2 bg-white rounded-full text-sm text-gray-600 shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-200">
                    "Explique-moi un concept"
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl w-full mx-auto space-y-6">
            {messages.map((message, index) => (
              <div 
                key={message.id}
                className={`flex w-full mb-6 ${message.role === 'user' ? 'justify-end' : 'justify-start'} message-bubble animate-fadeIn`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`flex items-start gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-sm shadow-md
                    ${message.role === 'user' 
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
                      : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700'}`}
                  >
                    {message.role === 'user' ? '👤' : '🤖'}
                  </div>
                  
                  <div className={`${message.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className={`px-5 py-4 rounded-2xl shadow-sm max-w-full
                      ${message.role === 'user' 
                        ? 'bg-blue-100 text-blue-900 rounded-tr-none border border-blue-200' 
                        : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'}`}
                    >
                      <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
                        {message.content}
                      </div>
                    </div>
                    <div className={`text-xs mt-1.5 ${message.role === 'user' ? 'text-right' : 'text-left'} text-gray-500`}>
                      {message.role === 'user' ? 'Vous' : 'deepseek-r1:1.5b'} · {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Indicateur de chargement amélioré */}
            {isLoading && (
              <div className="flex justify-start mb-6 animate-fadeIn">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 flex items-center justify-center shadow-md">
                    🤖
                  </div>
                  
                  <div>
                    <div className="px-5 py-4 rounded-2xl shadow-sm bg-white border border-gray-100 rounded-tl-none">
                      <div className="flex items-center h-6">
                        <div className="flex space-x-2 items-center">
                          <div className="typing-dot w-2.5 h-2.5 bg-blue-500 rounded-full animate-blink"></div>
                          <div className="typing-dot w-2.5 h-2.5 bg-blue-500 rounded-full animate-blink"></div>
                          <div className="typing-dot w-2.5 h-2.5 bg-blue-500 rounded-full animate-blink"></div>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs mt-1.5 text-gray-500">
                      deepseek-r1:1.5b est en train d'écrire...
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} className="h-4" />
          </div>
        )}
        
        {error && (
          <div className="max-w-3xl w-full mx-auto p-5 bg-red-50 border border-red-200 text-red-700 rounded-xl shadow-sm animate-pulse">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <div>
                <p className="font-bold">Une erreur est survenue</p>
                <p className="text-sm opacity-90">{error.message}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Zone de saisie améliorée */}
      <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-blue-50 from-60% to-transparent pt-6">
        <div className="max-w-3xl mx-auto px-4 pb-5 md:px-8">
          <Form onSubmit={handleSubmit} className="relative">
            <div className="relative flex items-end bg-white rounded-2xl shadow-lg border border-gray-200 focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-blue-400 transition-shadow">
              <textarea
                value={input}
                onChange={handleInputChange as any}
                onKeyDown={handleKeyDown}
                placeholder="Écris ton message ici..."
                className="w-full p-4 pr-16 bg-transparent border-0 resize-none focus:ring-0 focus:outline-none min-h-[60px] max-h-[160px] text-gray-700"
                disabled={isLoading}
                rows={1}
                style={{
                  height: 'auto',
                  maxHeight: '160px',
                  overflowY: 'auto'
                }}
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                variant={input.trim() ? 'primary' : 'secondary'}
                size="sm"
                className="absolute right-3 bottom-3 p-2.5 rounded-full transition-all transform hover:scale-105 active:scale-95"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
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
              <div className="text-xs text-center mt-2.5 text-blue-600 font-medium tracking-wide">
                deepseek-r1:1.5b analyse ta demande...
              </div>
            )}
          </Form>
        </div>
      </div>
    </div>
  )
}

export default ChatClient
