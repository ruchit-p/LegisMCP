import NextAuth from 'next-auth'
import Auth0Provider from 'next-auth/providers/auth0'
import type { NextAuthOptions } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import type { Session, User } from 'next-auth'
import type { Account } from 'next-auth'

const authOptions: NextAuthOptions = {
  providers: [
    Auth0Provider({
      clientId: process.env.AUTH0_CLIENT_ID!,
      clientSecret: process.env.AUTH0_CLIENT_SECRET!,
      issuer: process.env.AUTH0_ISSUER_BASE_URL!,
      authorization: {
        params: {
          scope: 'openid email profile offline_access read:bills read:members read:votes read:committees',
          // Add the audience parameter to get a proper access token for your API
          audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || process.env.AUTH0_AUDIENCE || 'urn:legis-api'
        }
      }
    })
  ],
  
  callbacks: {
    async jwt({ token, user, account }: { token: JWT; user?: User; account?: Account | null }) {
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.idToken = account.id_token
        token.expiresAt = account.expires_at
        
        // Debug logging (remove in production)
        console.log('JWT Callback - Account tokens:', {
          hasAccessToken: !!account.access_token,
          hasRefreshToken: !!account.refresh_token,
          expiresAt: account.expires_at,
          tokenType: account.token_type
        })
      }
      
      // Store user ID and email in token
      if (user) {
        token.auth0Id = user.id
        token.email = user.email
        token.name = user.name
        token.picture = user.image
      }
      
      // Check if token has expired and refresh if needed
      if (token.expiresAt && token.refreshToken) {
        const now = Math.floor(Date.now() / 1000)
        const expiresAt = token.expiresAt as number
        
        // Refresh token if it will expire in the next 5 minutes
        if (expiresAt - now < 300) {
          console.log('Token is expiring soon, refreshing...')
          
          try {
            const response = await fetch(`${process.env.AUTH0_ISSUER_BASE_URL}/oauth/token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: process.env.AUTH0_CLIENT_ID!,
                client_secret: process.env.AUTH0_CLIENT_SECRET!,
                refresh_token: token.refreshToken as string,
              }),
            })
            
            if (response.ok) {
              const refreshedTokens = await response.json()
              
              console.log('Token refreshed successfully')
              
              token.accessToken = refreshedTokens.access_token
              token.idToken = refreshedTokens.id_token
              token.expiresAt = Math.floor(Date.now() / 1000) + refreshedTokens.expires_in
              
              // Update refresh token if a new one was provided
              if (refreshedTokens.refresh_token) {
                token.refreshToken = refreshedTokens.refresh_token
              }
            } else {
              console.error('Failed to refresh token:', await response.text())
              // Don't throw here - let the app handle the expired token
            }
          } catch (error) {
            console.error('Error refreshing token:', error)
            // Don't throw here - let the app handle the expired token
          }
        }
      }
      
      return token
    },
    
    async session({ session, token }: { session: Session; token: JWT }) {
      // Send properties to the client, like an access_token from a provider
      session.accessToken = token.accessToken
      session.refreshToken = token.refreshToken
      session.idToken = token.idToken
      session.expiresAt = token.expiresAt
      session.user.id = token.auth0Id as string
      session.user.auth0Id = token.auth0Id as string
      
      // Debug logging (remove in production)
      console.log('Session Callback - Token availability:', {
        hasAccessToken: !!session.accessToken,
        hasRefreshToken: !!session.refreshToken,
        userEmail: session.user.email
      })
      
      return session
    }
  },
  
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  
  // Add debug logging
  debug: process.env.NODE_ENV === 'development',
  
  // Custom error pages
  pages: {
    error: '/api/auth/error', // Error code passed in query string as ?error=
  },
  
  // Removed custom pages - using NextAuth.js default sign-in page
  // pages: {
  //   signIn: '/auth/signin',
  //   error: '/auth/error',
  // },
  
  // For now, we'll use JWT strategy without custom adapter
  // Later, we can implement the custom D1 adapter properly
  // adapter: customD1Adapter,
}

export default NextAuth(authOptions)
export { authOptions }