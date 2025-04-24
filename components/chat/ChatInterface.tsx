'use client'

import { useChat } from 'ai/react'
import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
import LoadingIndicator from './LoadingIndicator'
import { scrollToBottom } from '@/lib/utils'

const ChatInterface = () => {
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
    scrollToBottom(chatContainerRef.current)
  }, [messages])

  return (
    <div className="flex flex-col h-full">
      {/* Messages container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-500">
            <p className="text-center">
              Commence une conversation avec Jade 👋
              <br />
              <span className="text-sm">Jade est une IA locale basée sur DeepSeek</span>
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}

        {isLoading && <LoadingIndicator />}
        {error && (
          <div className="p-3 bg-red-100 text-red-800 rounded-lg">
            Erreur: {error.message}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 bg-white border-t">
        <ChatInput
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}

export default ChatInterface
