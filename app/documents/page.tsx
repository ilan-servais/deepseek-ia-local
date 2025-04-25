import DocumentManager from '@/components/documents/DocumentManager'

export default function DocumentsPage() {
  return (
    <main className="flex flex-col min-h-screen bg-gradient-to-b from-blue-50 to-gray-50">
      <header className="sticky top-0 z-10 p-4 bg-white/90 backdrop-blur-md shadow-md border-b border-gray-100">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-2">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
            <span className="text-blue-500">📄</span> Documents
          </h1>
          <div className="px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full text-xs font-medium shadow-sm">
            Base de connaissances
          </div>
        </div>
      </header>
      
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Base de connaissances</h2>
          <p className="text-gray-600">
            Téléchargez vos documents pour les rendre accessibles à votre assistant IA.
            Les documents sont traités, découpés en parties plus petites et convertis en embeddings.
          </p>
        </div>
        
        <DocumentManager />
      </div>
    </main>
  )
}
