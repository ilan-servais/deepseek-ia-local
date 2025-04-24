import ChatClient from '@/components/chat/Client'

export default function Home() {
  return (
    <main style={{ padding: '1rem' }}>
      <h1>💬 Mon chatbot local</h1>
      <ChatClient />
    </main>
  )
}
