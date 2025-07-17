import { Brain, FileSearch, BarChart3, MessageSquare, Shield, Zap } from 'lucide-react'

const useCases = [
  {
    title: 'AI-Powered Research Assistants',
    description: 'Build intelligent research tools that can instantly access bill text, voting records, and legislative history. Perfect for academic researchers, journalists, and policy analysts.',
    icon: Brain,
    features: ['Natural language queries', 'Bill analysis and summaries', 'Historical trend analysis', 'Real-time updates'],
    example: 'Ask: "What climate bills were introduced in the last 6 months?" and get instant, comprehensive results.'
  },
  {
    title: 'Legal & Compliance AI',
    description: 'Enhance legal AI platforms with live Legislative data for regulatory compliance, legal research, and policy impact analysis.',
    icon: FileSearch,
    features: ['Regulatory change tracking', 'Impact analysis', 'Compliance monitoring', 'Legal precedent research'],
    example: 'Automatically track regulatory changes affecting your industry and assess their legal implications.'
  },
  {
    title: 'Government Affairs Chatbots',
    description: 'Deploy conversational AI that can answer questions about legislation, member positions, and committee activities in real-time.',
    icon: MessageSquare,
    features: ['Member profile lookup', 'Vote tracking', 'Committee information', 'Bill status updates'],
    example: 'Citizens can ask "How did my representative vote on healthcare bills?" and get accurate, current information.'
  },
  {
    title: 'Analytics & Insights Platforms',
    description: 'Power business intelligence tools with Legislative data to track policy trends, predict regulatory changes, and inform strategic decisions.',
    icon: BarChart3,
    features: ['Trend analysis', 'Predictive modeling', 'Risk assessment', 'Strategic planning'],
    example: 'Identify emerging policy trends that could impact your business sector before they become law.'
  },
  {
    title: 'Enterprise Government Relations',
    description: 'Integrate Legislative intelligence into enterprise workflows for government relations teams and public affairs professionals.',
    icon: Shield,
    features: ['Stakeholder mapping', 'Issue tracking', 'Advocacy campaigns', 'Relationship management'],
    example: 'Monitor all legislation related to your industry and track key stakeholders in real-time.'
  },
  {
    title: 'Educational AI Systems',
    description: 'Create educational platforms that teach civics, government, and political science with access to live Legislative data.',
    icon: Zap,
    features: ['Interactive learning', 'Civics education', 'Case studies', 'Real-world examples'],
    example: 'Students can explore how bills become laws using actual, current Legislative proceedings.'
  }
]

export function UseCasesSection() {
  return (
    <section className="py-24 sm:py-32 bg-muted/20">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Endless possibilities with Legislative intelligence
          </h2>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Our MCP server unlocks Legislative data for any AI application. Here are just a few ways 
            teams are building the future of government technology.
          </p>
        </div>
        
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-2 xl:grid-cols-3">
          {useCases.map((useCase, index) => (
            <div key={index} className="flex flex-col bg-background rounded-2xl p-8 shadow-sm ring-1 ring-border hover:shadow-md transition-shadow">
              <div className="flex items-center gap-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <useCase.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">{useCase.title}</h3>
              </div>
              
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                {useCase.description}
              </p>
              
              <ul className="mt-6 space-y-2">
                {useCase.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center text-sm text-muted-foreground">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mr-3" />
                    {feature}
                  </li>
                ))}
              </ul>
              
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground italic">
                  <span className="font-medium text-foreground">Example: </span>
                  {useCase.example}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {/* Call to action */}
        <div className="mx-auto mt-16 max-w-2xl text-center">
          <p className="text-lg text-muted-foreground">
            Ready to build your Legislative AI application?
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a 
              href="/api/auth/login?screen_hint=signup" 
              className="inline-flex items-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
              Start Building Today
            </a>
            <a 
              href="mailto:sales@example.com" 
              className="inline-flex items-center rounded-md border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground shadow-sm hover:bg-muted transition-colors"
            >
              Discuss Your Use Case
            </a>
          </div>
        </div>
      </div>
    </section>
  )
} 