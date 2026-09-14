// ─── Entitlement Enforcement Test Suite ──────────────────────────
// Hostile tests: attempts to use higher-plan functionality from lower-plan accounts.
// Expected: DENIED for every attempt that exceeds the account's entitlements.
// This proves server-side enforcement — not just hidden UI buttons.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { checkEntitlement, checkQuantitativeLimit, FEATURE_REGISTRY } from '../../shared/entitlementEnforcement.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
    try { body = await req.json(); } catch (_) {}

    const action = body.action || "run_all";

    // ── RUN ALL HOSTILE TESTS ──
    if (action === "run_all") {
      const results: any[] = [];

      // We need test users at each plan tier. Since all 48 existing users are pay_as_you_go,
      // we test against a synthetic PAYG user (no subscription) and verify denial.
      // In production, this would test real users at each tier.

      const testUserId = body.user_id || "test_hostile_user";
      const isHostileTest = true;
      const functionName = "entitlementTestSuite";

      // Test every feature in the registry
      for (const feature of FEATURE_REGISTRY) {
        const check = await checkEntitlement(base44, testUserId, feature.feature_id, {
          requestedAction: `Hostile test: attempt to use ${feature.description}`,
          functionName,
          isHostileTest,
        });
        results.push({
          feature_id: feature.feature_id,
          minimum_plan: feature.minimum_plan,
          entitlement_field: feature.entitlement_field,
          allowed: check.allowed,
          result_code: check.result_code,
          reason: check.reason,
          actual_plan: check.actual_plan,
          expected: "denied", // PAYG user should be denied all plan features
          pass: !check.allowed, // Test passes if access was DENIED
        });
      }

      // ── QUANTITATIVE LIMIT TESTS ──
      // Attempt to exceed max_agents, max_phone_numbers on a PAYG account
      const quantTests = [
        { feature_id: "max_agents", currentCount: 1, expected: "denied" },
        { feature_id: "max_phone_numbers", currentCount: 1, expected: "denied" },
        { feature_id: "workflow_limit", currentCount: 1, expected: "denied" },
      ];
      for (const qt of quantTests) {
        const check = await checkQuantitativeLimit(base44, testUserId, qt.feature_id, qt.currentCount, {
          requestedAction: `Hostile test: attempt to exceed ${qt.feature_id}`,
          functionName,
          isHostileTest,
        });
        results.push({
          feature_id: qt.feature_id,
          test_type: "quantitative_limit",
          current_count: qt.currentCount,
          allowed: check.allowed,
          result_code: check.result_code,
          reason: check.reason,
          expected: qt.expected,
          pass: !check.allowed,
        });
      }

      // ── SUMMARY ──
      const passed = results.filter(r => r.pass).length;
      const failed = results.filter(r => !r.pass).length;
      const denied = results.filter(r => r.result_code?.startsWith("denied")).length;
      const allowed = results.filter(r => r.allowed).length;

      return Response.json({
        action: "run_all",
        test_user_id: testUserId,
        total_tests: results.length,
        passed, failed,
        denied_count: denied,
        allowed_count: allowed,
        all_denied: allowed === 0,
        results: results,
      });
    }

    // ── TEST SINGLE FEATURE ──
    if (action === "test_feature") {
      const { feature_id, user_id } = body;
      if (!feature_id) return Response.json({ error: "feature_id required" }, { status: 400 });
      const check = await checkEntitlement(base44, user_id || "test_user", feature_id, {
        requestedAction: `Single feature test: ${feature_id}`,
        functionName: "entitlementTestSuite",
        isHostileTest: true,
      });
      return Response.json({
        action: "test_feature",
        feature_id,
        ...check,
        pass: !check.allowed,
      });
    }

    // ── TEST WITH SIMULATED PLAN ──
    // Creates a temporary subscription to test that higher plans ARE allowed.
    if (action === "test_plan_access") {
      const { plan_slug, user_id } = body;
      if (!plan_slug) return Response.json({ error: "plan_slug required" }, { status: 400 });

      // Create a temporary subscription for the test user
      const tempSub = await base44.asServiceRole.entities.CustomerSubscription.create({
        user_id: user_id || "test_plan_user",
        plan: plan_slug,
        status: "active",
        started_at: new Date().toISOString(),
        max_agents: 10, max_phone_numbers: 10,
        monthly_sms_allowance: 10000, monthly_ai_voice_minutes: 2000,
        monthly_email_allowance: 100000, workflow_limit: 75,
        has_crm: true, has_breeze_copilot: true, has_whatsapp: true,
        has_call_recording: true, has_lead_scraper: true, has_api_access: true,
      });

      const results: any[] = [];
      for (const feature of FEATURE_REGISTRY) {
        const check = await checkEntitlement(base44, user_id || "test_plan_user", feature.feature_id, {
          requestedAction: `Plan access test: ${feature.feature_id} on ${plan_slug}`,
          functionName: "entitlementTestSuite",
          isHostileTest: false,
        });
        results.push({
          feature_id: feature.feature_id,
          minimum_plan: feature.minimum_plan,
          allowed: check.allowed,
          result_code: check.result_code,
          pass: check.allowed,
        });
      }

      // Clean up the temporary subscription
      await base44.asServiceRole.entities.CustomerSubscription.delete(tempSub.id);

      const allowed = results.filter(r => r.allowed).length;
      const denied = results.filter(r => !r.allowed).length;

      return Response.json({
        action: "test_plan_access",
        plan_slug,
        total_features: results.length,
        allowed_count: allowed,
        denied_count: denied,
        results: results,
      });
    }

    return Response.json({ error: "unknown action", action }, { status: 400 });
  } catch (error: any) {
    console.error("entitlementTestSuite error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}