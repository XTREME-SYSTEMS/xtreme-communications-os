import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * INDEPENDENT VALIDATOR
 *
 * This function is deliberately separate from forensicAudit (the builder).
 * It independently verifies the VERIFIED_100 claim by checking raw runtime
 * evidence — not by trusting the builder's output.
 *
 * Authority: T0 (read-only observation)
 * Validator != Builder
 */

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const systemId = body.system_id || 'xtreme-comms';

    // ── 1. Independently verify provider routes exist ──
    const routes = await base44.asServiceRole.entities.ProviderRoute.list();
    const activeRoutes = routes.filter(r => r.enabled);
    const channelsCovered = new Set(activeRoutes.map(r => r.channel));

    // ── 2. Independently verify mandatory benchmarks pass ──
    const benchmarks = await base44.asServiceRole.entities.BenchmarkResult.filter({
      system_id: systemId
    });

    const mandatory = benchmarks.filter(b => b.mandatory);
    const mandatoryPass = mandatory.filter(b => b.status === 'pass');
    const mandatoryFail = mandatory.filter(b => b.status === 'fail');
    const mandatoryUnknown = mandatory.filter(b => b.status === 'unknown');

    // ── 3. Independently verify proof receipts exist ──
    const receipts = await base44.asServiceRole.entities.ProofReceipt.filter({
      system_id: systemId,
      status: 'pass'
    });

    // ── 4. Independently verify system state ──
    const systems = await base44.asServiceRole.entities.XtremeSystem.filter({
      system_id: systemId
    });
    const system = systems[0];

    // ── 5. Check for open P0/P1 repairs ──
    const openRepairs = await base44.asServiceRole.entities.RepairPacket.filter({
      system_id: systemId
    });
    const p0Open = openRepairs.filter(r =>
      r.priority === 'p0' && ['pending', 'in_progress', 'failed', 'blocked'].includes(r.status)
    );
    const p1Open = openRepairs.filter(r =>
      r.priority === 'p1' && ['pending', 'in_progress', 'failed', 'blocked'].includes(r.status)
    );

    // ── 6. Check comms event data quality ──
    const recentEvents = await base44.asServiceRole.entities.CommsEvent.list('-created_date', 100);
    const nullAddrEvents = recentEvents.filter(e => !e.to_addr || !e.from_addr);
    const failedEvents = recentEvents.filter(e => e.status === 'failed');

    // ── INDEPENDENT VERDICT ──
    const mandatoryScore = mandatory.length > 0
      ? Math.round((mandatoryPass.length / mandatory.length) * 100)
      : 0;

    const allMandatoryPass = mandatoryFail.length === 0 && mandatoryUnknown.length === 0;
    const noOpenP0P1 = p0Open.length === 0 && p1Open.length === 0;
    const hasProofReceipt = receipts.length > 0;
    const routesExist = activeRoutes.length >= 7; // sms, mms, voice, sip, whatsapp, verify, lookup

    // Data quality penalty
    const dataQualityIssue = nullAddrEvents.length / Math.max(recentEvents.length, 1) > 0.1;

    // Independent verdict — does NOT trust the builder's score
    const independentScore = allMandatoryPass && noOpenP0P1 && routesExist
      ? 100
      : allMandatoryPass && noOpenP0P1
        ? 95
        : mandatoryScore;

    const verified = independentScore === 100 && hasProofReceipt && !dataQualityIssue;

    return Response.json({
      validator: 'independentValidator',
      validator_version: '1.0.0',
      timestamp: new Date().toISOString(),
      system_id: systemId,

      // Independent findings (not trusting builder)
      independent_score: independentScore,
      verified: verified,

      // Raw evidence
      mandatory_total: mandatory.length,
      mandatory_pass: mandatoryPass.length,
      mandatory_fail: mandatoryFail.length,
      mandatory_unknown: mandatoryUnknown.length,
      active_routes: activeRoutes.length,
      channels_covered: Array.from(channelsCovered),
      proof_receipts: receipts.length,
      open_p0: p0Open.length,
      open_p1: p1Open.length,

      // Data quality
      recent_events: recentEvents.length,
      events_with_null_address: nullAddrEvents.length,
      failed_events: failedEvents.length,
      data_quality_penalty: dataQualityIssue,

      // System state
      system_verified_score: system?.verified_score,
      system_lifecycle: system?.lifecycle_mode,
      system_consecutive_passes: system?.consecutive_passes || 0,

      // Discrepancy check
      builder_score: system?.verified_score,
      validator_score: independentScore,
      discrepancy: system?.verified_score !== independentScore,

      verdict: verified
        ? 'VERIFIED_100_INDEPENDENTLY_CONFIRMED'
        : dataQualityIssue
          ? 'VERIFIED_100_WITH_DATA_QUALITY_PENALTY'
          : 'NOT_VERIFIED',
    });
  } catch (error) {
    return Response.json(
      { error: error.message, validator: 'independentValidator' },
      { status: 500 }
    );
  }
}