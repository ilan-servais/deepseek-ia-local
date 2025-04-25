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
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
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

  // Adjust textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (input.trim()) {
        handleSubmit(new Event('submit') as any)
      }
    }
  }

  // Ces exemples de questions ont maintenant des clés uniques
  const exampleQuestions = [
    { id: 1, text: "Qu'est-ce que le deep learning ?" },
    { id: 2, text: "Explique-moi la programmation fonctionnelle" },
    { id: 3, text: "Comment améliorer mes compétences en Next.js ?" }
  ]

  return (
    <div className="flex flex-col h-full bg-white">
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-5 md:px-12 lg:px-24"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-md w-full py-8 px-4">
              <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">Comment puis-je vous aider ?</h2>
              <div className="grid gap-3">
                {exampleQuestions.map(question => (
                  <div 
                    key={`question-${question.id}`} 
                    className="p-4 bg-gray-50 hover:bg-gray-100 transition-colors rounded-lg border border-gray-200 cursor-pointer"
                  >
                    <p className="font-medium text-gray-800">{question.text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 text-center text-sm text-gray-500">
                <p>Modèle actuel : deepseek-r1:1.5b</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6 pb-20">
            {messages.map((message, index) => (
              <div 
                key={`message-${message.id || index}`}
                className={`message-bubble ${message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div 
                  className={`px-4 py-3 max-w-[75%] rounded-2xl shadow-sm
                    ${message.role === 'user' 
                      ? 'bg-[#DCF2FF] text-gray-800' 
                      : 'bg-[#F4F4F5] text-gray-900'
                    }`}
                >
                  <div className="whitespace-pre-wrap text-sm">
                    {message.content}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Indicateur de chargement */}
            {isLoading && (
              <div className="message-bubble flex justify-start">
                <div className="px-4 py-3 bg-[#F4F4F5] rounded-2xl shadow-sm">
                  <div className="flex items-center space-x-2">
                    <div className="typing-dot w-2 h-2 bg-gray-400 rounded-full"></div>
                    <div className="typing-dot w-2 h-2 bg-gray-400 rounded-full"></div>
                    <div className="typing-dot w-2 h-2 bg-gray-400 rounded-full"></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} className="h-1" />
          </div>
        )}
        
        {error && (
          <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 w-full max-w-md p-4 bg-red-50 border border-red-100 text-red-700 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <p className="font-medium text-sm">{error.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Zone de saisie façon ChatGPT */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-3 md:px-8">
          <Form onSubmit={handleSubmit} className="relative">
            <div className="relative flex items-end rounded-lg border border-gray-300 bg-white focus-within:border-gray-400 focus-within:ring-0 shadow-sm">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange as any}
                onKeyDown={handleKeyDown}
                placeholder="Écris ton message ici..."
                className="w-full p-3 pr-14 max-h-32 bg-transparent border-0 resize-none focus:ring-0 focus:outline-none text-gray-700 overflow-y-auto"
                disabled={isLoading}
                rows={1}
                style={{ minHeight: '48px' }}
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                variant="ghost"
                className={`absolute right-2 bottom-1.5 p-1 rounded-md transition-opacity ${!input.trim() ? 'opacity-40' : 'opacity-100'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-5 w-5 text-gray-500">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </Button>
            </div>
            <div className="text-[10px] text-center mt-2 text-gray-500">
              {isLoading ? 'deepseek-r1:1.5b réfléchit...' : 'deepseek-r1:1.5b répond à vos questions'}
            </div>
          </Form>
        </div>
      </div>
    </div>
  )
}

export default ChatClient
