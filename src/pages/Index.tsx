import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { MessageCircle, Shield, Users, Headphones, ArrowRight, Zap, Globe, BarChart3 } from 'lucide-react';
import { useEffect } from 'react';

export default function Index() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
        <div className="relative max-w-6xl mx-auto px-4 py-20 sm:py-32">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25">
                <MessageCircle className="w-9 h-9 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              WhatsApp Hub
              <span className="block text-primary mt-2">Multi-Branch Support</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              One WhatsApp number, multiple branches, smart routing. 
              Deliver exceptional customer service across all your locations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="h-12 px-8 text-base" onClick={() => navigate('/login')}>
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                View Demo
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center text-foreground mb-12">
          Everything you need to manage customer support
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={Globe}
            title="Multi-Branch Routing"
            description="Automatically route conversations to the right branch based on customer preferences or location."
          />
          <FeatureCard
            icon={Users}
            title="Agent Management"
            description="Assign and reassign agents, track workload, and ensure optimal response times."
          />
          <FeatureCard
            icon={BarChart3}
            title="Real-time Analytics"
            description="Monitor performance, track KPIs, and make data-driven decisions to improve service."
          />
          <FeatureCard
            icon={Zap}
            title="Smart Escalation"
            description="Escalate complex issues to supervisors with full conversation context preserved."
          />
          <FeatureCard
            icon={Shield}
            title="Role-Based Access"
            description="Admins, branch managers, and agents each see exactly what they need."
          />
          <FeatureCard
            icon={MessageCircle}
            title="WhatsApp-Style UI"
            description="Familiar interface that agents can master in minutes, not hours."
          />
        </div>
      </div>

      {/* Roles Section */}
      <div className="bg-muted/50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            Designed for every role
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <RoleCard
              icon={Shield}
              title="Admin"
              features={[
                'Full access to all branches',
                'Manage agents and settings',
                'View comprehensive analytics',
                'Configure routing rules',
              ]}
            />
            <RoleCard
              icon={Users}
              title="Branch Manager"
              features={[
                'View branch activity',
                'Reassign agents',
                'Monitor performance',
                'Handle escalations',
              ]}
            />
            <RoleCard
              icon={Headphones}
              title="Agent"
              features={[
                'Respond to customers',
                'Update case status',
                'Add notes and tags',
                'Escalate when needed',
              ]}
            />
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">
          Ready to transform your customer support?
        </h2>
        <p className="text-muted-foreground mb-8">
          Start managing all your branches from a single WhatsApp number today.
        </p>
        <Button size="lg" className="h-12 px-8 text-base" onClick={() => navigate('/login')}>
          Sign In Now
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 WhatsApp Hub. Multi-Branch Support System Demo.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: typeof MessageCircle; title: string; description: string }) {
  return (
    <div className="p-6 rounded-xl border border-border bg-card hover:shadow-lg transition-shadow">
      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}

function RoleCard({ icon: Icon, title, features }: { icon: typeof Shield; title: string; features: string[] }) {
  return (
    <div className="p-6 rounded-xl border border-border bg-card">
      <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-primary-foreground" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-4">{title}</h3>
      <ul className="space-y-2">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
