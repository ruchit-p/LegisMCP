import { Search, BarChart3, Users, Clock, Shield, Zap, Code, Database, Brain, Plug, GitBranch, Globe } from 'lucide-react'

const categories = {
  integration: { name: 'Integration', color: 'text-blue-600' },
  data: { name: 'Data Access', color: 'text-green-600' },
  ai: { name: 'AI Features', color: 'text-purple-600' },
  security: { name: 'Security', color: 'text-red-600' },
  performance: { name: 'Performance', color: 'text-orange-600' }
} as const

type CategoryKey = keyof typeof categories

const features = [
  {
    name: 'Standard MCP Protocol',
    description: 'Built on the Model Context Protocol standard for seamless integration with Claude, GPT, and other AI platforms. Drop-in compatibility with existing MCP-enabled applications.',
    icon: Code,
    category: 'integration' as CategoryKey
  },
  {
    name: 'Real-Time Data Streaming',
    description: 'Access live Legislative data as it updates. Bills, voting records, committee activities, and member information synchronized in real-time from official sources.',
    icon: Database,
    category: 'data' as CategoryKey
  },
  {
    name: 'AI-Native Tool Execution', 
    description: 'Your AI models can execute complex Legislative queries, perform bill analysis, track legislative trends, and research member profiles during conversations.',
    icon: Brain,
    category: 'ai' as CategoryKey
  },
  {
    name: 'Zero-Config Integration',
    description: 'Single endpoint configuration connects your AI to Legislative intelligence. No complex API mappings, authentication flows, or data transformation required.',
    icon: Plug,
    category: 'integration' as CategoryKey
  },
  {
    name: 'Enterprise Security',
    description: 'SOC 2 compliant with Auth0 integration, role-based access control, comprehensive audit logging, and enterprise-grade security for sensitive government data.',
    icon: Shield,
    category: 'security' as CategoryKey
  },
  {
    name: 'Scalable Architecture',
    description: 'Built for enterprise workloads with automatic scaling, intelligent caching, rate limiting, and 99.9% uptime SLA for mission-critical AI applications.',
    icon: Globe,
    category: 'performance' as CategoryKey
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Enterprise-grade MCP server for Legislative data
          </h2>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Transform your AI applications with seamless access to live Legislative intelligence. 
            Built for developers, designed for enterprise, powered by the Model Context Protocol.
          </p>
        </div>
        
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3 lg:gap-y-16">
            {features.map((feature) => (
              <div key={feature.name} className="relative flex flex-col group">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-foreground">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span>{feature.name}</span>
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                        feature.category === 'integration' ? 'bg-blue-50 text-blue-700 ring-blue-700/10 dark:bg-blue-900/20 dark:text-blue-400 dark:ring-blue-800' :
                        feature.category === 'data' ? 'bg-green-50 text-green-700 ring-green-700/10 dark:bg-green-900/20 dark:text-green-400 dark:ring-green-800' :
                        feature.category === 'ai' ? 'bg-purple-50 text-purple-700 ring-purple-700/10 dark:bg-purple-900/20 dark:text-purple-400 dark:ring-purple-800' :
                        feature.category === 'security' ? 'bg-red-50 text-red-700 ring-red-700/10 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-800' :
                        'bg-orange-50 text-orange-700 ring-orange-700/10 dark:bg-orange-900/20 dark:text-orange-400 dark:ring-orange-800'
                      }`}>
                        {categories[feature.category].name}
                      </span>
                    </div>
                  </div>
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-muted-foreground">
                  <p className="flex-auto">{feature.description}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Integration examples */}
        <div className="mx-auto mt-20 max-w-4xl">
          <div className="text-center">
            <h3 className="text-2xl font-bold tracking-tight text-foreground">
              Works with your favorite AI platforms
            </h3>
            <p className="mt-4 text-lg text-muted-foreground">
              Standard MCP protocol ensures compatibility across the AI ecosystem
            </p>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {['Claude', 'ChatGPT', 'Custom Agents', 'Enterprise AI'].map((platform) => (
              <div key={platform} className="flex items-center justify-center rounded-lg bg-muted/50 p-4 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                {platform}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
} 