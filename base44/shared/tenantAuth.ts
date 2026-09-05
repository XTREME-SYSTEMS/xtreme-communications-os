import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Shared API-key + tenant validation for wholesale gateway controllers.
// Returns { base44, tenant, key } on success, or { error: Response } on failure.
export async function authenticateTenant(req, body = {}) {
  const base44 = createClientFromRequest(req);
  const apiKey = body.api_key || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!apiKey) return { error: Response.json({ error: "api_key required" }, { status: 401 }) };

  const keys = await base44.asServiceRole.entities.ApiKey.filter({ key_value: apiKey, status: "active" });
  if (!keys.length) return { error: Response.json({ error: "invalid api key" }, { status: 403 }) };
  const key = keys[0];

  const tenant = await base44.asServiceRole.entities.Tenant.get(key.tenant_id);
  if (!tenant || tenant.status !== "active") return { error: Response.json({ error: "tenant not active" }, { status: 403 }) };

  return { base44, tenant, key };
}

// Simple dot-path getter for condition evaluation against trigger payloads.
export function getPath(obj, path) {
  if (!path || typeof path !== "string") return undefined;
  return path.split(".").reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);
}

// Evaluate a condition config { field, operator, value } against a payload.
export function evaluateCondition(condition, payload) {
  if (!condition || !condition.field) return true;
  const actual = getPath(payload, condition.field);
  const expected = condition.value;
  switch (condition.operator) {
    case "equals": return actual === expected;
    case "not_equals": return actual !== expected;
    case "contains": return typeof actual === "string" && actual.includes(String(expected));
    case "starts_with": return typeof actual === "string" && actual.startsWith(String(expected));
    case "exists": return actual !== undefined && actual !== null;
    case "gte": return Number(actual) >= Number(expected);
    case "lte": return Number(actual) <= Number(expected);
    default: return true;
  }
}