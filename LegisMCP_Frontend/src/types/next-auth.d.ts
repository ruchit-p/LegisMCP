import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    refreshToken?: string
    idToken?: string
    expiresAt?: number
    user: {
      id: string
      auth0Id?: string
      email: string
      name?: string
      image?: string
      stripeCustomerId?: string
    } & DefaultSession['user']
  }

  interface User {
    id: string
    auth0Id?: string
    email: string
    name?: string
    image?: string
    stripeCustomerId?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    idToken?: string
    expiresAt?: number
    auth0Id?: string
    email?: string
    name?: string
    picture?: string
    stripeCustomerId?: string
  }
}