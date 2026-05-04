import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Lolabot Factory — Build Your AI Employee in 60 Seconds',
  description:
    'Pick a personality. Choose skills. Get a ready-to-install AI agent. Part of the AI Maestro ecosystem.',
  openGraph: {
    title: 'Lolabot Factory',
    description: 'Build Your AI Employee in 60 Seconds',
    siteName: 'Lolabot Factory',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen font-sans">
        <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            <a href="/" className="flex items-center gap-3">
              <span className="text-2xl">🤖</span>
              <span className="text-lg font-bold tracking-tight">
                Lolabot <span className="text-brand-400">Factory</span>
              </span>
            </a>
            <div className="flex items-center gap-6">
              <a
                href="/browse"
                className="text-sm text-slate-400 transition-colors hover:text-white"
              >
                Browse Agents
              </a>
              <a
                href="https://github.com/23blocks-OS/lolabot-factory"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-slate-400 transition-colors hover:text-white"
              >
                GitHub
              </a>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  )
}
