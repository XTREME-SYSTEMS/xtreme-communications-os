import { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle2, ArrowRight, Tag, X, ShoppingCart, Plus } from "lucide-react";
import CartDrawer from "@/components/CartDrawer";
import { PLANS, PAYG, getPlanProductId } from "@/lib/plans";

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
        <h1 className="text-4xl font-display font-bold text-foreground mb-2">The AI Communications OS</h1>
        <p className="text-muted-foreground">Full-stack AI agents, CRM, workflows & omnichannel messaging. Platform subscription + metered usage. No hidden fees.</p>
        <div className="inline-flex items-center gap-1 p-1 rounded-lg border border-border bg-card mt-6">
          <button onClick={() => setBilling("monthly")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${billing === "monthly" ? "gold-gradient text-black" : "text-muted-foreground"}`}>Monthly</button>
          <button onClick={() => setBilling("annual")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${billing === "annual" ? "gold-gradient text-black" : "text-muted-foreground"}`}>Annual <span className="text-xs opacity-80">(Save 20%)</span></button>
        </div>
      </div>

      {/* Plans */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                  <button onClick={() => addToCart({ id: getPlanProductId(p.slug, billing), name: `${p.name} Plan`, desc: `${p.features.length} features · ${billing}`, price: billing === "annual" ? Math.round(p.price * 0.8) : p.price })}
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
                        <button onClick={() => addToCart({ id: `payg-${item.slug}`, name: item.name, desc: item.desc, price: item.price })}
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
            <p className="text-xs text-muted-foreground mb-3">All rates published. Carrier & Meta fees pass-through at cost. Platform fees create durable margin. Volume discounts start at $1,000/mo committed spend.</p>
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
                  <th className="text-center py-3 text-muted-foreground font-medium">Launch</th>
                  <th className="text-center py-3 text-muted-foreground font-medium">Essential</th>
                  <th className="text-center py-3 text-primary font-medium">Professional</th>
                  <th className="text-center py-3 text-muted-foreground font-medium">Growth</th>
                  <th className="text-center py-3 text-muted-foreground font-medium">Agency</th>
                  <th className="text-center py-3 text-muted-foreground font-medium">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Platform price / mo", l: "$99", e: "$249", p: "$599", g: "$1,499", a: "$2,999", ent: "$7,500" },
                  { feature: "AI agents included", l: "1", e: "3", p: "10", g: "25", a: "75", ent: "250" },
                  { feature: "Phone numbers included", l: "1", e: "3", p: "10", g: "25", a: "100", ent: "250" },
                  { feature: "SMS / month", l: "500", e: "2,000", p: "10,000", g: "50,000", a: "250,000", ent: "500,000" },
                  { feature: "AI voice minutes / month", l: "100", e: "500", p: "2,000", g: "5,000", a: "15,000", ent: "30,000" },
                  { feature: "Emails / month", l: "5,000", e: "25,000", p: "100,000", g: "500,000", a: "2,000,000", ent: "5,000,000" },
                  { feature: "Workflow slots", l: "10", e: "30", p: "75", g: "200", a: "500", ent: "1,000" },
                  { feature: "Unified SMS Inbox", l: "✓", e: "✓", p: "✓", g: "✓", a: "✓", ent: "✓" },
                  { feature: "XTREME CRM", l: "—", e: "✓", p: "✓", g: "✓", a: "✓", ent: "✓" },
                  { feature: "Breeze AI Copilot", l: "—", e: "✓", p: "✓", g: "✓", a: "✓", ent: "✓" },
                  { feature: "WhatsApp Business API", l: "—", e: "✓", p: "✓", g: "✓", a: "✓", ent: "✓" },
                  { feature: "Call recording", l: "—", e: "✓", p: "✓", g: "✓", a: "✓", ent: "✓" },
                  { feature: "Lead Scraper + enrichment", l: "—", e: "—", p: "✓", g: "✓", a: "✓", ent: "✓" },
                  { feature: "Coupon & Business Cards", l: "—", e: "—", p: "✓", g: "✓", a: "✓", ent: "✓" },
                  { feature: "Link Builder & QR", l: "—", e: "—", p: "✓", g: "✓", a: "✓", ent: "✓" },
                  { feature: "HubSpot Sync", l: "—", e: "—", p: "✓", g: "✓", a: "✓", ent: "✓" },
                  { feature: "Agent Memory", l: "—", e: "—", p: "✓", g: "✓", a: "✓", ent: "✓" },
                  { feature: "Workflow Generator", l: "—", e: "—", p: "—", g: "✓", a: "✓", ent: "✓" },
                  { feature: "Content Library", l: "—", e: "—", p: "—", g: "✓", a: "✓", ent: "✓" },
                  { feature: "Google Workspace Sync", l: "—", e: "—", p: "—", g: "✓", a: "✓", ent: "✓" },
                  { feature: "Live Monitoring", l: "—", e: "—", p: "—", g: "✓", a: "✓", ent: "✓" },
                  { feature: "Xtreme Social", l: "—", e: "—", p: "—", g: "✓", a: "✓", ent: "✓" },
                  { feature: "Company Showcase", l: "—", e: "—", p: "—", g: "✓", a: "✓", ent: "✓" },
                  { feature: "API access", l: "—", e: "—", p: "—", g: "✓", a: "✓", ent: "✓" },
                  { feature: "White-label dashboard", l: "—", e: "—", p: "—", g: "—", a: "✓", ent: "✓" },
                  { feature: "Multi-tenant subaccounts", l: "—", e: "—", p: "—", g: "—", a: "✓", ent: "✓" },
                  { feature: "Reseller billing & markup", l: "—", e: "—", p: "—", g: "—", a: "✓", ent: "✓" },
                  { feature: "SSO / SAML", l: "—", e: "—", p: "—", g: "—", a: "—", ent: "✓" },
                  { feature: "SLA guarantee", l: "—", e: "—", p: "—", g: "—", a: "—", ent: "99.99%" },
                  { feature: "Dedicated routing", l: "—", e: "—", p: "—", g: "—", a: "—", ent: "✓" },
                  { feature: "Dedicated account manager", l: "—", e: "—", p: "—", g: "—", a: "✓", ent: "✓" },
                  { feature: "24/7 phone support", l: "—", e: "—", p: "—", g: "—", a: "—", ent: "✓" },
                  { feature: "Testing Studio", l: "✓", e: "✓", p: "✓", g: "✓", a: "✓", ent: "✓" },
                  { feature: "Core Documentation", l: "✓", e: "✓", p: "✓", g: "✓", a: "✓", ent: "✓" },
                ].map((row) => (
                  <tr key={row.feature} className="border-b border-border/50">
                    <td className="py-2.5 text-foreground">{row.feature}</td>
                    <td className="text-center py-2.5 text-muted-foreground">{row.l}</td>
                    <td className="text-center py-2.5 text-muted-foreground">{row.e}</td>
                    <td className="text-center py-2.5 text-primary font-medium">{row.p}</td>
                    <td className="text-center py-2.5 text-muted-foreground">{row.g}</td>
                    <td className="text-center py-2.5 text-muted-foreground">{row.a}</td>
                    <td className="text-center py-2.5 text-muted-foreground">{row.ent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="py-16 border-t border-border">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-display font-bold text-foreground text-center mb-8">Pricing FAQ</h2>
          <div className="space-y-3">
            {[
              { q: "What's included in the Workflow Generator?", a: "The Workflow Generator provides drag-and-drop workflow building with 5 channel types (Mobile, Voice, WhatsApp, Email, Custom) and 9 step types (AI Agent, Time Window, Day of Week, Delay, Script, Template, Message, Image, Condition). Available on Growth and above." },
              { q: "What does Content Library include?", a: "AI-generated images, lifelike human photos, emoji sets, GIFs, jokes, social media posts, and videos. All generated content is saved to your CreativeAsset library for reuse. Available on Growth and above." },
              { q: "How does Google Workspace sync work?", a: "Connect your Google Drive, Gmail, Calendar, Tasks, Docs, and Sheets to auto-sync intelligence reports, communication templates, agent schedules, and action items. Auto-sync runs in the background. Available on Growth and above." },
              { q: "Can I monitor calls in real-time?", a: "Yes. The Live Monitoring dashboard shows active calls with live transcripts, audio playback, and agent performance metrics. Auto-refreshes every 3 seconds. Available on Growth and above." },
              { q: "What is Xtreme Social?", a: "AI-powered social media content generation and scheduling across Facebook, Instagram, TikTok, X/Twitter, Snapchat, and LinkedIn. Generate posts, captions, hashtags, and video scripts with your brand kit. Available on Growth and above." },
              { q: "Is the Core Documentation available on all plans?", a: "Yes. The Core Documentation page — covering all entities, backend functions, integrations, and API endpoints — is available on all plans including Launch and Pay-As-You-Go." },
              { q: "What is XTREME CRM?", a: "A full AI-assisted CRM built into the platform. Manage contacts with lifecycle stages, send bulk multi-channel outreach (SMS, MMS, email, voice, WhatsApp), set automated follow-ups, sync with HubSpot, and track your pipeline. Available on Essential and above." },
              { q: "How does the Lead Scraper work?", a: "Search for businesses by industry, location, keyword, and radius. The AI finds real businesses with ratings, reviews, and contact info. Enrich each lead with social profiles, revenue, and decision makers — then one-click ingest into your CRM. Available on Professional and above." },
              { q: "What is Breeze AI Copilot?", a: "A floating AI chat assistant available on every page. It can read your CRM contacts, suggest actions, draft messages, and help execute workflows. Available on Essential and above." },
              { q: "Can I create coupons and offers?", a: "Yes. The Coupon Generator creates coupons with AI-generated visuals, QR codes, smart links, and voice script injection — so your AI agent can mention offers during calls. Available on Professional and above." },
              { q: "Does it sync with HubSpot?", a: "Yes. XTREME CRM has bidirectional HubSpot sync — push contacts to HubSpot or pull them back. Available on Professional and above." },
              { q: "What is the Agency plan?", a: "The Agency plan is built for resellers and agencies — it includes white-label dashboards, multi-tenant subaccounts, reseller billing with markup controls, and a client template library. $2,999/mo with 75 agents, 100 numbers, and 500 workflow slots included." },
              { q: "What are Managed AI Employees?", a: "Managed AI Employees are fully-tuned, monitored AI agents available as an add-on at $499/agent/month. Each includes role prompt, tools, knowledge, policies, escalation rules, and a performance scorecard. Usage (voice minutes, SMS, etc.) is metered separately." },
              { q: "Can I switch plans anytime?", a: "Yes. Upgrade or downgrade at any time. Changes are prorated automatically. Cancel anytime with no penalty." },
              { q: "Do unused credits roll over?", a: "Pay-as-you-go credits never expire. Monthly plan included usage resets each billing cycle. Overages are billed at published pay-as-you-go rates." },
              { q: "How does pricing compare to competitors?", a: "Competitor AI voice platforms charge $0.07–$0.15/min for raw voice infrastructure, and managed platforms like JustCall charge $99/mo for just 100 AI minutes. Xtreme includes the full stack — AI agents, CRM, workflows, multi-channel messaging, lead scraper, and analytics — starting at $99/mo (Launch) with 100 AI voice minutes included. At Professional ($599/mo), you get 10 AI agents and 2,000 AI voice minutes — a fraction of what a single human receptionist costs." },
            ].map((f) => (
              <div key={f.q} className="rounded-lg border border-border bg-card p-4">
                <h3 className="font-medium text-foreground mb-1 text-sm">{f.q}</h3>
                <p className="text-xs text-muted-foreground">{f.a}</p>
              </div>
            ))}
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