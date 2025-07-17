'use client';

import { Button } from '@/components/ui/button';
import { useAuth0 } from '@/hooks/use-auth0';
import { LogIn, LogOut, User } from 'lucide-react';
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
 */
export function AuthButton() {
  const { isAuthenticated, isLoading, login, logout, user } = useAuth0();

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
      <Button onClick={() => login()} variant="outline">
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
            <AvatarImage src={user?.picture} alt={user?.name || 'User'} />
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
        <DropdownMenuItem onClick={() => logout()}>
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
 */
export function LoginButton({ returnTo }: { returnTo?: string }) {
  const { login, isLoading } = useAuth0();

  return (
    <Button 
      onClick={() => login(returnTo)} 
      disabled={isLoading}
      className="w-full"
    >
      <LogIn className="w-4 h-4 mr-2" />
      {isLoading ? 'Loading...' : 'Login'}
    </Button>
  );
}

// MARK: - Logout Button Component
/**
 * Simple logout button component
 */
export function LogoutButton() {
  const { logout, isLoading } = useAuth0();

  return (
    <Button 
      onClick={() => logout()} 
      disabled={isLoading}
      variant="outline"
      className="w-full"
    >
      <LogOut className="w-4 h-4 mr-2" />
      {isLoading ? 'Loading...' : 'Logout'}
    </Button>
  );
}

// MARK: - User Profile Display Component
/**
 * Component to display user profile information
 */
export function UserProfile() {
  const { user, isAuthenticated, isLoading } = useAuth0();

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
        <AvatarImage src={user.picture} alt={user.name || 'User'} />
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