import ChatInterface from '@/components/chat/ChatInterface'

export const metadata = {
  title: 'Chat avec Jade - IA locale',
  description: 'Interface de chat avec une IA locale basée sur Ollama',
}

export default function ChatPage() {
  return (
    <main className="flex flex-col h-screen bg-gray-50">
      <header className="p-4 bg-white shadow-sm">
        <h1 className="text-xl font-semibold text-center">💬 Chat avec Jade</h1>
      </header>
      <ChatInterface />
    </main>
  )
}
