import { Inter } from 'next/font/google'
import { Metadata } from 'next'
import './globals.css'
import { ClientProviders } from '@/components/providers/client-providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  title: 'LegislativeMCP - Legislative MCP Server Platform',
  description: 'Enterprise-grade MCP server for Legislative data access, AI integration, and Legislative intelligence.',
  keywords: ['MCP', 'Legislative', 'AI', 'Legislative Data', 'Model Context Protocol', 'Government'],
  authors: [{ name: 'Dynasty Platforms LLC' }],
  creator: 'Dynasty Platforms LLC',
  publisher: 'Dynasty Platforms LLC',
  robots: 'index, follow',
  openGraph: {
    title: 'LegislativeMCP - Legislative MCP Server Platform',
    description: 'Enterprise-grade MCP server for Legislative data access, AI integration, and Legislative intelligence.',
    url: process.env.NEXTAUTH_URL,
    siteName: 'LegislativeMCP',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LegislativeMCP - Legislative MCP Server Platform',
    description: 'Enterprise-grade MCP server for Legislative data access, AI integration, and Legislative intelligence.',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  )
} 