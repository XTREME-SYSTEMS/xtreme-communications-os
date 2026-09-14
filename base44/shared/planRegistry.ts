// ─── Canonical Plan Registry ──────────────────────────────────────
// SINGLE SOURCE OF TRUTH for all plan pricing, product IDs, and entitlements.
// Imported by create-checkout, payments-webhook, and any billing logic.
// Frontend counterpart: src/lib/plans.js — MUST be kept in sync.

export interface PlanEntitlements {
  max_agents: number;
  max_phone_numbers: number;
  monthly_sms: number;
  monthly_ai_voice_minutes: number;
  monthly_email: number;
  workflow_limit: number;
  has_crm: boolean;
  has_breeze_copilot: boolean;
  has_whatsapp: boolean;
  has_call_recording: boolean;
  has_lead_scraper: boolean;
  has_api_access: boolean;
  has_white_label: boolean;
  has_multi_tenant: boolean;
  has_sso: boolean;
  sla_tier: string;
  support_tier: string;
}

export interface PlanDefinition {
  slug: string;
  displayName: string;
  monthlyPrice: number;
  annualPrice: number; // per month, billed annually
  monthlyProductId: string;
  annualProductId: string;
  isEnterprise: boolean; // enterprise uses contact-sales flow, not self-service checkout
  entitlements: PlanEntitlements;
}

export const PLAN_REGISTRY: Record<string, PlanDefinition> = {
  launch: {
    slug: "launch",
    displayName: "Launch",
    monthlyPrice: 99,
    annualPrice: 79, // Math.round(99 * 0.8)
    monthlyProductId: "plan-launch",
    annualProductId: "plan-launch-annual",
    isEnterprise: false,
    entitlements: {
      max_agents: 1, max_phone_numbers: 1,
      monthly_sms: 500, monthly_ai_voice_minutes: 100, monthly_email: 5000,
      workflow_limit: 10,
      has_crm: false, has_breeze_copilot: false, has_whatsapp: false,
      has_call_recording: false, has_lead_scraper: false, has_api_access: false,
      has_white_label: false, has_multi_tenant: false, has_sso: false,
      sla_tier: "none", support_tier: "email",
    },
  },
  essential: {
    slug: "essential",
    displayName: "Essential",
    monthlyPrice: 249,
    annualPrice: 199,
    monthlyProductId: "plan-essential",
    annualProductId: "plan-essential-annual",
    isEnterprise: false,
    entitlements: {
      max_agents: 3, max_phone_numbers: 3,
      monthly_sms: 2000, monthly_ai_voice_minutes: 500, monthly_email: 25000,
      workflow_limit: 30,
      has_crm: true, has_breeze_copilot: true, has_whatsapp: true,
      has_call_recording: true, has_lead_scraper: false, has_api_access: false,
      has_white_label: false, has_multi_tenant: false, has_sso: false,
      sla_tier: "none", support_tier: "standard",
    },
  },
  professional: {
    slug: "professional",
    displayName: "Professional",
    monthlyPrice: 599,
    annualPrice: 479,
    monthlyProductId: "plan-professional",
    annualProductId: "plan-professional-annual",
    isEnterprise: false,
    entitlements: {
      max_agents: 10, max_phone_numbers: 10,
      monthly_sms: 10000, monthly_ai_voice_minutes: 2000, monthly_email: 100000,
      workflow_limit: 75,
      has_crm: true, has_breeze_copilot: true, has_whatsapp: true,
      has_call_recording: true, has_lead_scraper: true, has_api_access: false,
      has_white_label: false, has_multi_tenant: false, has_sso: false,
      sla_tier: "none", support_tier: "priority",
    },
  },
  growth: {
    slug: "growth",
    displayName: "Growth",
    monthlyPrice: 1499,
    annualPrice: 1199,
    monthlyProductId: "plan-growth",
    annualProductId: "plan-growth-annual",
    isEnterprise: false,
    entitlements: {
      max_agents: 25, max_phone_numbers: 25,
      monthly_sms: 50000, monthly_ai_voice_minutes: 5000, monthly_email: 500000,
      workflow_limit: 200,
      has_crm: true, has_breeze_copilot: true, has_whatsapp: true,
      has_call_recording: true, has_lead_scraper: true, has_api_access: true,
      has_white_label: false, has_multi_tenant: false, has_sso: false,
      sla_tier: "none", support_tier: "priority",
    },
  },
  agency: {
    slug: "agency",
    displayName: "Agency",
    monthlyPrice: 2999,
    annualPrice: 2399,
    monthlyProductId: "plan-agency",
    annualProductId: "plan-agency-annual",
    isEnterprise: false,
    entitlements: {
      max_agents: 75, max_phone_numbers: 100,
      monthly_sms: 250000, monthly_ai_voice_minutes: 15000, monthly_email: 2000000,
      workflow_limit: 500,
      has_crm: true, has_breeze_copilot: true, has_whatsapp: true,
      has_call_recording: true, has_lead_scraper: true, has_api_access: true,
      has_white_label: true, has_multi_tenant: true, has_sso: false,
      sla_tier: "none", support_tier: "dedicated",
    },
  },
  enterprise: {
    slug: "enterprise",
    displayName: "Enterprise",
    monthlyPrice: 7500,
    annualPrice: 6000,
    monthlyProductId: "plan-enterprise",
    annualProductId: "plan-enterprise-annual",
    isEnterprise: true,
    entitlements: {
      max_agents: 250, max_phone_numbers: 250,
      monthly_sms: 500000, monthly_ai_voice_minutes: 30000, monthly_email: 5000000,
      workflow_limit: 1000,
      has_crm: true, has_breeze_copilot: true, has_whatsapp: true,
      has_call_recording: true, has_lead_scraper: true, has_api_access: true,
      has_white_label: true, has_multi_tenant: true, has_sso: true,
      sla_tier: "99.99", support_tier: "24/7",
    },
  },
};

// Explicit deterministic product-ID → plan-slug mapping.
// Does NOT rely on string stripping. Unknown product IDs fail closed (return null).
export const PRODUCT_TO_PLAN: Record<string, string> = {};
for (const [slug, def] of Object.entries(PLAN_REGISTRY)) {
  PRODUCT_TO_PLAN[def.monthlyProductId] = slug;
  PRODUCT_TO_PLAN[def.annualProductId] = slug;
}

// Resolve a product ID to its plan definition and billing interval.
// Returns null for unknown product IDs (fail closed).
export function resolvePlanFromProductId(productId: string): {
  plan: string;
  billingInterval: "MONTH" | "YEAR";
  entitlements: PlanEntitlements;
} | null {
  const planSlug = PRODUCT_TO_PLAN[productId];
  if (!planSlug) return null;
  const def = PLAN_REGISTRY[planSlug];
  if (!def) return null;
  const billingInterval = productId.endsWith("-annual") ? "YEAR" : "MONTH";
  return { plan: planSlug, billingInterval, entitlements: def.entitlements };
}

// PAYG / usage rate card — canonical for backend.
// Frontend counterpart in src/lib/plans.js MUST match.
export const PAYG_PRODUCTS: Record<string, { name: string; price: string; subscription?: { frequency: string } }> = {
  "payg-local-number":      { name: "Local Phone Number — Monthly",      price: "3.00",    subscription: { frequency: "MONTH" } },
  "payg-tollfree-number":   { name: "Toll-Free Phone Number — Monthly",   price: "5.00",    subscription: { frequency: "MONTH" } },
  "payg-sms-1000":          { name: "SMS Credit (1,000 msgs)",            price: "12.00" },
  "payg-mms-1000":          { name: "MMS Credit (1,000 msgs)",            price: "35.00" },
  "payg-whatsapp-1000":     { name: "WhatsApp Credit (1,000 msgs)",      price: "10.00" },
  "payg-rcs-text-1000":     { name: "RCS Rich Text (1,000 segments)",     price: "18.00" },
  "payg-voice-1000":        { name: "Programmable Voice (1,000 min)",     price: "25.00" },
  "payg-ai-voice-1000":     { name: "AI Voice Credit (1,000 min)",        price: "140.00" },
  "payg-recording-1000":    { name: "Call Recording (1,000 min)",         price: "10.00" },
  "payg-branded-100":       { name: "Branded Calling (100 calls)",        price: "15.00" },
  "payg-managed-agent":     { name: "Managed AI Employee — Monthly",     price: "499.00",  subscription: { frequency: "MONTH" } },
  "payg-whitelabel-tenant": { name: "White-label Tenant — Monthly",       price: "999.00",  subscription: { frequency: "MONTH" } },
  "payg-dedicated-support": { name: "Dedicated Support — Monthly",       price: "1500.00", subscription: { frequency: "MONTH" } },
  "payg-email-1000":        { name: "Email Credit (1,000 emails)",        price: "1.50" },
  "payg-lookup-1000":       { name: "Lookup (1,000 queries)",             price: "5.00" },
  "payg-verify-100":        { name: "Verify (100 successes)",             price: "8.00" },
  "payg-fax-100":           { name: "Fax (100 pages)",                    price: "3.00" },
};

// Combined product catalog for checkout: plans + PAYG
export const ALL_PRODUCTS: Record<string, { name: string; price: string; subscription?: { frequency: string } }> = {};
for (const def of Object.values(PLAN_REGISTRY)) {
  ALL_PRODUCTS[def.monthlyProductId] = {
    name: `${def.displayName} Plan — Monthly`,
    price: def.monthlyPrice.toFixed(2),
    subscription: { frequency: "MONTH" },
  };
  // CRITICAL: annualPrice is the monthly-equivalent (e.g. $79/mo for Launch).
  // Wix frequency "YEAR" charges the price ONCE PER YEAR, so we must multiply by 12.
  // $79/mo × 12 = $948/year — this is what Wix charges annually.
  // The Pricing UI displays "$79/mo" (the monthly equivalent) which is transparent.
  ALL_PRODUCTS[def.annualProductId] = {
    name: `${def.displayName} Plan — Annual`,
    price: (def.annualPrice * 12).toFixed(2),
    subscription: { frequency: "YEAR" },
  };
}
for (const [pid, prod] of Object.entries(PAYG_PRODUCTS)) {
  ALL_PRODUCTS[pid] = prod;
}