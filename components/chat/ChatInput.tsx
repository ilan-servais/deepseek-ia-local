import React, { FormEvent, KeyboardEvent } from 'react'

interface ChatInputProps {
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void
  isLoading: boolean
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  input, 
  handleInputChange, 
  handleSubmit, 
  isLoading 
}) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Adjust height of textarea based on content
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200 // Maximum height
      )}px`
    }
  }, [input])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (input.trim()) {
        const form = e.currentTarget.form
        if (form) form.requestSubmit()
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative flex items-end">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Écris ton message ici... (Entrée pour envoyer, Shift+Entrée pour nouvelle ligne)"
        className="flex-1 p-3 pr-12 bg-white border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[48px] max-h-[200px]"
        disabled={isLoading}
        rows={1}
      />
      <button
        type="submit"
        disabled={isLoading || !input.trim()}
        className="absolute right-2 bottom-2 p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
      </button>
    </form>
  )
}

export default ChatInput
