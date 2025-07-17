'use client'

import { ThemeProvider } from '@/components/providers/theme-provider'
import { StripeProvider } from '@/components/providers/stripe-provider'
import { AnalyticsProvider } from '@/components/providers/analytics-provider'
import { Auth0Provider } from '@/components/providers/auth0-provider'
import { SmartRedirect } from '@/components/auth/SmartRedirect'
import { Toaster } from '@/components/ui/toaster'

interface ClientProvidersProps {
  children: React.ReactNode
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <Auth0Provider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <StripeProvider>
          <AnalyticsProvider>
            <SmartRedirect>
              {children}
            </SmartRedirect>
            <Toaster />
          </AnalyticsProvider>
        </StripeProvider>
      </ThemeProvider>
    </Auth0Provider>
  )
} 