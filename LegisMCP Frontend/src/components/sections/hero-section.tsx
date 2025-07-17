"use client"

import { Button } from '@/components/ui/button'
import { ArrowRight, Search, BarChart3, Zap, Code, Database, Brain } from 'lucide-react'
import Link from 'next/link'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/20 py-24 sm:py-32">
      <div className="container relative">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 opacity-30">
            <div className="h-[800px] w-[800px] rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 blur-3xl" />
          </div>
        </div>

        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center rounded-full bg-muted px-4 py-2 text-sm font-medium ring-1 ring-border">
            <Zap className="mr-2 h-4 w-4 text-primary" />
            Professional MCP Server for Legislative Data
          </div>

          {/* Main heading */}
          <h1 className="mt-8 text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Connect AI to
            <span className="block text-primary">Legislative Intelligence</span>
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl max-w-3xl mx-auto">
            Enterprise-grade MCP server that seamlessly integrates live Legislative data into your AI workflows. 
            Enable context-aware applications with real-time access to bills, voting records, and legislative insights.
          </p>

          {/* Key benefits */}
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm">
            <div className="flex items-center bg-background/50 rounded-full px-4 py-2 ring-1 ring-border">
              <Brain className="mr-2 h-4 w-4 text-primary" />
              <span className="font-medium">AI-Native Integration</span>
            </div>
            <div className="flex items-center bg-background/50 rounded-full px-4 py-2 ring-1 ring-border">
              <Database className="mr-2 h-4 w-4 text-primary" />
              <span className="font-medium">Real-Time Data Access</span>
            </div>
            <div className="flex items-center bg-background/50 rounded-full px-4 py-2 ring-1 ring-border">
              <Code className="mr-2 h-4 w-4 text-primary" />
              <span className="font-medium">Standard MCP Protocol</span>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8" asChild>
              <a href="/api/auth/signup">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button variant="outline" size="lg" className="px-8" asChild>
              <Link href="#features">
                View Features
              </Link>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              Trusted by AI developers, government contractors, and enterprise teams
            </p>
            <div className="mt-6 flex justify-center items-center space-x-8">
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>99.9% Uptime</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span>SOC 2 Compliant</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-purple-500" />
                <span>Enterprise Ready</span>
              </div>
            </div>
          </div>
        </div>

        {/* Code example preview */}
        <div className="mx-auto mt-16 max-w-5xl">
          <div className="relative rounded-xl bg-muted/50 p-2 ring-1 ring-inset ring-border">
            <div className="overflow-hidden rounded-lg bg-background shadow-2xl">
              <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <div className="ml-auto text-xs text-muted-foreground font-mono">
                  MCP Server Configuration
                </div>
              </div>
              <div className="bg-slate-950 text-slate-50 p-6 font-mono text-sm overflow-x-auto">
                <div className="space-y-2">
                  <div className="text-slate-400"># Connect to Legislative MCP Server</div>
                  <div className="text-green-400">
                    <span className="text-blue-400">mcp_server:</span>
                  </div>
                  <div className="ml-4 text-green-400">
                    <span className="text-blue-400">url:</span> <span className="text-yellow-400">"https://api.example.com/mcp"</span>
                  </div>
                  <div className="ml-4 text-green-400">
                    <span className="text-blue-400">tools:</span> <span className="text-yellow-400">["search", "analysis", "member_info"]</span>
                  </div>
                  <div className="mt-4 text-slate-400"># Your AI can now access Legislative data</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}