// ─── Entitlement Auth Helper ──────────────────────────────────────
// Resolves user_id from either user session auth or API key auth,
// then checks the specified entitlement. Returns a structured result
// that backend functions can use to enforce entitlements server-side.
//
// Usage in a backend function:
//   import { resolveAndCheck } from '../../shared/entitlementAuth.ts';
//   const auth = await resolveAndCheck(base44, req, body, 'has_lead_scraper', {
//     functionName: 'scrapeLeads',
//     requestedAction: 'Scrape business leads',
//   });
//   if ('error' in auth) return Response.json({ error: auth.error }, { status: auth.status });
//   // auth.userId, auth.tenant, auth.check are available

import { checkEntitlement, EntitlementCheckResult } from './entitlementEnforcement.ts';

export interface AuthResolveSuccess {
  userId: string;
  tenant: any | null;
  check: EntitlementCheckResult;
}

export interface AuthResolveFailure {
  error: string;
  status: number;
}

// Resolves user_id from user session or API key, then checks entitlement.
// Returns either a success object with userId/tenant/check, or an error object.
export async function resolveAndCheck(
  base44: any,
  req: Request,
  body: any,
  featureId: string,
  options?: { requestedAction?: string; functionName?: string; isHostileTest?: boolean },
): Promise<AuthResolveSuccess | AuthResolveFailure> {
  let userId: string | null = null;
  let tenant: any | null = null;

  // ── Try user session auth first (portal calls) ──
  try {
    const user = await base44.auth.me();
    if (user?.id) {
      userId = user.id;
    }
  } catch (_) {
    // No user session — fall through to API key auth
  }

  // ── If no user session, try API key auth (API calls) ──
  if (!userId) {
    const apiKey = body.api_key || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!apiKey) {
      return { error: "Authentication required", status: 401 };
    }
    try {
      const keys = await base44.asServiceRole.entities.ApiKey.filter({ key_value: apiKey, status: "active" });
      if (!keys.length) {
        return { error: "Invalid API key", status: 403 };
      }
      tenant = await base44.asServiceRole.entities.Tenant.get(keys[0].tenant_id);
      // Use built-in created_by_id as the user_id (owner of the tenant)
      userId = tenant?.created_by_id || null;
      if (!userId) {
        return { error: "Cannot resolve user from API key", status: 403 };
      }
    } catch (e: any) {
      return { error: `Auth resolution failed: ${e.message}`, status: 500 };
    }
  }

  // ── Check the entitlement ──
  const check = await checkEntitlement(base44, userId, featureId, {
    requestedAction: options?.requestedAction,
    functionName: options?.functionName,
    isHostileTest: options?.isHostileTest,
  });

  if (!check.allowed) {
    return { error: check.reason, status: 403 };
  }

  return { userId, tenant, check };
}

// Resolves user_id only (no entitlement check) — for functions that need
// auth but don't have a specific entitlement to check.
export async function resolveUserId(
  base44: any,
  req: Request,
  body: any,
): Promise<{ userId: string; tenant: any | null } | AuthResolveFailure> {
  let userId: string | null = null;
  let tenant: any | null = null;

  try {
    const user = await base44.auth.me();
    if (user?.id) userId = user.id;
  } catch (_) {}

  if (!userId) {
    const apiKey = body.api_key || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!apiKey) return { error: "Authentication required", status: 401 };
    try {
      const keys = await base44.asServiceRole.entities.ApiKey.filter({ key_value: apiKey, status: "active" });
      if (!keys.length) return { error: "Invalid API key", status: 403 };
      tenant = await base44.asServiceRole.entities.Tenant.get(keys[0].tenant_id);
      userId = tenant?.created_by_id || null;
      if (!userId) return { error: "Cannot resolve user from API key", status: 403 };
    } catch (e: any) {
      return { error: `Auth resolution failed: ${e.message}`, status: 500 };
    }
  }

  return { userId, tenant };
}