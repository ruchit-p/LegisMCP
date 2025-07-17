'use client';

import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestAuthPage() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const isLoading = status === 'loading';
  const error = null;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Auth0 Testing Page</h1>
      
      <div className="grid gap-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
            <CardDescription>Current authentication state</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && <p>Loading...</p>}
            {error && <p className="text-red-500">Error: {error.message}</p>}
            {user ? (
              <div>
                <p className="text-green-500 mb-2">✅ Authenticated</p>
                <pre className="bg-gray-100 p-4 rounded overflow-auto">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </div>
            ) : (
              <p className="text-yellow-500">Not authenticated</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Authentication Actions</CardTitle>
            <CardDescription>Test different authentication flows</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Login Options</h3>
              <div className="space-x-2">
                <Button asChild variant="default">
                  <a href="/api/auth/login">Standard Login</a>
                </Button>
                <Button asChild variant="secondary">
                  <a href="/api/auth/login?screen_hint=signup">Login with Signup Hint</a>
                </Button>
                <Button asChild variant="outline">
                  <a href="/api/auth/signup">Direct Signup</a>
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Connection Types</h3>
              <div className="space-x-2">
                <Button asChild variant="default" size="sm">
                  <a href="/api/auth/login?connection=Username-Password-Authentication">
                    Email/Password Login
                  </a>
                </Button>
                <Button asChild variant="secondary" size="sm">
                  <a href="/api/auth/login?connection=google-oauth2">
                    Google Login
                  </a>
                </Button>
              </div>
            </div>

            {user && (
              <div>
                <h3 className="font-semibold mb-2">Logout</h3>
                <Button asChild variant="destructive">
                  <a href="/api/auth/logout">Logout</a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Direct Auth0 URLs</CardTitle>
            <CardDescription>Test direct Auth0 Universal Login</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="link" className="justify-start">
              <a 
                href={`https://your-tenant.us.auth0.com/authorize?response_type=code&client_id=eUovWUOrn6gy4vIXHsxuFEOsoogZcVXJ&redirect_uri=${encodeURIComponent('http://localhost:3000/api/auth/callback')}&scope=openid%20profile%20email&audience=urn:legis-api&screen_hint=signup`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Direct Signup URL
              </a>
            </Button>
            <Button asChild variant="link" className="justify-start">
              <a 
                href={`https://your-tenant.us.auth0.com/authorize?response_type=code&client_id=eUovWUOrn6gy4vIXHsxuFEOsoogZcVXJ&redirect_uri=${encodeURIComponent('http://localhost:3000/api/auth/callback')}&scope=openid%20profile%20email&audience=urn:legis-api`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Direct Login URL
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}