'use client';

import { Button } from '@/components/ui/button';
import { useSession, signIn, signOut } from 'next-auth/react';
import { LogIn, LogOut, User, UserPlus } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// MARK: - Auth Button Component
/**
 * Authentication button that shows login/logout based on auth state
 * Uses NextAuth.js for authentication
 */
export function AuthButton() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const isAuthenticated = !!session;
  const isLoading = status === 'loading';

  if (isLoading) {
    return (
      <Button variant="outline" disabled>
        <User className="w-4 h-4 mr-2" />
        Loading...
      </Button>
    );
  }

  if (!isAuthenticated) {
    return (
      <Button onClick={() => signIn('auth0')} variant="outline">
        <LogIn className="w-4 h-4 mr-2" />
        Login
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Avatar className="w-6 h-6">
            <AvatarImage src={user?.image || ''} alt={user?.name || 'User'} />
            <AvatarFallback>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline">{user?.name || 'User'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem disabled>
          <User className="w-4 h-4 mr-2" />
          <div className="flex flex-col">
            <span className="font-medium">{user?.name || 'User'}</span>
            <span className="text-sm text-muted-foreground">{user?.email}</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// MARK: - Login Button Component
/**
 * Simple login button component
 * Uses NextAuth.js signIn with Auth0 provider
 */
export function LoginButton({ returnTo }: { returnTo?: string }) {
  const { status } = useSession();
  const isLoading = status === 'loading';

  const handleLogin = () => {
    // NextAuth.js handles the redirect after login automatically
    // You can pass a callbackUrl if needed
    signIn('auth0', { 
      callbackUrl: returnTo || window.location.origin + '/dashboard' 
    });
  };

  return (
    <Button 
      onClick={handleLogin} 
      disabled={isLoading}
      className="w-full"
    >
      <LogIn className="w-4 h-4 mr-2" />
      {isLoading ? 'Loading...' : 'Login'}
    </Button>
  );
}

// MARK: - Signup Button Component
/**
 * Simple signup button component
 * Uses NextAuth.js signIn with screen_hint parameter for signup
 */
export function SignupButton({ returnTo }: { returnTo?: string }) {
  const { status } = useSession();
  const isLoading = status === 'loading';

  const handleSignup = () => {
    // Use Auth0 screen_hint parameter to show signup form
    signIn('auth0', { 
      callbackUrl: returnTo || window.location.origin + '/dashboard',
      // Note: screen_hint parameter handling depends on Auth0 provider configuration
    });
  };

  return (
    <Button 
      onClick={handleSignup} 
      disabled={isLoading}
      variant="default"
      className="w-full"
    >
      <UserPlus className="w-4 h-4 mr-2" />
      {isLoading ? 'Loading...' : 'Sign Up'}
    </Button>
  );
}

// MARK: - User Profile Display Component
/**
 * Component to display user profile information
 * Uses NextAuth.js session data
 */
export function UserProfile() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const isAuthenticated = !!session;
  const isLoading = status === 'loading';

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse" />
        <div className="w-24 h-4 bg-gray-300 rounded animate-pulse" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Avatar className="w-8 h-8">
        <AvatarImage src={user.image || ''} alt={user.name || 'User'} />
        <AvatarFallback>
          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="text-sm font-medium">{user.name || 'User'}</span>
        <span className="text-xs text-muted-foreground">{user.email}</span>
      </div>
    </div>
  );
} 