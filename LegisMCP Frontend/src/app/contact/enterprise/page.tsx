import { EnterpriseContactForm } from '@/components/forms/enterprise-contact-form';
import { Building } from 'lucide-react';

export const metadata = {
  title: 'Enterprise Contact | LegislativeMCP',
  description: 'Contact our sales team for custom enterprise solutions',
};

export default function EnterpriseContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container max-w-4xl py-16 sm:py-24">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 dark:bg-emerald-900/20 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-6">
            <Building className="h-4 w-4" />
            Enterprise Solutions
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-4">
            Let&apos;s Build Something Great Together
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Our enterprise plan offers unlimited access, custom integrations, and dedicated support 
            for mission-critical applications. Tell us about your needs.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-background/60 backdrop-blur-sm rounded-xl p-6 border border-border">
            <h3 className="font-semibold text-lg mb-2">Unlimited Access</h3>
            <p className="text-sm text-muted-foreground">
              No rate limits or API call restrictions. Scale without worrying about usage.
            </p>
          </div>
          <div className="bg-background/60 backdrop-blur-sm rounded-xl p-6 border border-border">
            <h3 className="font-semibold text-lg mb-2">Custom Integration</h3>
            <p className="text-sm text-muted-foreground">
              Tailored solutions that fit perfectly with your existing infrastructure.
            </p>
          </div>
          <div className="bg-background/60 backdrop-blur-sm rounded-xl p-6 border border-border">
            <h3 className="font-semibold text-lg mb-2">Dedicated Support</h3>
            <p className="text-sm text-muted-foreground">
              Priority support with guaranteed response times and a dedicated account manager.
            </p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-8 border border-border shadow-lg">
          <EnterpriseContactForm />
        </div>
      </div>
    </div>
  );
}