import { type Message } from 'ai'
import { FC } from 'react'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  message: Message
}

const MessageBubble: FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user'

  return (
    <div 
      className={cn(
        "flex w-full mb-4",
        isUser ? "justify-start" : "justify-end"
      )}
    >
      <div 
        className={cn(
          "px-4 py-3 rounded-2xl max-w-[80%] break-words",
          isUser 
            ? "bg-blue-100 text-gray-800 rounded-bl-none" 
            : "bg-gray-200 text-gray-800 rounded-br-none"
        )}
      >
        <div className="flex items-center mb-1">
          <div className="font-medium">
            {isUser ? '👤 Vous' : '🤖 Jade'}
          </div>
        </div>
        <div className="whitespace-pre-wrap text-sm">{message.content}</div>
      </div>
    </div>
  )
}

export default MessageBubble
