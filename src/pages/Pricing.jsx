import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ArrowRight, Zap, Tag, X } from "lucide-react";

const PLANS = [
  {
    name: "Starter",
    price: 49,
    period: "/mo",
    desc: "For small teams getting started with AI communications",
    features: [
      "1 phone number included",
      "1 AI voice agent",
      "500 SMS / month",
      "100 voice minutes / month",
      "1,000 emails / month",
      "Email support",
      "Basic analytics",
    ],
    cta: "Start Starter",
  },
  {
    name: "Growth",
    price: 199,
    period: "/mo",
    desc: "For growing businesses that need more channels and agents",
    features: [
      "5 phone numbers included",
      "5 AI voice agents",
      "5,000 SMS / month",
      "1,000 voice minutes / month",
      "10,000 emails / month",
      "WhatsApp Business API",
      "Priority support",
      "Advanced analytics",
      "Custom templates",
    ],
    cta: "Start Growth",
    featured: true,
  },
  {
    name: "Enterprise",
    price: null,
    period: "",
    desc: "For high-volume operations with custom needs",
    features: [
      "Unlimited phone numbers",
      "Unlimited AI agents",
      "Volume-based pricing",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee (99.99%)",
      "On-premise option",
      "White-label dashboard",
      "24/7 phone support",
    ],
    cta: "Contact Sales",
  },
];

const PAYG = [
  { category: "Phone Numbers", items: [
    { name: "Local number", price: "$1.00", unit: "/mo" },
    { name: "Toll-free number", price: "$1.00", unit: "/mo" },
    { name: "Number porting", price: "Free", unit: "" },
  ]},
  { category: "Messaging", items: [
    { name: "SMS (US)", price: "$0.004", unit: "/msg" },
    { name: "MMS (US)", price: "$0.012", unit: "/msg" },
    { name: "WhatsApp session", price: "$0.0025", unit: "/min" },
  ]},
  { category: "Voice", items: [
    { name: "Outbound call", price: "$0.007", unit: "/min" },
    { name: "Inbound call", price: "$0.0032", unit: "/min" },
    { name: "Call recording", price: "$0.002", unit: "/min" },
  ]},
  { category: "AI Agents", items: [
    { name: "Conversational AI", price: "$0.05", unit: "/min" },
    { name: "Speech-to-text", price: "$0.0074", unit: "/min" },
    { name: "Text-to-speech", price: "$0.000003", unit: "/char" },
  ]},
  { category: "Email", items: [
    { name: "Outbound email", price: "$0.0013", unit: "/email" },
  ]},
];

export default function Pricing() {
  const [billing, setBilling] = useState("monthly");
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(null);
  const [promoError, setPromoError] = useState("");

  const applyPromo = () => {
    if (!promoCode.trim()) return;
    // Simulate promo validation — in production this checks PromoCode entity
    if (promoCode.toUpperCase() === "LAUNCH50") {
      setPromoApplied({ code: "LAUNCH50", type: "percentage", value: 50, description: "50% off first 3 months" });
      setPromoError("");
    } else if (promoCode.toUpperCase() === "FREE100") {
      setPromoApplied({ code: "FREE100", type: "account_credit", value: 100, description: "$100 account credit" });
      setPromoError("");
    } else {
      setPromoError("Invalid or expired promo code");
      setPromoApplied(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-sm tracking-[0.15em] uppercase text-foreground">XTREME Comms</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/login" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
            <Link to="/register" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Start Free</Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="max-w-4xl mx-auto px-4 pt-16 pb-8 text-center">
        <h1 className="text-4xl font-display font-bold text-foreground mb-2">Simple, Transparent Pricing</h1>
        <p className="text-muted-foreground">Start free. Pay-as-you-go or pick a plan. No hidden fees, ever.</p>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-1 p-1 rounded-lg border border-border bg-card mt-6">
          <button onClick={() => setBilling("monthly")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${billing === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            Monthly
          </button>
          <button onClick={() => setBilling("annual")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${billing === "annual" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            Annual <span className="text-xs opacity-80">(Save 20%)</span>
          </button>
        </div>
      </div>

      {/* Plans */}
      <div className="max-w-5xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((p) => {
            const displayPrice = p.price === null ? "Custom" : billing === "annual" ? `$${Math.round(p.price * 0.8)}` : `$${p.price}`;
            return (
              <div key={p.name} className={`rounded-xl border p-6 ${p.featured ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border bg-card"}`}>
                {p.featured && <span className="inline-block px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium uppercase tracking-wider mb-3">Most Popular</span>}
                <h3 className="font-display font-bold text-foreground text-xl mb-1">{p.name}</h3>
                <p className="text-xs text-muted-foreground mb-4">{p.desc}</p>
                <div className="flex items-baseline gap-0.5 mb-1">
                  <span className="text-4xl font-display font-bold text-foreground">{displayPrice}</span>
                  <span className="text-sm text-muted-foreground">{p.price !== null ? p.period : ""}</span>
                </div>
                {billing === "annual" && p.price !== null && <p className="text-xs text-primary mb-4">Billed annually</p>}
                {billing !== "annual" && <div className="mb-4" />}
                <ul className="space-y-2 mb-6">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/register" className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-opacity ${p.featured ? "bg-primary text-primary-foreground hover:opacity-90" : "border border-border text-foreground hover:bg-accent"}`}>
                  {p.cta} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Promo Code */}
        <div className="mt-6 max-w-md mx-auto">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Have a promo code?</span>
            </div>
            {promoApplied ? (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-primary/10 border border-primary/30">
                <div>
                  <span className="text-sm font-medium text-primary">{promoApplied.code}</span>
                  <span className="text-xs text-muted-foreground ml-2">{promoApplied.description}</span>
                </div>
                <button onClick={() => { setPromoApplied(null); setPromoCode(""); }} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder="Enter promo code"
                    className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none"
                    onKeyDown={(e) => e.key === "Enter" && applyPromo()} />
                  <button onClick={applyPromo} className="px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Apply</button>
                </div>
                {promoError && <p className="text-xs text-destructive mt-1.5">{promoError}</p>}
                <p className="text-[10px] text-muted-foreground mt-1.5">Try: LAUNCH50 or FREE100</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Pay-As-You-Go Rates */}
      <div className="border-t border-border bg-card/50 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-display font-bold text-foreground mb-1">Pay-As-You-Go Rates</h2>
            <p className="text-sm text-muted-foreground">No plan required. Start at $0 and pay only for what you use.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PAYG.map((cat) => (
              <div key={cat.category} className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-display uppercase tracking-wider text-muted-foreground mb-3">{cat.category}</h3>
                <div className="space-y-2">
                  {cat.items.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{item.name}</span>
                      <span className="text-sm font-medium text-foreground">{item.price}<span className="text-xs text-muted-foreground ml-0.5">{item.unit}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <p className="text-xs text-muted-foreground mb-3">All rates are published. No markup on carrier passthrough. Volume discounts start at $500/mo committed spend.</p>
            <Link to="/register" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-accent transition-colors">
              Start Pay-As-You-Go <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Comparison */}
      <div className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-display font-bold text-foreground text-center mb-8">Compare Plans</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 text-muted-foreground font-medium">Feature</th>
                  <th className="text-center py-3 text-muted-foreground font-medium">Starter</th>
                  <th className="text-center py-3 text-primary font-medium">Growth</th>
                  <th className="text-center py-3 text-muted-foreground font-medium">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Phone numbers", s: "1", g: "5", e: "Unlimited" },
                  { feature: "AI voice agents", s: "1", g: "5", e: "Unlimited" },
                  { feature: "SMS / month", s: "500", g: "5,000", e: "Volume" },
                  { feature: "Voice minutes / month", s: "100", g: "1,000", e: "Volume" },
                  { feature: "WhatsApp Business", s: "—", g: "✓", e: "✓" },
                  { feature: "Custom templates", s: "—", g: "✓", e: "✓" },
                  { feature: "Advanced analytics", s: "—", g: "✓", e: "✓" },
                  { feature: "Priority support", s: "—", g: "✓", e: "✓" },
                  { feature: "Dedicated manager", s: "—", g: "—", e: "✓" },
                  { feature: "SLA guarantee", s: "—", g: "—", e: "99.99%" },
                  { feature: "White-label", s: "—", g: "—", e: "✓" },
                ].map((row) => (
                  <tr key={row.feature} className="border-b border-border/50">
                    <td className="py-2.5 text-foreground">{row.feature}</td>
                    <td className="text-center py-2.5 text-muted-foreground">{row.s}</td>
                    <td className="text-center py-2.5 text-primary font-medium">{row.g}</td>
                    <td className="text-center py-2.5 text-muted-foreground">{row.e}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-16 bg-primary/5 border-t border-border">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">Still Have Questions?</h2>
          <p className="text-muted-foreground mb-6">Start free and upgrade when you're ready. No credit card required.</p>
          <Link to="/register" className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
            Create Free Account <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}