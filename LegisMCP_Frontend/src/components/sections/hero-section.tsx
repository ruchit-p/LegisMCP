"use client"

import { Button } from '@/components/ui/button'
import { ArrowRight, Zap, Code, Database, Brain } from 'lucide-react'
import Link from 'next/link'
import { useAuth0 } from '@/hooks/use-auth0'
import { useAnalytics } from '@/components/providers/analytics-provider'

export function HeroSection() {
  const { login } = useAuth0()
  const { logButtonClick } = useAnalytics()

  return (
    <section className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-20 pb-16 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-blue-100 opacity-20 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-purple-100 opacity-20 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Main headline */}
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Enterprise
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Legislative</span>
            <br />
            MCP Server Platform
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Unlock the power of Congressional data with our enterprise-grade MCP server. 
            Seamlessly integrate legislative intelligence into your AI applications.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8" 
              onClick={() => {
                logButtonClick('Start Free Trial', 'hero-cta-primary', 'bg-primary hover:bg-primary/90 text-primary-foreground px-8', 'hero');
                login({ screen_hint: 'signup' });
              }}
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              className="px-8"
              onClick={() => {
                logButtonClick('View Documentation', 'hero-cta-secondary', 'outline', 'hero');
              }}
              asChild
            >
              <Link href="/docs">
                View Documentation
              </Link>
            </Button>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <Zap className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Real-time Data</h3>
              <p className="text-sm text-gray-600">Live Congressional data updates as they happen</p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <Code className="h-8 w-8 text-purple-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Easy Integration</h3>
              <p className="text-sm text-gray-600">MCP protocol for seamless AI integration</p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <Database className="h-8 w-8 text-green-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Comprehensive</h3>
              <p className="text-sm text-gray-600">Bills, members, votes, and legislative history</p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <Brain className="h-8 w-8 text-orange-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">AI-Ready</h3>
              <p className="text-sm text-gray-600">Structured data perfect for LLM applications</p>
            </div>
          </div>

          {/* Social proof */}
          <div className="mt-16 text-center">
            <p className="text-sm text-gray-500 mb-4">Trusted by developers and enterprises</p>
            <div className="flex justify-center items-center space-x-8 opacity-60">
              {/* Add customer logos here when available */}
              <div className="text-xs text-gray-400">Government Agencies</div>
              <div className="text-xs text-gray-400">Legal Tech</div>
              <div className="text-xs text-gray-400">Policy Research</div>
              <div className="text-xs text-gray-400">News Organizations</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}