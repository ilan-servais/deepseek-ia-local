'use client'

import Form from '@/components/base/Form'
import Input from '@/components/base/Input'
import Button from '@/components/base/Button'
import { useChat } from 'ai/react'

const ChatClient: React.FC = () => {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error
  } = useChat()

  return (
    <>
      <div style={{ marginBottom: '1rem' }}>
        {messages.map((message) => (
          <div key={message.id}>
            <strong>{message.role === 'user' ? '👤' : '🤖'}: </strong>
            {message.content}
          </div>
        ))}
      </div>

      <Form onSubmit={handleSubmit}>
        <Input
          name="prompt"
          value={input}
          onChange={handleInputChange}
          placeholder="Pose une question..."
        />
        <Button type="submit" disabled={isLoading}>
          Envoyer
        </Button>
      </Form>

      {error && <p style={{ color: 'red' }}>❌ Erreur : {error.message}</p>}
    </>
  )
}

export default ChatClient
