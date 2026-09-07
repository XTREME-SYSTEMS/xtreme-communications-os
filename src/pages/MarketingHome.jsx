import { Link } from "react-router-dom";
import { MessageSquare, Phone, MessageCircle, Brain, Hash, Mail, ArrowRight, CheckCircle2, BarChart3, Shield, Globe } from "lucide-react";

export default function MarketingHome() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="https://media.base44.com/images/public/6a9b71a5d35335afb9198950/6806177bd_LOGO.png" className="h-8 w-8 rounded-lg object-contain" alt="Xtreme Communications" />
            <span className="font-display text-sm tracking-[0.15em] uppercase text-foreground">Xtreme Communications</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it Works</a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
            <Link to="/register" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Start Free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-hairline opacity-30" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="relative max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium mb-6">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            AI-Powered Communications Platform
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight text-foreground mb-4">
            SMS, Voice, WhatsApp &<br />
            <span className="text-primary">AI Agents</span> — One Platform
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Buy phone numbers, deploy AI voice agents, and automate SMS, MMS, WhatsApp, and email —
            all from a single dashboard with a simple API. Live in 5 minutes.
          </p>
          <div className="flex items-center justify-center gap-3 mb-8">
            <Link to="/register" className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
              Start Free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/pricing" className="px-6 py-3 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-accent transition-colors">
              View Pricing
            </Link>
          </div>
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> No credit card to start</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Pay-as-you-go</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-y border-border bg-card/50">
        <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { value: "10M+", label: "Messages Sent" },
            { value: "99.99%", label: "Uptime SLA" },
            { value: "5 min", label: "To First Call" },
            { value: "100+", label: "Businesses" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold text-foreground mb-2">Everything You Need to Communicate</h2>
            <p className="text-muted-foreground">Full-stack communications with built-in AI — no multiple vendors required</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: MessageSquare, title: "SMS & MMS", desc: "Send and receive text and multimedia messages globally. A2P 10DLC compliant with delivery receipts.", color: "text-primary" },
              { icon: Phone, title: "Voice API", desc: "Make and receive programmatic calls. Call recording, IVR, conferencing, and SIP trunking built-in.", color: "text-chart-2" },
              { icon: MessageCircle, title: "WhatsApp Business", desc: "Connect with customers on the world's most popular messaging app. Template messages and session messaging.", color: "text-chart-3" },
              { icon: Brain, title: "AI Voice Agents", desc: "Deploy conversational AI that handles calls autonomously. Natural voices, interruption handling, tool use.", color: "text-chart-4" },
              { icon: Hash, title: "Phone Numbers", desc: "Search, buy, and port local, toll-free, and international numbers instantly via API or dashboard.", color: "text-chart-5" },
              { icon: Mail, title: "Email Automation", desc: "Transactional and marketing email with templates, tracking, and AI-generated content.", color: "text-primary" },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <f.icon className={`h-5 w-5 ${f.color}`} />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="py-20 bg-card/50 border-y border-border">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold text-foreground mb-2">Live in 5 Minutes</h2>
            <p className="text-muted-foreground">From sign-up to first message in four simple steps</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { num: "01", title: "Create Account", desc: "Sign up with email. Get instant access to your dashboard and API keys." },
              { num: "02", title: "Get a Number", desc: "Search and buy a local or toll-free phone number in seconds." },
              { num: "03", title: "Set Up AI Agent", desc: "Choose a voice, write a prompt, and deploy your AI assistant." },
              { num: "04", title: "Go Live", desc: "Start sending SMS, making calls, and automating conversations." },
            ].map((s) => (
              <div key={s.num} className="relative">
                <div className="text-4xl font-display font-bold text-primary/20 mb-2">{s.num}</div>
                <h3 className="font-semibold text-foreground mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-display font-bold text-foreground mb-2">Simple, Transparent Pricing</h2>
          <p className="text-muted-foreground mb-8">Start at $0. Pay only for what you use. No hidden fees.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
            {[
               { name: "Starter", price: "$49", period: "/mo", desc: "For small teams getting started", features: ["1 phone number", "1 AI voice agent", "500 SMS/mo", "100 voice min/mo", "1,000 emails/mo", "Email support", "Basic analytics"] },
               { name: "Essential", price: "$99", period: "/mo", desc: "For growing teams", features: ["3 phone numbers", "2 AI voice agents", "2,000 SMS/mo", "500 voice min/mo", "5,000 emails/mo", "Call recording", "Standard support", "Advanced analytics"] },
               { name: "Professional", price: "$149", period: "/mo", desc: "For scaling businesses", features: ["5 phone numbers", "3 AI voice agents", "4,000 SMS/mo", "800 voice min/mo", "8,000 emails/mo", "WhatsApp Business API", "Custom templates", "Priority support", "Advanced analytics"] },
               { name: "Growth", price: "$199", period: "/mo", desc: "For growing businesses", features: ["5 phone numbers", "5 AI voice agents", "5,000 SMS/mo", "1,000 voice min/mo", "10,000 emails/mo", "WhatsApp Business API", "Priority support", "Advanced analytics", "Custom templates"], featured: true },
               { name: "Enterprise", price: "Custom", period: "", desc: "For high-volume operations", features: ["Unlimited numbers", "Unlimited AI agents", "Volume pricing", "Dedicated account manager", "Custom integrations", "SLA guarantee (99.99%)", "White-label dashboard", "24/7 phone support"] },
             ].map((p) => (
               <div key={p.name} className={`rounded-xl border p-5 text-left ${p.featured ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border bg-card"}`}>
                 {p.featured && <span className="inline-block px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium uppercase tracking-wider mb-3">Most Popular</span>}
                 <h3 className="font-display font-bold text-foreground text-lg">{p.name}</h3>
                 <p className="text-xs text-muted-foreground mb-3">{p.desc}</p>
                 <div className="flex items-baseline gap-0.5 mb-4">
                   <span className="text-3xl font-display font-bold text-foreground">{p.price}</span>
                   <span className="text-sm text-muted-foreground">{p.period}</span>
                 </div>
                 <ul className="space-y-1.5 mb-4">
                   {p.features.map((f) => (
                     <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                       <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> {f}
                     </li>
                   ))}
                 </ul>
               </div>
             ))}
           </div>
          <Link to="/pricing" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
            See Full Pricing <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-card/50 border-y border-border">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: "Enterprise-Grade Security", desc: "Encrypted at rest and in transit. SOC2 compliant. Token-based auth with scoped API keys." },
              { icon: Globe, title: "Global Reach", desc: "Numbers in 100+ countries. Carrier-grade infrastructure with redundant routing." },
              { icon: BarChart3, title: "Real-Time Analytics", desc: "Track every message, call, and conversation. Delivery rates, latency, cost — all visible." },
            ].map((f) => (
              <div key={f.title} className="text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-display font-bold text-foreground text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: "Do I need a credit card to start?", a: "No. You can sign up, get API keys, and buy a phone number with trial credit. Add a card when you're ready to go live." },
              { q: "How fast can I get a phone number?", a: "Instantly. Search available numbers by area code or pattern, and provision one in seconds via the dashboard or API." },
              { q: "Can I use my existing number?", a: "Yes. We support number porting from all major US carriers. The porting process typically takes 2-10 business days." },
              { q: "What AI voices are available?", a: "We offer 20+ natural voices through Telnyx Ultra, including warm, professional, energetic, and calm styles. You can test each before deploying." },
              { q: "Is there a minimum monthly spend?", a: "No. Pay-as-you-go starts at $0. Monthly plans are optional and include bundled usage with overages at published rates." },
            ].map((f) => (
              <div key={f.q} className="rounded-lg border border-border bg-card p-4">
                <h3 className="font-medium text-foreground mb-1">{f.q}</h3>
                <p className="text-sm text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-primary/5 border-t border-border">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-display font-bold text-foreground mb-2">Ready to Build?</h2>
          <p className="text-muted-foreground mb-6">Start free. Deploy in minutes. Scale when ready.</p>
          <Link to="/register" className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
            Create Free Account <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="https://media.base44.com/images/public/6a9b71a5d35335afb9198950/6806177bd_LOGO.png" className="h-6 w-6 rounded object-contain" alt="Xtreme Communications" />
            <span className="text-sm font-display tracking-wider text-foreground">Xtreme Communications</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link to="/pricing">Pricing</Link>
            <Link to="/login">Sign In</Link>
            <Link to="/register">Sign Up</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/acceptable-use">Acceptable Use</Link>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 Xtreme Communications. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}