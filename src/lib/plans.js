// ─── Canonical Plan Definitions (Frontend) ─────────────────────────
// SINGLE SOURCE OF TRUTH for frontend pricing UI.
// Backend counterpart: base44/shared/planRegistry.ts — MUST be kept in sync.

export const PLANS = [
  {
    name: "Launch",
    slug: "launch",
    price: 99,
    period: "/mo",
    desc: "Small business entry — basic AI receptionist + inbox",
    features: ["1 AI agent included", "1 phone number included", "500 SMS / month", "100 AI voice minutes / month", "5,000 emails / month", "10 workflow slots", "Unified SMS inbox", "Basic analytics", "Email support"],
    cta: "Add to Cart",
    isEnterprise: false,
  },
  {
    name: "Essential",
    slug: "essential",
    price: 249,
    period: "/mo",
    desc: "Core SMB — receptionist + sales + support automations",
    features: ["3 AI agents included", "3 phone numbers included", "2,000 SMS / month", "500 AI voice minutes / month", "25,000 emails / month", "30 workflow slots", "WhatsApp Business API", "Call recording", "XTREME CRM", "Breeze AI Copilot", "Standard support", "Advanced analytics"],
    cta: "Add to Cart",
    isEnterprise: false,
  },
  {
    name: "Professional",
    slug: "professional",
    price: 599,
    period: "/mo",
    desc: "High-value SMB — full AI team + advanced workflows",
    features: ["10 AI agents included", "10 phone numbers included", "10,000 SMS / month", "2,000 AI voice minutes / month", "100,000 emails / month", "75 workflow slots", "WhatsApp Business API", "Lead Scraper + enrichment", "Coupon & Business Card generators", "HubSpot sync", "Link Builder & QR", "Agent Memory", "Priority support", "Advanced analytics"],
    cta: "Add to Cart",
    featured: true,
    isEnterprise: false,
  },
  {
    name: "Growth",
    slug: "growth",
    price: 1499,
    period: "/mo",
    desc: "Multi-location — campaigns, live monitoring & API access",
    features: ["25 AI agents included", "25 phone numbers included", "50,000 SMS / month", "5,000 AI voice minutes / month", "500,000 emails / month", "200 workflow slots", "All Professional features", "Workflow Generator", "Content Library", "Google Workspace Sync", "Live Monitoring", "Xtreme Social", "Company Showcase", "API access", "Priority support"],
    cta: "Add to Cart",
    isEnterprise: false,
  },
  {
    name: "Agency",
    slug: "agency",
    price: 2999,
    period: "/mo",
    desc: "Agencies & resellers — white-label + multi-tenant",
    features: ["75 AI agents included", "100 phone numbers included", "250,000 SMS / month", "15,000 AI voice minutes / month", "2,000,000 emails / month", "500 workflow slots", "All Growth features", "White-label dashboard", "Multi-tenant subaccounts", "Reseller billing & markup controls", "Client template library", "Dedicated support"],
    cta: "Add to Cart",
    isEnterprise: false,
  },
  {
    name: "Enterprise",
    slug: "enterprise",
    price: 7500,
    period: "/mo",
    desc: "Platform-scale — SSO, SLA & custom integrations",
    features: ["250 AI agents included", "250 phone numbers included", "500,000 SMS / month", "30,000 AI voice minutes / month", "5,000,000 emails / month", "1,000 workflow slots", "All Agency features", "SSO & SAML", "99.99% SLA guarantee", "Dedicated routing", "Custom integrations", "Governance & audit controls", "Dedicated account manager", "24/7 phone support"],
    cta: "Contact Sales",
    isEnterprise: true,
  },
];

export const PAYG = [
  { category: "Phone Numbers", items: [
    { slug: "local-number", name: "Local number", price: 3.00, unit: "/mo", desc: "Carrier included · $3/mo", qty: 1 },
    { slug: "tollfree-number", name: "Toll-free number", price: 5.00, unit: "/mo", desc: "Carrier included · $5/mo", qty: 1 },
    { slug: "number-porting", name: "Number porting", price: 0, unit: "", desc: "Free porting", qty: 1 },
  ]},
  { category: "Messaging", items: [
    { slug: "sms-1000", name: "SMS Credit (1,000 msgs)", price: 12.00, unit: "", desc: "$0.012/msg · carrier fees pass-through", qty: 1 },
    { slug: "mms-1000", name: "MMS Credit (1,000 msgs)", price: 35.00, unit: "", desc: "$0.035/msg · carrier fees pass-through", qty: 1 },
    { slug: "whatsapp-1000", name: "WhatsApp Credit (1,000 msgs)", price: 10.00, unit: "", desc: "$0.01/msg · Meta fee pass-through", qty: 1 },
    { slug: "rcs-text-1000", name: "RCS Rich Text (1,000 segments)", price: 18.00, unit: "", desc: "$0.018/segment · carrier pass-through", qty: 1 },
  ]},
  { category: "Voice", items: [
    { slug: "voice-1000", name: "Programmable Voice (1,000 min)", price: 25.00, unit: "", desc: "$0.025/min · outbound API+SIP baseline", qty: 1 },
    { slug: "ai-voice-1000", name: "AI Voice Credit (1,000 min)", price: 140.00, unit: "", desc: "$0.14/min · all-in AI voice (premium LLM extra)", qty: 1 },
    { slug: "recording-1000", name: "Call Recording (1,000 min)", price: 10.00, unit: "", desc: "$0.01/min · storage beyond included retention", qty: 1 },
    { slug: "branded-100", name: "Branded Calling (100 calls)", price: 15.00, unit: "", desc: "$0.15/call · brand setup billed separately", qty: 1 },
  ]},
  { category: "AI Agents & Add-ons", items: [
    { slug: "managed-agent", name: "Managed AI Employee", price: 499.00, unit: "/mo", desc: "Per agent/month · usage separate", qty: 1 },
    { slug: "whitelabel-tenant", name: "White-label Tenant", price: 999.00, unit: "/mo", desc: "Per tenant/month · plus usage", qty: 1 },
    { slug: "dedicated-support", name: "Dedicated Support", price: 1500.00, unit: "/mo", desc: "Tiered by SLA", qty: 1 },
  ]},
  { category: "Email & Utilities", items: [
    { slug: "email-1000", name: "Email Credit (1,000 emails)", price: 1.50, unit: "", desc: "$0.0015/email · higher volumes reduce cost", qty: 1 },
    { slug: "lookup-1000", name: "Lookup (1,000 queries)", price: 5.00, unit: "", desc: "$0.005/query · number intelligence", qty: 1 },
    { slug: "verify-100", name: "Verify (100 successes)", price: 8.00, unit: "", desc: "$0.08/success · channel cost pass-through", qty: 1 },
    { slug: "fax-100", name: "Fax (100 pages)", price: 3.00, unit: "", desc: "$0.03/page · SIP pass-through", qty: 1 },
  ]},
];

// Helper: get product ID for a plan given billing period
export function getPlanProductId(slug, billing) {
  return billing === "annual" ? `plan-${slug}-annual` : `plan-${slug}`;
}