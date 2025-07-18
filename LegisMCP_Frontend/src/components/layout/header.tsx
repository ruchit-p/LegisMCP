"use client"

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession, signIn, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogOut, User, Settings, CreditCard } from 'lucide-react'

const Header = () => {
  const { data: session, status } = useSession()
  const user = session?.user
  const isAuthenticated = !!session
  const isLoading = status === 'loading'

  if (isLoading) {
    return (
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Image
              src="https://pub-c7deb7ea07f743c98e0e0e4aded1d7ae.r2.dev/Legi%20USA%20Logo%20Black%20Transparent.png"
              alt="LegislativeMCP"
              width={32}
              height={32}
              className="h-8 w-auto"
            />
            <h1 className="text-xl font-bold">LegislativeMCP</h1>
          </div>
          <div className="animate-pulse">
            <div className="h-8 w-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="https://pub-c7deb7ea07f743c98e0e0e4aded1d7ae.r2.dev/Legi%20USA%20Logo%20Black%20Transparent.png"
              alt="LegislativeMCP"
              width={32}
              height={32}
              className="h-8 w-auto"
            />
            <h1 className="text-xl font-bold text-gray-900">LegislativeMCP</h1>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <Link href="#features" className="text-gray-600 hover:text-gray-900 font-medium">
            Features
          </Link>
          <Link href="#pricing" className="text-gray-600 hover:text-gray-900 font-medium">
            Pricing
          </Link>
        </nav>

        {/* Auth Section */}
        <div className="flex items-center space-x-4">
          {isAuthenticated && user ? (
            <>
              {/* Authenticated State */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.image || ''} alt={user.name || user.email} />
                      <AvatarFallback>
                        {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{user.name || 'User'}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">
                      <User className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <Settings className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/billing">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Billing
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => signOut()}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              {/* Unauthenticated State */}
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  onClick={() => signIn('auth0')}
                >
                  Sign In
                </Button>
                <Button 
                  onClick={() => signIn('auth0')}
                >
                  Get Started
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

// Export both named and default for compatibility
export { Header }
export default Header 