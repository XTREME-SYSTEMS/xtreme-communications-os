import { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle2, ArrowRight, Tag, X, ShoppingCart, Plus } from "lucide-react";
import CartDrawer from "@/components/CartDrawer";

const PLANS = [
  {
    name: "Starter",
    price: 49,
    period: "/mo",
    desc: "For small teams getting started with AI communications",
    features: ["1 phone number included", "1 AI voice agent", "500 SMS / month", "100 voice minutes / month", "1,000 emails / month", "Email support", "Basic analytics"],
    cta: "Add to Cart",
  },
  {
    name: "Essential",
    price: 99,
    period: "/mo",
    desc: "For growing teams that need more capacity",
    features: ["3 phone numbers included", "2 AI voice agents", "2,000 SMS / month", "500 voice minutes / month", "5,000 emails / month", "Call recording", "Standard support", "Advanced analytics"],
    cta: "Add to Cart",
  },
  {
    name: "Professional",
    price: 149,
    period: "/mo",
    desc: "For businesses scaling their communications",
    features: ["5 phone numbers included", "3 AI voice agents", "4,000 SMS / month", "800 voice minutes / month", "8,000 emails / month", "WhatsApp Business API", "Custom templates", "Priority support", "Advanced analytics"],
    cta: "Add to Cart",
  },
  {
    name: "Growth",
    price: 199,
    period: "/mo",
    desc: "For growing businesses that need more channels and agents",
    features: ["5 phone numbers included", "5 AI voice agents", "5,000 SMS / month", "1,000 voice minutes / month", "10,000 emails / month", "WhatsApp Business API", "Priority support", "Advanced analytics", "Custom templates"],
    cta: "Add to Cart",
    featured: true,
  },
  {
    name: "Enterprise",
    price: null,
    period: "",
    desc: "For high-volume operations with custom needs",
    features: ["Unlimited phone numbers", "Unlimited AI agents", "Volume-based pricing", "Dedicated account manager", "Custom integrations", "SLA guarantee (99.99%)", "On-premise option", "White-label dashboard", "24/7 phone support"],
    cta: "Contact Sales",
  },
];

const PAYG = [
  { category: "Phone Numbers", items: [
    { name: "Local number", price: 1.00, unit: "/mo", desc: "per month", qty: 1 },
    { name: "Toll-free number", price: 1.00, unit: "/mo", desc: "per month", qty: 1 },
    { name: "Number porting", price: 0, unit: "", desc: "Free porting", qty: 1 },
  ]},
  { category: "Messaging", items: [
    { name: "SMS Credit (1,000 msgs)", price: 4.00, unit: "", desc: "$0.004/msg · 1,000 messages", qty: 1 },
    { name: "MMS Credit (1,000 msgs)", price: 12.00, unit: "", desc: "$0.012/msg · 1,000 messages", qty: 1 },
    { name: "WhatsApp Credit (1,000 min)", price: 2.50, unit: "", desc: "$0.0025/min · 1,000 minutes", qty: 1 },
  ]},
  { category: "Voice", items: [
    { name: "Outbound Call Credit (1,000 min)", price: 7.00, unit: "", desc: "$0.007/min · 1,000 minutes", qty: 1 },
    { name: "Inbound Call Credit (1,000 min)", price: 3.20, unit: "", desc: "$0.0032/min · 1,000 minutes", qty: 1 },
    { name: "Call Recording Credit (1,000 min)", price: 2.00, unit: "", desc: "$0.002/min · 1,000 minutes", qty: 1 },
  ]},
  { category: "AI Agents", items: [
    { name: "Conversational AI Credit (100 min)", price: 5.00, unit: "", desc: "$0.05/min · 100 minutes", qty: 1 },
    { name: "Speech-to-Text Credit (1,000 min)", price: 7.40, unit: "", desc: "$0.0074/min · 1,000 minutes", qty: 1 },
    { name: "Text-to-Speech Credit (100K chars)", price: 0.30, unit: "", desc: "$0.000003/char · 100K chars", qty: 1 },
  ]},
  { category: "Email", items: [
    { name: "Email Credit (10,000 emails)", price: 13.00, unit: "", desc: "$0.0013/email · 10,000 emails", qty: 1 },
  ]},
];

export default function Pricing() {
  const { toast } = useToast();
  const [billing, setBilling] = useState("monthly");
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(null);
  const [promoError, setPromoError] = useState("");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
    setCartOpen(true);
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));
  const updateQty = (id, qty) => {
    if (qty <= 0) return removeFromCart(id);
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
  };
  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const applyPromo = () => {
    if (!promoCode.trim()) return;
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

  const handleCheckout = async () => {
    setCartOpen(false);
    try {
      const items = cart.map(i => ({ productId: i.id, quantity: i.quantity }));
      const res = await base44.functions.invoke("create-checkout", { items });
      const redirectUrl = res.data?.redirectUrl || res.redirectUrl;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        toast({ title: "Checkout error", description: "No redirect URL returned", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Checkout failed", description: e.message || "Could not start checkout", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="https://media.base44.com/images/public/6a9b71a5d35335afb9198950/6806177bd_LOGO.png" className="h-8 w-8 rounded-lg object-contain" alt="Xtreme Communications" />
            <span className="font-display text-sm tracking-[0.15em] uppercase text-foreground">Xtreme Communications</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/login" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
            <Link to="/register" className="px-4 py-2 rounded-lg gold-gradient text-black text-sm font-medium hover:opacity-90 transition-opacity">Start Free</Link>
            <button onClick={() => setCartOpen(true)} className="relative px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors">
              <ShoppingCart className="h-4 w-4 text-foreground" />
              {cart.length > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">{cart.length}</span>}
            </button>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="max-w-4xl mx-auto px-4 pt-16 pb-8 text-center">
        <h1 className="text-4xl font-display font-bold text-foreground mb-2">Simple, Transparent Pricing</h1>
        <p className="text-muted-foreground">Start free. Pay-as-you-go or pick a plan. No hidden fees, ever.</p>
        <div className="inline-flex items-center gap-1 p-1 rounded-lg border border-border bg-card mt-6">
          <button onClick={() => setBilling("monthly")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${billing === "monthly" ? "gold-gradient text-black" : "text-muted-foreground"}`}>Monthly</button>
          <button onClick={() => setBilling("annual")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${billing === "annual" ? "gold-gradient text-black" : "text-muted-foreground"}`}>Annual <span className="text-xs opacity-80">(Save 20%)</span></button>
        </div>
      </div>

      {/* Plans */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {PLANS.map((p) => {
            const displayPrice = p.price === null ? "Custom" : billing === "annual" ? `$${Math.round(p.price * 0.8)}` : `$${p.price}`;
            return (
              <div key={p.name} className={`rounded-xl border p-5 flex flex-col ${p.featured ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border bg-card"}`}>
                {p.featured && <span className="inline-block px-2 py-0.5 rounded-full gold-gradient text-black text-[10px] font-medium uppercase tracking-wider mb-3 self-start">Most Popular</span>}
                <h3 className="font-display font-bold text-foreground text-lg mb-1">{p.name}</h3>
                <p className="text-xs text-muted-foreground mb-3">{p.desc}</p>
                <div className="flex items-baseline gap-0.5 mb-1">
                  <span className="text-3xl font-display font-bold text-foreground">{displayPrice}</span>
                  <span className="text-sm text-muted-foreground">{p.price !== null ? p.period : ""}</span>
                </div>
                {billing === "annual" && p.price !== null && <p className="text-xs text-primary mb-3">Billed annually</p>}
                {billing !== "annual" && <div className="mb-3" />}
                <ul className="space-y-1.5 mb-4 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                {p.price === null ? (
                  <Link to="/register" className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-accent">
                    {p.cta} <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <button onClick={() => addToCart({ id: `plan-${p.name}`, name: `${p.name} Plan`, desc: `${p.features.length} features · ${billing}`, price: billing === "annual" ? Math.round(p.price * 0.8) : p.price })}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium gold-gradient text-black hover:opacity-90">
                    <Plus className="h-4 w-4" /> {p.cta}
                  </button>
                )}
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
                <button onClick={() => { setPromoApplied(null); setPromoCode(""); }} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder="Enter promo code"
                    className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none"
                    onKeyDown={(e) => e.key === "Enter" && applyPromo()} />
                  <button onClick={applyPromo} className="px-4 h-9 rounded-lg gold-gradient text-black text-sm font-medium hover:opacity-90">Apply</button>
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
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-display font-bold text-foreground mb-1">Pay-As-You-Go Rates</h2>
            <p className="text-sm text-muted-foreground">No plan required. Start at $0 and pay only for what you use. Add credits to your cart below.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PAYG.map((cat) => (
              <div key={cat.category} className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-display uppercase tracking-wider text-muted-foreground mb-3">{cat.category}</h3>
                <div className="space-y-2">
                  {cat.items.map((item) => (
                    <div key={item.name} className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-foreground block truncate">{item.name}</span>
                        <span className="text-[10px] text-muted-foreground">{item.desc}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-medium text-foreground">${item.price.toFixed(2)}</span>
                      </div>
                      {item.price > 0 && (
                        <button onClick={() => addToCart({ id: `payg-${item.name}`, name: item.name, desc: item.desc, price: item.price })}
                          className="shrink-0 px-2 py-1 rounded-lg gold-gradient text-black text-xs font-medium hover:opacity-90 flex items-center gap-1">
                          <Plus className="h-3 w-3" /> Add
                        </button>
                      )}
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
                  <th className="text-center py-3 text-muted-foreground font-medium">Essential</th>
                  <th className="text-center py-3 text-muted-foreground font-medium">Pro</th>
                  <th className="text-center py-3 text-primary font-medium">Growth</th>
                  <th className="text-center py-3 text-muted-foreground font-medium">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Phone numbers", s: "1", e: "3", p: "5", g: "5", ent: "Unlimited" },
                  { feature: "AI voice agents", s: "1", e: "2", p: "3", g: "5", ent: "Unlimited" },
                  { feature: "SMS / month", s: "500", e: "2,000", p: "4,000", g: "5,000", ent: "Volume" },
                  { feature: "Voice minutes / month", s: "100", e: "500", p: "800", g: "1,000", ent: "Volume" },
                  { feature: "WhatsApp Business", s: "—", e: "—", p: "✓", g: "✓", ent: "✓" },
                  { feature: "Call recording", s: "—", e: "✓", p: "✓", g: "✓", ent: "✓" },
                  { feature: "Custom templates", s: "—", e: "—", p: "✓", g: "✓", ent: "✓" },
                  { feature: "Advanced analytics", s: "—", e: "✓", p: "✓", g: "✓", ent: "✓" },
                  { feature: "Priority support", s: "—", e: "—", p: "✓", g: "✓", ent: "✓" },
                  { feature: "Dedicated manager", s: "—", e: "—", p: "—", g: "—", ent: "✓" },
                  { feature: "SLA guarantee", s: "—", e: "—", p: "—", g: "—", ent: "99.99%" },
                  { feature: "White-label", s: "—", e: "—", p: "—", g: "—", ent: "✓" },
                ].map((row) => (
                  <tr key={row.feature} className="border-b border-border/50">
                    <td className="py-2.5 text-foreground">{row.feature}</td>
                    <td className="text-center py-2.5 text-muted-foreground">{row.s}</td>
                    <td className="text-center py-2.5 text-muted-foreground">{row.e}</td>
                    <td className="text-center py-2.5 text-muted-foreground">{row.p}</td>
                    <td className="text-center py-2.5 text-primary font-medium">{row.g}</td>
                    <td className="text-center py-2.5 text-muted-foreground">{row.ent}</td>
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
          <Link to="/register" className="inline-flex items-center gap-2 px-8 py-3 rounded-lg gold-gradient text-black font-medium hover:opacity-90 transition-opacity">
            Create Free Account <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <CartDrawer
        items={cart}
        total={cartTotal}
        onRemove={removeFromCart}
        onUpdateQty={updateQty}
        onCheckout={handleCheckout}
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
      />
    </div>
  );
}