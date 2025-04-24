import ChatClient from '@/components/chat/Client'

export default function Home() {
  return (
    <main className="flex flex-col h-screen bg-gray-50">
      <header className="sticky top-0 z-10 p-4 bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-2xl mx-auto flex items-center justify-center">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <span>💬 Mon chatbot local</span>
            <span className="ml-1 text-xs py-0.5 px-1.5 bg-blue-100 text-blue-800 rounded-md">deepseek-r1:1.5b</span>
          </h1>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <ChatClient />
      </div>
    </main>
  )
}
