"use client"

import React, { useState } from 'react'
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
import { LogOut, User, Settings, CreditCard, Menu, X } from 'lucide-react'

const Header = () => {
  const { data: session, status } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const user = session?.user
  const isAuthenticated = !!session
  const isLoading = status === 'loading'

  if (isLoading) {
    return (
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Image
              src="https://pub-c7deb7ea07f743c98e0e0e4aded1d7ae.r2.dev/Legi%20USA%20Logo%20Black%20Transparent.png"
              alt="LegislativeMCP"
              width={32}
              height={32}
              className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0"
            />
            <h1 className="text-sm sm:text-xl font-bold truncate">LegislativeMCP</h1>
          </div>
          <div className="animate-pulse">
            <div className="h-8 w-16 sm:w-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4 h-16 flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
          <Link href="/" className="flex items-center space-x-1 sm:space-x-2 min-w-0">
            <Image
              src="https://pub-c7deb7ea07f743c98e0e0e4aded1d7ae.r2.dev/Legi%20USA%20Logo%20Black%20Transparent.png"
              alt="LegislativeMCP"
              width={32}
              height={32}
              className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0"
            />
            <h1 className="text-sm sm:text-lg lg:text-xl font-bold text-gray-900 truncate">
              LegislativeMCP
            </h1>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-8 mx-8">
          <Link href="#features" className="text-gray-600 hover:text-gray-900 font-medium whitespace-nowrap">
            Features
          </Link>
          <Link href="#pricing" className="text-gray-600 hover:text-gray-900 font-medium whitespace-nowrap">
            Pricing
          </Link>
        </nav>

        {/* Auth Section */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {isAuthenticated && user ? (
            <>
              {/* Mobile Menu Button for authenticated users */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden p-2"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>

              {/* Desktop Dropdown for authenticated users */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.image || ''} alt={user.name || user.email} />
                      <AvatarFallback className="text-xs">
                        {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium text-sm">{user.name || 'User'}</p>
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
              {/* Mobile Menu Button for unauthenticated users */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden p-2"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>

              {/* Desktop Auth Buttons */}
              <div className="hidden md:flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => signIn('auth0')}
                  className="whitespace-nowrap"
                >
                  Sign In
                </Button>
                <Button 
                  size="sm"
                  onClick={() => signIn('auth0')}
                  className="whitespace-nowrap"
                >
                  Get Started
                </Button>
              </div>

              {/* Mobile Auth Button - Single CTA */}
              <div className="md:hidden">
                <Button 
                  size="sm"
                  onClick={() => signIn('auth0')}
                  className="text-xs px-3 py-2"
                >
                  Sign In
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t bg-white shadow-lg">
          <div className="container mx-auto px-4 py-4 space-y-4">
            {/* Navigation Links */}
            <div className="space-y-3">
              <Link 
                href="#features" 
                className="block text-gray-600 hover:text-gray-900 font-medium py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link 
                href="#pricing" 
                className="block text-gray-600 hover:text-gray-900 font-medium py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Pricing
              </Link>
            </div>

            {/* Mobile Auth Actions */}
            {!isAuthenticated && (
              <div className="pt-4 border-t space-y-3">
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    signIn('auth0')
                    setIsMobileMenuOpen(false)
                  }}
                  className="w-full justify-start"
                >
                  Sign In
                </Button>
                <Button 
                  onClick={() => {
                    signIn('auth0')
                    setIsMobileMenuOpen(false)
                  }}
                  className="w-full"
                >
                  Get Started
                </Button>
              </div>
            )}

            {/* Mobile Authenticated Menu */}
            {isAuthenticated && user && (
              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image || ''} alt={user.name || user.email} />
                    <AvatarFallback className="text-xs">
                      {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <p className="font-medium text-sm">{user.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                
                <Link 
                  href="/dashboard"
                  className="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-900"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <User className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                
                <Link 
                  href="/profile"
                  className="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-900"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  <span>Profile</span>
                </Link>
                
                <Link 
                  href="/billing"
                  className="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-900"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Billing</span>
                </Link>
                
                <button 
                  onClick={() => {
                    signOut()
                    setIsMobileMenuOpen(false)
                  }}
                  className="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-900 w-full text-left"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

// Export both named and default for compatibility
export { Header }
export default Header 