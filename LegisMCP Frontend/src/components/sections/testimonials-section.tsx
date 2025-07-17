const testimonials = [
  {
    content: "Integrating the Legislative MCP server into our AI workflows was seamless. Our models now have instant access to legislative data and can provide context-aware policy analysis in real-time.",
    author: {
      name: "Dr. Sarah Chen",
      role: "AI Research Director",
      company: "PolicyTech Solutions"
    }
  },
  {
    content: "The MCP protocol integration is incredibly powerful. We've built AI agents that can research bills, analyze voting patterns, and track legislative trends - all through natural language queries.",
    author: {
      name: "Marcus Rodriguez",
      role: "Senior ML Engineer", 
      company: "GovIntel AI"
    }
  },
  {
    content: "Our legal AI platform needed real-time Legislative data. The MCP server made it possible to enhance our models with legislative intelligence without complex API integrations.",
    author: {
      name: "Jennifer Kim",
      role: "CTO",
      company: "LegalMind Technologies"
    }
  }
]

export function TestimonialsSection() {
  return (
    <section className="py-24 sm:py-32 bg-muted/30">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Trusted by AI innovators
          </h2>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            See how teams are using our MCP server to build intelligent, context-aware applications 
            with Legislative data integration.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="flex flex-col bg-background rounded-2xl p-8 shadow-sm ring-1 ring-border hover:shadow-md transition-shadow">
              <blockquote className="flex-1">
                <p className="text-lg leading-7 text-foreground">
                  "{testimonial.content}"
                </p>
              </blockquote>
              <div className="mt-6 flex items-center gap-x-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center ring-2 ring-border">
                  <span className="text-sm font-semibold text-primary">
                    {testimonial.author.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-foreground">{testimonial.author.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {testimonial.author.role}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">
                    {testimonial.author.company}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
} 