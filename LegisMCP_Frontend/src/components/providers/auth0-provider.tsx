'use client'

import React from 'react';
import { Auth0Provider as Auth0ReactProvider } from '@auth0/auth0-react';
import { auth0Config } from '@/lib/auth0';

// MARK: - Auth0 Provider Component
interface Auth0ProviderProps {
  children: React.ReactNode;
}

/**
 * Auth0 Provider with Universal Login
 * This replaces NextAuth.js with Auth0's native SDK
 */
export function Auth0Provider({ children }: Auth0ProviderProps) {
  return (
    <Auth0ReactProvider
      domain={auth0Config.domain}
      clientId={auth0Config.clientId}
      authorizationParams={auth0Config.authorizationParams}
      useRefreshTokens={auth0Config.useRefreshTokens}
      cacheLocation={auth0Config.cacheLocation}
      onRedirectCallback={(appState) => {
        // Handle redirect after login
        console.log('Auth0 redirect callback:', appState);
        
        // Redirect to intended page or dashboard
        const returnTo = appState?.returnTo || '/dashboard';
        window.location.replace(returnTo);
      }}
    >
      {children}
    </Auth0ReactProvider>
  );
} 