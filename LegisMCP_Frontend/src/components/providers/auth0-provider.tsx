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
  // If Auth0 configuration is invalid, render children without Auth0 provider
  if (!auth0Config) {
    console.warn('Auth0 configuration is invalid. Authentication will be disabled.');
    return <>{children}</>;
  }

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
        
        // Check for stored return URL
        const storedReturnTo = localStorage.getItem('auth_return_to');
        if (storedReturnTo) {
          localStorage.removeItem('auth_return_to');
          window.location.replace(storedReturnTo);
          return;
        }
        
        // Default redirect to dashboard or intended page
        const returnTo = appState?.returnTo || '/dashboard';
        window.location.replace(returnTo);
      }}
    >
      {children}
    </Auth0ReactProvider>
  );
} 