import { UserProvider } from '@auth0/nextjs-auth0/client'
import { Inter } from 'next/font/google'
import { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { StripeProvider } from '@/components/providers/stripe-provider'
import { AnalyticsProvider } from '@/components/providers/analytics-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.AUTH0_BASE_URL || 'http://localhost:3000'),
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
    url: process.env.AUTH0_BASE_URL,
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
        <UserProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <StripeProvider>
              <AnalyticsProvider>
                <div className="min-h-screen bg-background">
                  {children}
                </div>
                <Toaster />
              </AnalyticsProvider>
            </StripeProvider>
          </ThemeProvider>
        </UserProvider>
      </body>
    </html>
  )
} 