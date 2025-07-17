import { Button } from '@/components/ui/button'
import { ArrowRight, MessageSquare, Code } from 'lucide-react'

export function CTASection() {
  return (
    <section className="py-24 sm:py-32 bg-gradient-to-r from-primary/10 via-background to-secondary/10">
      <div className="container">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Transform your AI with Legislative intelligence
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Join the next generation of AI developers building context-aware applications. 
            Our MCP server makes Legislative data accessible to any AI platform in minutes, not months.
          </p>
          
          {/* Key benefits */}
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="flex flex-col items-center p-6 bg-background/50 rounded-xl ring-1 ring-border">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Code className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">Standard MCP</h3>
              <p className="mt-2 text-sm text-muted-foreground text-center">
                Built on industry-standard Model Context Protocol
              </p>
            </div>
            <div className="flex flex-col items-center p-6 bg-background/50 rounded-xl ring-1 ring-border">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">Real-Time Data</h3>
              <p className="mt-2 text-sm text-muted-foreground text-center">
                Live Legislative data synchronized as it updates
              </p>
            </div>
            <div className="flex flex-col items-center p-6 bg-background/50 rounded-xl ring-1 ring-border">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <ArrowRight className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">Zero Setup</h3>
              <p className="mt-2 text-sm text-muted-foreground text-center">
                Single endpoint configuration, no complex integrations
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg" asChild>
              <a href="/api/auth/login?screen_hint=signup">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <Button variant="outline" size="lg" className="px-8 py-4 text-lg" asChild>
              <a href="mailto:sales@example.com">
                Contact Sales
              </a>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>14-day free trial</span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-border" />
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span>No credit card required</span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-border" />
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-purple-500" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
} 