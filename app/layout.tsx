import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from 'next/link';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RAG DeepSeek Chat",
  description: "Chat with your documents using DeepSeek AI model",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body 
        className={`${geistSans.variable} ${geistMono.variable}`}
        suppressHydrationWarning={true}
      >
        <div className="min-h-screen flex flex-col">
          <nav className="bg-white border-b border-gray-100 px-4 py-2">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <Link href="/" className="text-blue-600 font-semibold text-lg">DeepSeek RAG</Link>
              <div className="flex space-x-4">
                <Link href="/" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">Chat</Link>
                <Link href="/documents" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">Documents</Link>
              </div>
            </div>
          </nav>
          <div className="flex-grow">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
