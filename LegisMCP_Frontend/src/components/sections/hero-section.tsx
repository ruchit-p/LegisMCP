"use client"

import { Button } from '@/components/ui/button'
import { ArrowRight, Zap, Shield, Globe } from 'lucide-react'
import Link from 'next/link'
import { useSession, signIn } from 'next-auth/react'
import { useAnalytics } from '@/components/providers/analytics-provider'

export function HeroSection() {
  const { data: session } = useSession()
  const { logButtonClick } = useAnalytics()

  return (
    <section className="relative bg-white pt-16 pb-24 overflow-hidden">
      {/* Background subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-white to-indigo-50/20 -z-10" />
      
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          {/* Badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium">
              <Zap className="w-4 h-4 mr-2" />
              Professional MCP Server for Legislative Data
            </div>
          </div>

          {/* Main heading */}
          <div className="text-center mb-8">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Connect AI to<br />
              <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                Legislative Intelligence
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Enterprise-grade MCP server that seamlessly integrates live Legislative data into 
              your AI workflows. Enable context-aware applications with real-time access to 
              bills, voting records, and legislative insights.
            </p>
          </div>

          {/* Feature points */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 mb-10">
            <div className="flex items-center text-gray-700">
              <Shield className="w-5 h-5 mr-2 text-blue-600" />
              <span className="font-medium">AI-Native Integration</span>
            </div>
            <div className="flex items-center text-gray-700">
              <Globe className="w-5 h-5 mr-2 text-blue-600" />
              <span className="font-medium">Real-Time Data Access</span>
            </div>
            <div className="flex items-center text-gray-700">
              <Zap className="w-5 h-5 mr-2 text-blue-600" />
              <span className="font-medium">Standard MCP Protocol</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium"
              onClick={() => {
                logButtonClick('Start Free Trial', 'hero-cta-primary', 'bg-blue-600 hover:bg-blue-700', 'hero');
                if (!session) {
                  signIn('auth0');
                } else {
                  window.location.href = '/dashboard';
                }
              }}
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              className="px-8 py-3 rounded-lg font-medium border-gray-300 text-gray-700 hover:bg-gray-50"
              onClick={() => {
                logButtonClick('View Features', 'hero-cta-secondary', 'outline', 'hero');
              }}
              asChild
            >
              <Link href="#features">
                View Features
              </Link>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="text-center mb-16">
            <p className="text-gray-600 mb-6">Trusted by AI developers, government contractors, and enterprise teams</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="font-medium">99.9% Uptime</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                <span className="font-medium">SOC 2 Compliant</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                <span className="font-medium">Enterprise Ready</span>
              </div>
            </div>
          </div>

          {/* Code example */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-gray-900 rounded-lg p-6 text-left relative">
              {/* Terminal header */}
              <div className="flex items-center mb-4">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="ml-auto text-xs text-gray-400">MCP Server Configuration</div>
              </div>
              
              {/* Code content */}
              <div className="font-mono text-sm">
                <div className="text-gray-400 mb-2"># Connect to Legislative MCP Server</div>
                <div className="text-blue-400">mcp_server:</div>
                <div className="ml-4 text-yellow-300">url: <span className="text-green-300">&quot;https://mcp.example.com/mcp&quot;</span></div>
                <div className="ml-4 text-yellow-300">tools: <span className="text-white">[</span><span className="text-green-300">&quot;search&quot;</span><span className="text-white">, </span><span className="text-green-300">&quot;analysis&quot;</span><span className="text-white">, </span><span className="text-green-300">&quot;member_info&quot;</span><span className="text-white">]</span></div>
                <div className="text-gray-400 mt-2"># Your AI can now access Legislative data</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}