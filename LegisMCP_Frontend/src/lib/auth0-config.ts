import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth'
import type { NextRequest } from 'next/server'

/**
 * Auth.js configuration helpers
 * These functions provide compatibility with the previous Auth0 setup
 */

export async function getSession() {
  return await getServerSession(authOptions)
}

export function getAccessToken() {
  // This will be handled through the session callback
  // Access token will be available in the session object
  return null
}

// Auth.js doesn't have direct equivalents to these, but we can create compatibility functions
export const withApiAuthRequired = (handler: (req: NextRequest) => Promise<Response>) => handler
export const withPageAuthRequired = (handler: () => React.ReactNode) => handler

// For backward compatibility, we'll export the authOptions
export { authOptions }