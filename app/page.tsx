import ChatClient from '@/components/chat/Client'

export default function Home() {
  return (
    <main className="flex flex-col h-screen bg-gradient-to-b from-blue-50 to-gray-50">
      <header className="sticky top-0 z-10 p-4 bg-white/90 backdrop-blur-md shadow-md border-b border-gray-100">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-2">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
            <span className="text-blue-500">💬</span> Mon chatbot local
          </h1>
          <div className="px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full text-xs font-medium shadow-sm">
            deepseek-r1:1.5b
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <ChatClient />
      </div>
    </main>
  )
}
