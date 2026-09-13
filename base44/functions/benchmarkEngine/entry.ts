import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
    try { body = await req.json(); } catch (_) {}

    const action = body.action;

    // ── RUN BENCHMARKS: execute benchmark suite for a system ──
    if (action === 'run_benchmarks') {
      const { system_id } = body;
      if (!system_id) return Response.json({ error: 'system_id required' }, { status: 400 });

      const systems = await base44.asServiceRole.entities.XtremeSystem.filter({ system_id }).catch(() => []);
      const system = systems[0];
      if (!system) return Response.json({ error: 'system not found' }, { status: 404 });

      // Universal core benchmarks — always run
      const universalBenchmarks = [
        { benchmark_id: 'universal.architecture', test_name: 'Architecture document exists', expected: 'SYSTEM_ARCHITECTURE.md or manifest present', severity: 'p2' },
        { benchmark_id: 'universal.build', test_name: 'Build succeeds', expected: 'No build errors', severity: 'p0' },
        { benchmark_id: 'universal.tests', test_name: 'Test suite passes', expected: 'All tests pass', severity: 'p1' },
        { benchmark_id: 'universal.security', test_name: 'No critical security vulnerabilities', expected: 'Zero P0 security findings', severity: 'p0' },
        { benchmark_id: 'universal.auth', test_name: 'Authorization enforced', expected: 'Protected routes require auth', severity: 'p0' },
        { benchmark_id: 'universal.data_integrity', test_name: 'Data integrity checks pass', expected: 'No data corruption', severity: 'p0' },
        { benchmark_id: 'universal.observability', test_name: 'Observability configured', expected: 'Logs and metrics available', severity: 'p2' },
        { benchmark_id: 'universal.performance', test_name: 'Performance within thresholds', expected: 'API < 500ms, pages < 3s', severity: 'p1' },
        { benchmark_id: 'universal.accessibility', test_name: 'Accessibility WCAG 2.1 AA', expected: 'No critical a11y violations', severity: 'p1' },
        { benchmark_id: 'universal.source_parity', test_name: 'Source parity with production', expected: 'Git HEAD = deployed version', severity: 'p1' },
        { benchmark_id: 'universal.deployment_parity', test_name: 'Deployment matches source', expected: 'Preview = production config', severity: 'p1' },
        { benchmark_id: 'universal.rollback', test_name: 'Rollback plan exists', expected: 'Rollback procedure documented', severity: 'p2' },
        { benchmark_id: 'universal.documentation', test_name: 'Documentation exists', expected: 'README + API docs present', severity: 'p2' },
      ];

      // System-type-specific benchmarks
      const typeBenchmarks: Record<string, any[]> = {
        communications: [
          { benchmark_id: 'comm.sms_delivery', test_name: 'SMS delivery works', expected: 'SMS sends and receives', severity: 'p0' },
          { benchmark_id: 'comm.voice_calls', test_name: 'Voice calls connect', expected: 'Call connects < 5s', severity: 'p0' },
          { benchmark_id: 'comm.whatsapp', test_name: 'WhatsApp messaging works', expected: 'Messages send/receive', severity: 'p1' },
          { benchmark_id: 'compliance.opt_in', test_name: 'SMS opt-in compliance', expected: 'Opt-in flow documented', severity: 'p0' },
        ],
        saas: [
          { benchmark_id: 'saas.auth_flow', test_name: 'Auth flow complete', expected: 'Login + register + reset work', severity: 'p0' },
          { benchmark_id: 'saas.billing', test_name: 'Billing integration works', expected: 'Checkout + webhook work', severity: 'p0' },
        ],
        website: [
          { benchmark_id: 'web.seo_meta', test_name: 'SEO meta tags present', expected: 'Title + description + OG tags', severity: 'p1' },
          { benchmark_id: 'web.mobile', test_name: 'Mobile responsive', expected: 'No layout breaks at 375px', severity: 'p1' },
        ],
      };

      const allBenchmarks = [
        ...universalBenchmarks,
        ...(typeBenchmarks[system.system_type] || []),
      ];

      // Run each benchmark and store results
      const results: any[] = [];
      let passCount = 0;
      let failCount = 0;
      let p0Failures = 0;
      let p1Failures = 0;
      let mandatoryTotal = 0;
      let mandatoryPass = 0;

      for (const bench of allBenchmarks) {
        // For now, benchmarks are scored as "unknown" until actual test runners are connected
        // The framework is in place — actual test execution plugs in here
        const status = 'unknown';
        const isMandatory = bench.severity === 'p0' || bench.severity === 'p1';

        const result = await base44.asServiceRole.entities.BenchmarkResult.create({
          system_id,
          benchmark_id: bench.benchmark_id,
          benchmark_version: '1.0',
          category: bench.benchmark_id.startsWith('universal') ? 'universal_core' : 'system_type',
          test_name: bench.test_name,
          expected: bench.expected,
          observed: 'Not yet executed — benchmark framework initialized',
          status,
          severity: bench.severity,
          mandatory: isMandatory,
          score: 0,
          environment: 'production',
          validator: 'benchmarkEngine',
          validated_at: new Date().toISOString(),
        });

        results.push({
          benchmark_id: bench.benchmark_id,
          test_name: bench.test_name,
          status,
          severity: bench.severity,
          mandatory: isMandatory,
        });

        if (isMandatory) mandatoryTotal++;
      }

      // Calculate distance-to-100
      // VERIFIED_100 requires: 100% mandatory pass, zero P0, zero P1, source parity, deployment parity
      const verifiedScore = mandatoryTotal > 0 ? Math.round((mandatoryPass / mandatoryTotal) * 100) : 0;
      const distanceTo100 = 100 - verifiedScore;

      // Update system
      await base44.asServiceRole.entities.XtremeSystem.update(system.id, {
        verified_score: verifiedScore,
        distance_to_100: distanceTo100,
        p0_count: p0Failures,
        p1_count: p1Failures,
        last_benchmark_at: new Date().toISOString(),
        lifecycle_mode: verifiedScore === 100 ? 'preservation' : 'completion_sprint',
        consecutive_passes: verifiedScore === 100 ? (system.consecutive_passes || 0) + 1 : 0,
      });

      return Response.json({
        action: 'run_benchmarks',
        system_id,
        benchmarks_run: results.length,
        results,
        verified_score: verifiedScore,
        distance_to_100: distanceTo100,
        p0_failures: p0Failures,
        p1_failures: p1Failures,
        mandatory_total: mandatoryTotal,
        mandatory_pass: mandatoryPass,
      });
    }

    // ── SCORE SYSTEM: calculate distance-to-100 from existing results ──
    if (action === 'score_system') {
      const { system_id } = body;
      if (!system_id) return Response.json({ error: 'system_id required' }, { status: 400 });

      const benchmarks = await base44.asServiceRole.entities.BenchmarkResult.filter({ system_id }).catch(() => []);
      const mandatory = benchmarks.filter((b: any) => b.mandatory);
      const mandatoryPass = mandatory.filter((b: any) => b.status === 'pass');
      const p0Fails = benchmarks.filter((b: any) => b.severity === 'p0' && b.status === 'fail');
      const p1Fails = benchmarks.filter((b: any) => b.severity === 'p1' && b.status === 'fail');

      // Hard failures block regardless of score
      const blocked = p0Fails.length > 0;
      const score = mandatory.length > 0
        ? Math.round((mandatoryPass.length / mandatory.length) * 100)
        : 0;

      return Response.json({
        action: 'score_system',
        system_id,
        total_benchmarks: benchmarks.length,
        mandatory_total: mandatory.length,
        mandatory_pass: mandatoryPass.length,
        p0_failures: p0Fails.length,
        p1_failures: p1Fails.length,
        verified_score: score,
        distance_to_100: 100 - score,
        release_blocked: blocked,
        block_reasons: blocked ? p0Fails.map((f: any) => f.benchmark_id) : [],
      });
    }

    return Response.json({ error: 'unknown action', action }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}