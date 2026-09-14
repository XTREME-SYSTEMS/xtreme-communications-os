// ─── Entitlement Enforcement ─────────────────────────────────────
// Server-side entitlement checks for all protected features.
// A hidden button is NOT an entitlement boundary — every privileged operation
// must call checkEntitlement() from its backend function.
//
// Usage in a backend function:
//   import { checkEntitlement } from '../../shared/entitlementEnforcement.ts';
//   const check = await checkEntitlement(base44, userId, 'has_lead_scraper');
//   if (!check.allowed) return Response.json({ error: check.reason }, { status: 403 });

import { PLAN_REGISTRY } from './planRegistry.ts';

export interface EntitlementFeature {
  feature_id: string;
  minimum_plan: string;
  entitlement_field: string;  // field on CustomerSubscription
  description: string;
}

// ── FEATURE REGISTRY ──────────────────────────────────────────────
// Every protected capability in the application, mapped to its entitlement field.
export const FEATURE_REGISTRY: EntitlementFeature[] = [
  // ── Quantitative limits (checked against numeric entitlements) ──
  { feature_id: "max_agents", minimum_plan: "launch", entitlement_field: "max_agents", description: "Maximum AI agents allowed" },
  { feature_id: "max_phone_numbers", minimum_plan: "launch", entitlement_field: "max_phone_numbers", description: "Maximum phone numbers allowed" },
  { feature_id: "monthly_sms_allowance", minimum_plan: "launch", entitlement_field: "monthly_sms_allowance", description: "Monthly SMS allowance" },
  { feature_id: "monthly_ai_voice_minutes", minimum_plan: "launch", entitlement_field: "monthly_ai_voice_minutes", description: "Monthly AI voice minutes" },
  { feature_id: "monthly_email_allowance", minimum_plan: "launch", entitlement_field: "monthly_email_allowance", description: "Monthly email allowance" },
  { feature_id: "workflow_limit", minimum_plan: "launch", entitlement_field: "workflow_limit", description: "Maximum workflow slots" },
  // ── Boolean entitlements (checked for true/false) ──
  { feature_id: "has_crm", minimum_plan: "essential", entitlement_field: "has_crm", description: "XTREME CRM access" },
  { feature_id: "has_breeze_copilot", minimum_plan: "essential", entitlement_field: "has_breeze_copilot", description: "Breeze AI Copilot" },
  { feature_id: "has_whatsapp", minimum_plan: "essential", entitlement_field: "has_whatsapp", description: "WhatsApp Business API" },
  { feature_id: "has_call_recording", minimum_plan: "essential", entitlement_field: "has_call_recording", description: "Call recording" },
  { feature_id: "has_lead_scraper", minimum_plan: "professional", entitlement_field: "has_lead_scraper", description: "Lead Scraper + enrichment" },
  { feature_id: "has_api_access", minimum_plan: "growth", entitlement_field: "has_api_access", description: "API access" },
  { feature_id: "has_white_label", minimum_plan: "agency", entitlement_field: "has_white_label", description: "White-label dashboard" },
  { feature_id: "has_multi_tenant", minimum_plan: "agency", entitlement_field: "has_multi_tenant", description: "Multi-tenant subaccounts" },
  { feature_id: "has_sso", minimum_plan: "enterprise", entitlement_field: "has_sso", description: "SSO / SAML" },
];

export interface EntitlementCheckResult {
  allowed: boolean;
  reason: string;
  result_code: string;
  user_id: string;
  feature_id: string;
  required_plan: string;
  actual_plan: string;
  entitlement_field: string;
  entitlement_value: any;
  subscription_id?: string;
}

// ── CHECK ENTITLEMENT ─────────────────────────────────────────────
// Resolves the user's CustomerSubscription, then checks the specific entitlement.
// Returns a structured result. Logs to EntitlementCheck entity for audit trail.
export async function checkEntitlement(
  base44: any,
  userId: string,
  featureId: string,
  options?: { requestedAction?: string; functionName?: string; isHostileTest?: boolean; skipLog?: boolean },
): Promise<EntitlementCheckResult> {
  const feature = FEATURE_REGISTRY.find(f => f.feature_id === featureId);
  if (!feature) {
    return {
      allowed: false, reason: `Unknown feature: ${featureId}`,
      result_code: "denied", user_id: userId, feature_id: featureId,
      required_plan: "unknown", actual_plan: "unknown",
      entitlement_field: "unknown", entitlement_value: null,
    };
  }

  // Resolve the user's subscription
  let subscription: any = null;
  try {
    const subs = await base44.asServiceRole.entities.CustomerSubscription.filter({ user_id: userId });
    subscription = subs?.[0] || null;
  } catch (e) {
    // If we can't read the subscription, fail closed
    return {
      allowed: false, reason: "Cannot resolve subscription",
      result_code: "denied_no_subscription", user_id: userId, feature_id: featureId,
      required_plan: feature.minimum_plan, actual_plan: "unknown",
      entitlement_field: feature.entitlement_field, entitlement_value: null,
    };
  }

  const actualPlan = subscription?.plan || "pay_as_you_go";
  const entValue = subscription?.[feature.entitlement_field];

  // Determine if allowed
  let allowed = false;
  let resultCode = "denied";
  let reason = "";

  if (!subscription) {
    allowed = false;
    resultCode = "denied_no_subscription";
    reason = "No active subscription found";
  } else if (subscription.status === "cancelled" || subscription.status === "past_due") {
    allowed = false;
    resultCode = "denied_no_subscription";
    reason = `Subscription status is ${subscription.status}`;
  } else if (feature.entitlement_field.startsWith("max_") || feature.entitlement_field === "workflow_limit") {
    // Hard quantitative limit (agents, phone numbers, workflows) — PAYG gets 0, correctly denied
    const limit = entValue || 0;
    if (limit > 0) {
      allowed = true;
      resultCode = "allowed";
      reason = "Within entitlement limit";
    } else {
      allowed = false;
      resultCode = "denied_plan_too_low";
      reason = `Plan ${actualPlan} does not include ${feature.description}`;
    }
  } else if (feature.entitlement_field.startsWith("monthly_")) {
    // Usage allowance (SMS, AI voice, email) — PAYG users are ALLOWED (pay per use via meterUsage)
    // Plan users are allowed if their included allowance > 0
    if (actualPlan === "pay_as_you_go") {
      allowed = true;
      resultCode = "allowed";
      reason = "PAYG: pay per use";
    } else {
      const limit = entValue || 0;
      if (limit > 0) {
        allowed = true;
        resultCode = "allowed";
        reason = "Within entitlement limit";
      } else {
        allowed = false;
        resultCode = "denied_plan_too_low";
        reason = `Plan ${actualPlan} does not include ${feature.description}`;
      }
    }
  } else {
    // Boolean entitlement — check if true
    if (entValue === true) {
      allowed = true;
      resultCode = "allowed";
      reason = "Entitlement granted";
    } else {
      allowed = false;
      resultCode = "denied_entitlement_false";
      reason = `Plan ${actualPlan} does not include ${feature.description}`;
    }
  }

  const result: EntitlementCheckResult = {
    allowed,
    reason,
    result_code: resultCode,
    user_id: userId,
    feature_id: featureId,
    required_plan: feature.minimum_plan,
    actual_plan: actualPlan,
    entitlement_field: feature.entitlement_field,
    entitlement_value: entValue,
    subscription_id: subscription?.id,
  };

  // Log the check for audit trail (unless explicitly skipped for performance)
  if (!options?.skipLog) {
    try {
      await base44.asServiceRole.entities.EntitlementCheck.create({
        check_id: `chk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        user_id: userId,
        tenant_id: subscription?.tenant_id || null,
        feature_id: featureId,
        required_plan: feature.minimum_plan,
        actual_plan: actualPlan,
        entitlement_field: feature.entitlement_field,
        entitlement_value: String(entValue ?? null),
        requested_action: options?.requestedAction || feature.description,
        result: resultCode,
        enforcement_point: "backend_function",
        function_name: options?.functionName || "unknown",
        is_hostile_test: options?.isHostileTest || false,
        checked_at: new Date().toISOString(),
      });
    } catch (_) {
      // Logging is best-effort — don't block the entitlement check on a log failure
    }
  }

  return result;
}

// ── CHECK QUANTITATIVE LIMIT ──────────────────────────────────────
// For features like max_agents, max_phone_numbers — checks current count against limit.
export async function checkQuantitativeLimit(
  base44: any,
  userId: string,
  featureId: string,
  currentCount: number,
  options?: { requestedAction?: string; functionName?: string },
): Promise<EntitlementCheckResult> {
  const baseCheck = await checkEntitlement(base44, userId, featureId, options);
  if (!baseCheck.allowed) return baseCheck;

  // Check the actual count against the limit
  const limit = baseCheck.entitlement_value || 0;
  if (currentCount >= limit) {
    return {
      ...baseCheck,
      allowed: false,
      reason: `Limit reached: ${currentCount}/${limit}`,
      result_code: "denied_limit_exceeded",
    };
  }
  return baseCheck;
}

// ── GET ALL ENTITLEMENTS FOR A USER ────────────────────────────────
// Returns the full entitlement snapshot for a user — used by frontend for gating.
export async function getUserEntitlements(base44: any, userId: string): Promise<{
  plan: string;
  status: string;
  entitlements: Record<string, any>;
} | null> {
  try {
    const subs = await base44.asServiceRole.entities.CustomerSubscription.filter({ user_id: userId });
    const sub = subs?.[0];
    if (!sub) return null;
    return {
      plan: sub.plan,
      status: sub.status,
      entitlements: {
        max_agents: sub.max_agents,
        max_phone_numbers: sub.max_phone_numbers,
        monthly_sms_allowance: sub.monthly_sms_allowance,
        monthly_ai_voice_minutes: sub.monthly_ai_voice_minutes,
        monthly_email_allowance: sub.monthly_email_allowance,
        workflow_limit: sub.workflow_limit,
        has_crm: sub.has_crm,
        has_breeze_copilot: sub.has_breeze_copilot,
        has_whatsapp: sub.has_whatsapp,
        has_call_recording: sub.has_call_recording,
        has_lead_scraper: sub.has_lead_scraper,
        has_api_access: sub.has_api_access,
        has_white_label: sub.has_white_label,
        has_multi_tenant: sub.has_multi_tenant,
        has_sso: sub.has_sso,
        sla_tier: sub.sla_tier,
        support_tier: sub.support_tier,
      },
    };
  } catch (_) {
    return null;
  }
}