// ─── Canonical Usage Rate Registry ─────────────────────────────────
// SINGLE SOURCE OF TRUTH for all metered usage rates, provider costs, and margins.
// Consumed by: meterUsage, billing reconciliation, margin engine, invoices, analytics.
//
// All monetary values are in INTEGER MICROS (1,000,000 microunits = $1.00).
// This guarantees exact arithmetic for rates like $0.012/msg with no floating-point drift.
//
// Versioned: every rate has effective_from/effective_to. Historical usage retains the
// pricing version used at the time — never silently recalculate old bills with new rates.

export type Currency = "USD";
export type BillingUnit = "message" | "segment" | "minute" | "second" | "call" | "email" | "query" | "success" | "page" | "month" | "token" | "request";
export type RoundingRule = "ceil" | "floor" | "round" | "exact";

export interface UsageRateDefinition {
  rate_id: string;
  metric_id: string;           // e.g. "sms.outbound.us.local"
  channel: string;             // sms, mms, voice, whatsapp, rcs, email, verify, lookup, number, recording, ai_voice
  direction: string;           // inbound, outbound
  provider: string;            // telnyx, twilio, meta, internal, vercel
  region: string;              // us, ca, uk, eu, global
  unit: BillingUnit;           // message, minute, second, call, email, query, month
  customer_rate_micros: number;  // what the customer pays per unit (microunits)
  provider_cost_micros: number;  // what the provider charges us (microunits)
  currency: Currency;
  billing_increment: number;   // bill per 1 message, per 6 seconds, per 1 minute, etc.
  rounding_rule: RoundingRule;
  included_allowance: number;  // 0 = no included allowance (PAYG); >0 for plan-included
  overage_rate_micros: number; // rate after allowance is exceeded (0 = same as customer_rate)
  effective_from: string;      // ISO date
  effective_to: string | null; // null = currently active
  version: number;
  status: "active" | "superseded" | "retired";
}

// ── MICROS CONVERSION HELPERS ──────────────────────────────────────
// 1 dollar = 1,000,000 microunits. This gives 6 decimal places of precision.
// $0.012/msg = 12,000 micros/msg. Exact integer arithmetic, no float drift.
export const MICROS_PER_DOLLAR = 1_000_000;
export const CENTS_PER_DOLLAR = 100;
export const MICROS_PER_CENT = 10_000;

export function dollarsToMicros(dollars: number): number {
  return Math.round(dollars * MICROS_PER_DOLLAR);
}

export function microsToDollars(micros: number): number {
  return micros / MICROS_PER_DOLLAR;
}

export function centsToMicros(cents: number): number {
  return cents * MICROS_PER_CENT;
}

export function microsToCents(micros: number): number {
  return Math.round(micros / MICROS_PER_CENT);
}

// ── CANONICAL RATE DEFINITIONS (v1, effective 2026-09-14) ─────────
// Customer rates match the public PAYG rates published in src/lib/plans.js.
// Provider costs are best-estimate internal costs for margin tracking.
// UNKNOWN provider costs are marked as -1 (margin engine flags these).

export const USAGE_RATE_REGISTRY: UsageRateDefinition[] = [
  // ── SMS ──
  {
    rate_id: "sms.out.us.local.v1",
    metric_id: "sms.outbound.us.local",
    channel: "sms", direction: "outbound", provider: "telnyx", region: "us",
    unit: "message",
    customer_rate_micros: dollarsToMicros(0.012),   // $0.012/msg
    provider_cost_micros: dollarsToMicros(0.005),    // ~$0.005 carrier cost
    currency: "USD", billing_increment: 1, rounding_rule: "ceil",
    included_allowance: 0, overage_rate_micros: 0,
    effective_from: "2026-09-14T00:00:00Z", effective_to: null,
    version: 1, status: "active",
  },
  {
    rate_id: "sms.in.us.local.v1",
    metric_id: "sms.inbound.us.local",
    channel: "sms", direction: "inbound", provider: "telnyx", region: "us",
    unit: "message",
    customer_rate_micros: dollarsToMicros(0.005),   // $0.005/msg inbound
    provider_cost_micros: dollarsToMicros(0.004),
    currency: "USD", billing_increment: 1, rounding_rule: "ceil",
    included_allowance: 0, overage_rate_micros: 0,
    effective_from: "2026-09-14T00:00:00Z", effective_to: null,
    version: 1, status: "active",
  },
  // ── MMS ──
  {
    rate_id: "mms.out.us.local.v1",
    metric_id: "mms.outbound.us.local",
    channel: "mms", direction: "outbound", provider: "telnyx", region: "us",
    unit: "message",
    customer_rate_micros: dollarsToMicros(0.035),   // $0.035/msg
    provider_cost_micros: dollarsToMicros(0.020),
    currency: "USD", billing_increment: 1, rounding_rule: "ceil",
    included_allowance: 0, overage_rate_micros: 0,
    effective_from: "2026-09-14T00:00:00Z", effective_to: null,
    version: 1, status: "active",
  },
  {
    rate_id: "mms.in.us.local.v1",
    metric_id: "mms.inbound.us.local",
    channel: "mms", direction: "inbound", provider: "telnyx", region: "us",
    unit: "message",
    customer_rate_micros: dollarsToMicros(0.010),   // $0.010/msg inbound
    provider_cost_micros: dollarsToMicros(0.008),
    currency: "USD", billing_increment: 1, rounding_rule: "ceil",
    included_allowance: 0, overage_rate_micros: 0,
    effective_from: "2026-09-14T00:00:00Z", effective_to: null,
    version: 1, status: "active",
  },
  // ── WhatsApp ──
  {
    rate_id: "wa.out.us.template.v1",
    metric_id: "whatsapp.outbound.us.template",
    channel: "whatsapp", direction: "outbound", provider: "meta", region: "us",
    unit: "message",
    customer_rate_micros: dollarsToMicros(0.010),   // $0.01/msg
    provider_cost_micros: dollarsToMicros(0.0065),   // Meta business pricing
    currency: "USD", billing_increment: 1, rounding_rule: "ceil",
    included_allowance: 0, overage_rate_micros: 0,
    effective_from: "2026-09-14T00:00:00Z", effective_to: null,
    version: 1, status: "active",
  },
  {
    rate_id: "wa.in.us.session.v1",
    metric_id: "whatsapp.inbound.us.session",
    channel: "whatsapp", direction: "inbound", provider: "meta", region: "us",
    unit: "message",
    customer_rate_micros: 0,  // inbound WhatsApp is free for customer
    provider_cost_micros: 0,
    currency: "USD", billing_increment: 1, rounding_rule: "ceil",
    included_allowance: 0, overage_rate_micros: 0,
    effective_from: "2026-09-14T00:00:00Z", effective_to: null,
    version: 1, status: "active",
  },
  // ── RCS ──
  {
    rate_id: "rcs.out.us.text.v1",
    metric_id: "rcs.outbound.us.text",
    channel: "rcs", direction: "outbound", provider: "telnyx", region: "us",
    unit: "segment",
    customer_rate_micros: dollarsToMicros(0.018),   // $0.018/segment
    provider_cost_micros: dollarsToMicros(0.012),
    currency: "USD", billing_increment: 1, rounding_rule: "ceil",
    included_allowance: 0, overage_rate_micros: 0,
    effective_from: "2026-09-14T00:00:00Z", effective_to: null,
    version: 1, status: "active",
  },
  // ── Programmable Voice ──
  {
    rate_id: "voice.out.us.local.v1",
    metric_id: "voice.outbound.us.local",
    channel: "voice", direction: "outbound", provider: "telnyx", region: "us",
    unit: "minute",
    customer_rate_micros: dollarsToMicros(0.025),   // $0.025/min
    provider_cost_micros: dollarsToMicros(0.015),
    currency: "USD", billing_increment: 60, rounding_rule: "ceil",  // bill per 60 seconds
    included_allowance: 0, overage_rate_micros: 0,
    effective_from: "2026-09-14T00:00:00Z", effective_to: null,
    version: 1, status: "active",
  },
  {
    rate_id: "voice.in.us.local.v1",
    metric_id: "voice.inbound.us.local",
    channel: "voice", direction: "inbound", provider: "telnyx", region: "us",
    unit: "minute",
    customer_rate_micros: dollarsToMicros(0.015),   // $0.015/min inbound
    provider_cost_micros: dollarsToMicros(0.010),
    currency: "USD", billing_increment: 60, rounding_rule: "ceil",
    included_allowance: 0, overage_rate_micros: 0,
    effective_from: "2026-09-14T00:00:00Z", effective_to: null,
    version: 1, status: "active",
  },
  // ── AI Voice ──
  {
    rate_id: "aivoice.out.us.v1",
    metric_id: "ai_voice.outbound.us",
    channel: "ai_voice", direction: "outbound", provider: "internal", region: "us",
    unit: "minute",
    customer_rate_micros: dollarsToMicros(0.14),    // $0.14/min
    provider_cost_micros: dollarsToMicros(0.08),    // LLM + TTS + STT + SIP
    currency: "USD", billing_increment: 60, rounding_rule: "ceil",
    included_allowance: 0, overage_rate_micros: 0,
    effective_from: "2026-09-14T00:00:00Z", effective_to: null,
    version: 1, status: "active",
  },
  // ── Call Recording ──
  {
    rate_id: "recording.us.v1",
    metric_id: "recording.us",
    channel: "recording", direction: "outbound", provider: "internal", region: "us",
    unit: "minute",
    customer_rate_micros: dollarsToMicros(0.01),    // $0.01/min
    provider_cost_micros: dollarsToMicros(0.003),    // storage cost
    currency: "USD", billing_increment: 60, rounding_rule: "ceil",
    included_allowance: 0, overage_rate_micros: 0,
    effective_from: "2026-09-14T00:00:00Z", effective_to: null,
    version: 1, status: "active",
  },
  // ── Branded Calling ──
  {
    rate_id: "branded.us.v1",
    metric_id: "branded_call.us",
    channel: "voice", direction: "outbound", provider: "telnyx", region: "us",
    unit: "call",
    customer_rate_micros: dollarsToMicros(0.15),    // $0.15/call
    provider_cost_micros: dollarsToMicros(0.10),
    currency: "USD", billing_increment: 1, rounding_rule: "ceil",
    included_allowance: 0, overage_rate_micros: 0,
    effective_from: "2026-09-14T00:00:00Z", effective_to: null,
    version: 1, status: "active",
  },
  // ── Email ──
  {
    rate_id: "email.out.global.v1",
    metric_id: "email.outbound.global",
    channel: "email", direction: "outbound", provider: "internal", region: "global",
    unit: "email",
    customer_rate_micros: dollarsToMicros(0.0015),  // $0.0015/email
    provider_cost_micros: dollarsToMicros(0.0005),  // SMTP relay cost
    currency: "USD", billing_increment: 1, rounding_rule: "ceil",
    included_allowance: 0, overage_rate_micros: 0,
    effective_from: "2026-09-14T00:00:00Z", effective_to: null,
    version: 1, status: "active",
  },
  // ── Lookup ──
  {
    rate_id: "lookup.us.v1",
    metric_id: "lookup.us",
    channel: "lookup", direction: "outbound", provider: "telnyx", region: "us",
    unit: "query",
    customer_rate_micros: dollarsToMicros(0.005),   // $0.005/query
    provider_cost_micros: dollarsToMicros(0.003),
    currency: "USD", billing_increment: 1, rounding_rule: "ceil",
    included_allowance: 0, overage_rate_micros: 0,
    effective_from: "2026-09-14T00:00:00Z", effective_to: null,
    version: 1, status: "active",
  },
  // ── Verify ──
  {
    rate_id: "verify.us.v1",
    metric_id: "verify.us",
    channel: "verify", direction: "outbound", provider: "telnyx", region: "us",
    unit: "success",
    customer_rate_micros: dollarsToMicros(0.08),    // $0.08/success
    provider_cost_micros: dollarsToMicros(0.05),
    currency: "USD", billing_increment: 1, rounding_rule: "ceil",
    included_allowance: 0, overage_rate_micros: 0,
    effective_from: "2026-09-14T00:00:00Z", effective_to: null,
    version: 1, status: "active",
  },
  // ── Fax ──
  {
    rate_id: "fax.us.v1",
    metric_id: "fax.us",
    channel: "voice", direction: "outbound", provider: "telnyx", region: "us",
    unit: "page",
    customer_rate_micros: dollarsToMicros(0.03),    // $0.03/page
    provider_cost_micros: dollarsToMicros(0.02),
    currency: "USD", billing_increment: 1, rounding_rule: "ceil",
    included_allowance: 0, overage_rate_micros: 0,
    effective_from: "2026-09-14T00:00:00Z", effective_to: null,
    version: 1, status: "active",
  },
  // ── Number Rental ──
  {
    rate_id: "number.local.us.monthly.v1",
    metric_id: "number.local.us.monthly",
    channel: "number", direction: "outbound", provider: "telnyx", region: "us",
    unit: "month",
    customer_rate_micros: dollarsToMicros(3.00),    // $3/mo
    provider_cost_micros: dollarsToMicros(1.50),
    currency: "USD", billing_increment: 1, rounding_rule: "exact",
    included_allowance: 0, overage_rate_micros: 0,
    effective_from: "2026-09-14T00:00:00Z", effective_to: null,
    version: 1, status: "active",
  },
  {
    rate_id: "number.tollfree.us.monthly.v1",
    metric_id: "number.tollfree.us.monthly",
    channel: "number", direction: "outbound", provider: "telnyx", region: "us",
    unit: "month",
    customer_rate_micros: dollarsToMicros(5.00),    // $5/mo
    provider_cost_micros: dollarsToMicros(2.50),
    currency: "USD", billing_increment: 1, rounding_rule: "exact",
    included_allowance: 0, overage_rate_micros: 0,
    effective_from: "2026-09-14T00:00:00Z", effective_to: null,
    version: 1, status: "active",
  },
  // ── Managed AI Employee ──
  {
    rate_id: "managed_agent.monthly.v1",
    metric_id: "managed_agent.monthly",
    channel: "ai_voice", direction: "outbound", provider: "internal", region: "global",
    unit: "month",
    customer_rate_micros: dollarsToMicros(499.00),  // $499/mo
    provider_cost_micros: dollarsToMicros(200.00),
    currency: "USD", billing_increment: 1, rounding_rule: "exact",
    included_allowance: 0, overage_rate_micros: 0,
    effective_from: "2026-09-14T00:00:00Z", effective_to: null,
    version: 1, status: "active",
  },
  // ── White-label Tenant ──
  {
    rate_id: "whitelabel.monthly.v1",
    metric_id: "whitelabel.monthly",
    channel: "number", direction: "outbound", provider: "internal", region: "global",
    unit: "month",
    customer_rate_micros: dollarsToMicros(999.00),  // $999/mo
    provider_cost_micros: dollarsToMicros(100.00),
    currency: "USD", billing_increment: 1, rounding_rule: "exact",
    included_allowance: 0, overage_rate_micros: 0,
    effective_from: "2026-09-14T00:00:00Z", effective_to: null,
    version: 1, status: "active",
  },
  // ── Dedicated Support ──
  {
    rate_id: "dedicated_support.monthly.v1",
    metric_id: "dedicated_support.monthly",
    channel: "email", direction: "outbound", provider: "internal", region: "global",
    unit: "month",
    customer_rate_micros: dollarsToMicros(1500.00), // $1500/mo
    provider_cost_micros: dollarsToMicros(500.00),
    currency: "USD", billing_increment: 1, rounding_rule: "exact",
    included_allowance: 0, overage_rate_micros: 0,
    effective_from: "2026-09-14T00:00:00Z", effective_to: null,
    version: 1, status: "active",
  },
  // ── UNKNOWN RATES (channels found in platform but no approved customer rate) ──
  // These are flagged as UNKNOWN_RATE — meterUsage will refuse to charge them.
  {
    rate_id: "sip_trunk.unknown.v1",
    metric_id: "sip_trunk.unknown",
    channel: "voice", direction: "outbound", provider: "telnyx", region: "us",
    unit: "minute",
    customer_rate_micros: -1,  // UNKNOWN_RATE
    provider_cost_micros: -1,
    currency: "USD", billing_increment: 60, rounding_rule: "ceil",
    included_allowance: 0, overage_rate_micros: 0,
    effective_from: "2026-09-14T00:00:00Z", effective_to: null,
    version: 1, status: "active",
  },
  {
    rate_id: "transcription.unknown.v1",
    metric_id: "transcription.unknown",
    channel: "recording", direction: "outbound", provider: "internal", region: "us",
    unit: "minute",
    customer_rate_micros: -1,  // UNKNOWN_RATE
    provider_cost_micros: -1,
    currency: "USD", billing_increment: 60, rounding_rule: "ceil",
    included_allowance: 0, overage_rate_micros: 0,
    effective_from: "2026-09-14T00:00:00Z", effective_to: null,
    version: 1, status: "active",
  },
  {
    rate_id: "tts.unknown.v1",
    metric_id: "tts.unknown",
    channel: "ai_voice", direction: "outbound", provider: "internal", region: "global",
    unit: "second",
    customer_rate_micros: -1,  // UNKNOWN_RATE
    provider_cost_micros: -1,
    currency: "USD", billing_increment: 1, rounding_rule: "ceil",
    included_allowance: 0, overage_rate_micros: 0,
    effective_from: "2026-09-14T00:00:00Z", effective_to: null,
    version: 1, status: "active",
  },
  {
    rate_id: "stt.unknown.v1",
    metric_id: "stt.unknown",
    channel: "recording", direction: "outbound", provider: "internal", region: "global",
    unit: "second",
    customer_rate_micros: -1,  // UNKNOWN_RATE
    provider_cost_micros: -1,
    currency: "USD", billing_increment: 1, rounding_rule: "ceil",
    included_allowance: 0, overage_rate_micros: 0,
    effective_from: "2026-09-14T00:00:00Z", effective_to: null,
    version: 1, status: "active",
  },
  {
    rate_id: "llm.unknown.v1",
    metric_id: "llm.unknown",
    channel: "ai_voice", direction: "outbound", provider: "vercel", region: "global",
    unit: "token",
    customer_rate_micros: -1,  // UNKNOWN_RATE
    provider_cost_micros: -1,
    currency: "USD", billing_increment: 1, rounding_rule: "exact",
    included_allowance: 0, overage_rate_micros: 0,
    effective_from: "2026-09-14T00:00:00Z", effective_to: null,
    version: 1, status: "active",
  },
  {
    rate_id: "carrier_fee.unknown.v1",
    metric_id: "carrier_fee.unknown",
    channel: "sms", direction: "outbound", provider: "telnyx", region: "us",
    unit: "message",
    customer_rate_micros: -1,  // UNKNOWN_RATE — pass-through, varies by carrier
    provider_cost_micros: -1,
    currency: "USD", billing_increment: 1, rounding_rule: "ceil",
    included_allowance: 0, overage_rate_micros: 0,
    effective_from: "2026-09-14T00:00:00Z", effective_to: null,
    version: 1, status: "active",
  },
  {
    rate_id: "a2p_fee.unknown.v1",
    metric_id: "a2p_fee.unknown",
    channel: "sms", direction: "outbound", provider: "telnyx", region: "us",
    unit: "message",
    customer_rate_micros: -1,  // UNKNOWN_RATE — regulatory, varies
    provider_cost_micros: -1,
    currency: "USD", billing_increment: 1, rounding_rule: "ceil",
    included_allowance: 0, overage_rate_micros: 0,
    effective_from: "2026-09-14T00:00:00Z", effective_to: null,
    version: 1, status: "active",
  },
];

// ── RATE LOOKUP ────────────────────────────────────────────────────
// Resolve a rate by channel + direction + region. Returns the active version.
// Returns null if no rate found (fail closed — do not charge).
export function resolveRate(
  channel: string,
  direction: string,
  region: string = "us",
  provider?: string,
  atTimestamp?: string,
): UsageRateDefinition | null {
  const now = atTimestamp || new Date().toISOString();
  const matches = USAGE_RATE_REGISTRY.filter(r => {
    if (r.channel !== channel) return false;
    if (r.direction !== direction) return false;
    if (r.region !== region && r.region !== "global") return false;
    if (provider && r.provider !== provider) return false;
    if (r.status !== "active") return false;
    if (r.effective_from > now) return false;
    if (r.effective_to && r.effective_to < now) return false;
    return true;
  });
  // Prefer exact region match, then global
  const exactRegion = matches.find(r => r.region === region);
  const global = matches.find(r => r.region === "global");
  return exactRegion || global || matches[0] || null;
}

// Check if a rate is UNKNOWN_RATE (customer_rate_micros === -1)
export function isUnknownRate(rate: UsageRateDefinition | null): boolean {
  return !rate || rate.customer_rate_micros === -1;
}

// ── MARGIN CALCULATION ────────────────────────────────────────────
export interface MarginResult {
  customer_revenue_micros: number;
  provider_cost_micros: number;
  contribution_margin_micros: number;
  margin_percentage: number;
  is_negative: boolean;
  is_unknown: boolean;
}

export function calculateMargin(
  rate: UsageRateDefinition,
  units: number,
): MarginResult {
  if (isUnknownRate(rate)) {
    return {
      customer_revenue_micros: 0,
      provider_cost_micros: 0,
      contribution_margin_micros: 0,
      margin_percentage: 0,
      is_negative: false,
      is_unknown: true,
    };
  }
  const revenue = rate.customer_rate_micros * units;
  const cost = rate.provider_cost_micros * units;
  const margin = revenue - cost;
  const pct = revenue > 0 ? (margin / revenue) * 100 : 0;
  return {
    customer_revenue_micros: revenue,
    provider_cost_micros: cost,
    contribution_margin_micros: margin,
    margin_percentage: Math.round(pct * 100) / 100,
    is_negative: margin < 0,
    is_unknown: false,
  };
}

// ── BILLING INCREMENT CALCULATION ──────────────────────────────────
// Apply the billing increment and rounding rule.
// e.g. voice billed per 60 seconds with ceil: 61 seconds → 2 minutes
export function calculateBillableUnits(rawUnits: number, rate: UsageRateDefinition): number {
  const increment = rate.billing_increment || 1;
  const divided = rawUnits / increment;
  switch (rate.rounding_rule) {
    case "ceil": return Math.ceil(divided) * increment;
    case "floor": return Math.floor(divided) * increment;
    case "round": return Math.round(divided) * increment;
    case "exact": return rawUnits;
    default: return Math.ceil(divided) * increment;
  }
}

// ── ALLOWANCE CHECK ───────────────────────────────────────────────
// Check if usage is within the plan's included allowance.
// Returns { within_allowance, overage_units, chargeable_units }
export function checkAllowance(
  usageSoFar: number,
  newUnits: number,
  allowance: number,
): { within_allowance: boolean; overage_units: number; chargeable_units: number } {
  const totalAfter = usageSoFar + newUnits;
  if (allowance <= 0) {
    // PAYG — no allowance, all usage is chargeable
    return { within_allowance: false, overage_units: 0, chargeable_units: newUnits };
  }
  if (totalAfter <= allowance) {
    return { within_allowance: true, overage_units: 0, chargeable_units: 0 };
  }
  // Partial overage
  const remaining = Math.max(0, allowance - usageSoFar);
  const overage = Math.max(0, newUnits - remaining);
  return { within_allowance: false, overage_units: overage, chargeable_units: overage };
}