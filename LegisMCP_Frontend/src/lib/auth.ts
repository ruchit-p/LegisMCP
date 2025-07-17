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
          scope: 'openid email profile offline_access read:bills read:members read:votes read:committees'
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
      }
      
      // Store user ID and email in token
      if (user) {
        token.auth0Id = user.id
        token.email = user.email
        token.name = user.name
        token.picture = user.image
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
      
      return session
    }
  },
  
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
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