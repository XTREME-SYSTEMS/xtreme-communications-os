import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
    try { body = await req.json(); } catch (_) {}

    const action = body.action;

    // ── FORENSIC AUDIT: independently validate every capability claim ──
    if (action === 'forensic_audit') {
      const { system_id } = body;
      if (!system_id) return Response.json({ error: 'system_id required' }, { status: 400 });

      // Gather all evidence sources
      const [
        capabilities, existingBenchmarks, testResults, proofReceipts,
        commsEvents, conversations, phoneNumbers, providers, providerRoutes,
        apiKeys, tenants, sipTrunks, webhookEvents, webhookDeliveries,
        agentPersonas, campaigns, usageMeters, billingAccounts, invoices,
        verifications, lookups, mediaAttachments, speechTranscripts, aiVoiceSessions,
        carrierRouteMetrics, auditFindings, providerLogs, workflowExecLogs,
        customerSubs, base44Purchases, routingQueues, taskAssignments,
        conversationMemory, systemMemories
      ] = await Promise.all([
        base44.asServiceRole.entities.Capability.list('-created_date', 200).catch(() => []),
        base44.asServiceRole.entities.BenchmarkResult.filter({ system_id }).catch(() => []),
        base44.asServiceRole.entities.TestResult.list('-created_date', 100).catch(() => []),
        base44.asServiceRole.entities.ProofReceipt.list('-created_date', 100).catch(() => []),
        base44.asServiceRole.entities.CommsEvent.list('-created_date', 100).catch(() => []),
        base44.asServiceRole.entities.Conversation.list('-created_date', 50).catch(() => []),
        base44.asServiceRole.entities.PhoneNumber.list('-created_date', 100).catch(() => []),
        base44.asServiceRole.entities.Provider.list('-created_date', 50).catch(() => []),
        base44.asServiceRole.entities.ProviderRoute.list('-created_date', 50).catch(() => []),
        base44.asServiceRole.entities.ApiKey.list('-created_date', 50).catch(() => []),
        base44.asServiceRole.entities.Tenant.list('-created_date', 50).catch(() => []),
        base44.asServiceRole.entities.SipTrunk.list('-created_date', 50).catch(() => []),
        base44.asServiceRole.entities.WebhookEvent.list('-created_date', 100).catch(() => []),
        base44.asServiceRole.entities.WebhookDelivery.list('-created_date', 50).catch(() => []),
        base44.asServiceRole.entities.AgentPersona.list('-created_date', 100).catch(() => []),
        base44.asServiceRole.entities.Campaign.list('-created_date', 50).catch(() => []),
        base44.asServiceRole.entities.UsageMeter.list('-created_date', 50).catch(() => []),
        base44.asServiceRole.entities.BillingAccount.list('-created_date', 50).catch(() => []),
        base44.asServiceRole.entities.Invoice.list('-created_date', 50).catch(() => []),
        base44.asServiceRole.entities.Verification.list('-created_date', 50).catch(() => []),
        base44.asServiceRole.entities.LookupResult.list('-created_date', 50).catch(() => []),
        base44.asServiceRole.entities.MediaAttachment.list('-created_date', 50).catch(() => []),
        base44.asServiceRole.entities.SpeechTranscript.list('-created_date', 50).catch(() => []),
        base44.asServiceRole.entities.AiVoiceSession.list('-created_date', 50).catch(() => []),
        base44.asServiceRole.entities.CarrierRouteMetrics.list('-created_date', 50).catch(() => []),
        base44.asServiceRole.entities.AuditFinding.list('-created_date', 50).catch(() => []),
        base44.asServiceRole.entities.ProviderLog.list('-created_date', 50).catch(() => []),
        base44.asServiceRole.entities.WorkflowExecutionLog.list('-created_date', 50).catch(() => []),
        base44.asServiceRole.entities.CustomerSubscription.list('-created_date', 50).catch(() => []),
        base44.asServiceRole.entities.Base44Purchase.list('-created_date', 50).catch(() => []),
        base44.asServiceRole.entities.RoutingQueue.list('-created_date', 50).catch(() => []),
        base44.asServiceRole.entities.TaskAssignment.list('-created_date', 50).catch(() => []),
        base44.asServiceRole.entities.ConversationMemory.list('-created_date', 50).catch(() => []),
        base44.asServiceRole.entities.SystemMemory.list('-created_date', 50).catch(() => []),
      ]);

      // Evidence scoring matrix
      const evidence: Record<string, any> = {
        sms: commsEvents.filter((e: any) => e.channel === 'sms').length,
        mms: commsEvents.filter((e: any) => e.channel === 'mms').length,
        voice: commsEvents.filter((e: any) => e.channel === 'voice').length,
        whatsapp: commsEvents.filter((e: any) => e.channel === 'whatsapp').length,
        email: commsEvents.filter((e: any) => e.channel === 'email').length,
        inbound: commsEvents.filter((e: any) => e.direction === 'inbound').length,
        outbound: commsEvents.filter((e: any) => e.direction === 'outbound').length,
        delivered: commsEvents.filter((e: any) => e.status === 'delivered' || e.status === 'completed').length,
        failed: commsEvents.filter((e: any) => e.status === 'failed').length,
        conversations: conversations.length,
        phoneNumbers: phoneNumbers.length,
        liveNumbers: phoneNumbers.filter((n: any) => n.classification === 'LIVE').length,
        providerBackedNumbers: phoneNumbers.filter((n: any) => n.classification === 'PROVIDER-BACKED').length,
        providers: providers.length,
        providerRoutes: providerRoutes.length,
        apiKeys: apiKeys.length,
        tenants: tenants.length,
        sipTrunks: sipTrunks.length,
        webhookEvents: webhookEvents.length,
        webhookDeliveries: webhookDeliveries.length,
        agentPersonas: agentPersonas.length,
        campaigns: campaigns.length,
        usageMeters: usageMeters.length,
        billingAccounts: billingAccounts.length,
        invoices: invoices.length,
        verifications: verifications.length,
        lookups: lookups.length,
        mediaAttachments: mediaAttachments.length,
        speechTranscripts: speechTranscripts.length,
        aiVoiceSessions: aiVoiceSessions.length,
        carrierRouteMetrics: carrierRouteMetrics.length,
        auditFindings: auditFindings.length,
        providerLogs: providerLogs.length,
        workflowExecLogs: workflowExecLogs.length,
        customerSubs: customerSubs.length,
        base44Purchases: base44Purchases.length,
        routingQueues: routingQueues.length,
        taskAssignments: taskAssignments.length,
        conversationMemory: conversationMemory.length,
        systemMemories: systemMemories.length,
        testResults: testResults.length,
        testPasses: testResults.filter((t: any) => t.status === 'pass' || t.passed === true).length,
        proofReceipts: proofReceipts.length,
        proofPasses: proofReceipts.filter((p: any) => p.status === 'pass').length,
      };

      // For each capability, determine honest status
      const auditResults: any[] = [];
      let p0Failures = 0;
      let p1Failures = 0;
      let mandatoryTotal = 0;
      let mandatoryPass = 0;

      for (const cap of capabilities) {
        const capName = (cap.name || '').toLowerCase();
        let status: 'pass' | 'fail' | 'unknown' = 'unknown';
        let observed = '';
        let severity = 'p2';
        let mandatory = false;

        // Determine evidence for each capability type
        // SMS/MMS/Voice/WhatsApp — need actual comms events as evidence
        if (capName.includes('sms') && !capName.includes('mms')) {
          severity = 'p0'; mandatory = true;
          if (evidence.sms > 0 && evidence.delivered > 0) {
            status = 'pass'; observed = `${evidence.sms} SMS events, ${evidence.delivered} delivered`;
          } else if (evidence.sms > 0) {
            status = 'unknown'; observed = `${evidence.sms} SMS events but 0 confirmed deliveries`;
          } else {
            status = 'fail'; observed = 'No SMS events found in runtime';
          }
        } else if (capName.includes('mms')) {
          severity = 'p1'; mandatory = true;
          if (evidence.mms > 0) { status = 'pass'; observed = `${evidence.mms} MMS events`; }
          else { status = 'unknown'; observed = 'No MMS events in runtime'; }
        } else if (capName.includes('voice') || capName.includes('call')) {
          severity = 'p0'; mandatory = true;
          if (evidence.voice > 0 || evidence.aiVoiceSessions > 0) {
            status = 'pass'; observed = `${evidence.voice} voice events, ${evidence.aiVoiceSessions} AI voice sessions`;
          } else { status = 'unknown'; observed = 'No voice events in runtime'; }
        } else if (capName.includes('whatsapp')) {
          severity = 'p1'; mandatory = true;
          if (evidence.whatsapp > 0) { status = 'pass'; observed = `${evidence.whatsapp} WhatsApp events`; }
          else { status = 'unknown'; observed = 'No WhatsApp events in runtime'; }
        }
        // Webhook — need webhook events with deliveries
        else if (capName.includes('webhook')) {
          severity = 'p0'; mandatory = true;
          if (evidence.webhookEvents > 0 && evidence.webhookDeliveries > 0) {
            status = 'pass'; observed = `${evidence.webhookEvents} webhook events, ${evidence.webhookDeliveries} deliveries`;
          } else if (evidence.webhookEvents > 0) {
            status = 'unknown'; observed = `${evidence.webhookEvents} events but delivery tracking unclear`;
          } else { status = 'fail'; observed = 'No webhook events in runtime'; }
        }
        // Phone numbers — need actual numbers
        else if (capName.includes('number') || capName.includes('phone')) {
          severity = 'p0'; mandatory = true;
          if (evidence.liveNumbers > 0) { status = 'pass'; observed = `${evidence.liveNumbers} LIVE numbers, ${evidence.phoneNumbers} total`; }
          else if (evidence.phoneNumbers > 0) { status = 'unknown'; observed = `${evidence.phoneNumbers} numbers but 0 LIVE`; }
          else { status = 'fail'; observed = 'No phone numbers provisioned'; }
        }
        // Provider — need connected providers
        else if (capName.includes('provider') || capName.includes('carrier')) {
          severity = 'p0'; mandatory = true;
          if (evidence.providers > 0) { status = 'pass'; observed = `${evidence.providers} provider(s) connected`; }
          else { status = 'fail'; observed = 'No providers connected'; }
        }
        // Multi-provider routing — need provider routes
        else if (capName.includes('routing') || capName.includes('failover')) {
          severity = 'p1'; mandatory = true;
          if (evidence.providerRoutes > 0) { status = 'pass'; observed = `${evidence.providerRoutes} routes`; }
          else { status = 'fail'; observed = 'No provider routes — single provider only'; }
        }
        // Tenant isolation — need tenants + RLS evidence
        else if (capName.includes('tenant') || capName.includes('isolation')) {
          severity = 'p0'; mandatory = true;
          if (evidence.tenants >= 2) { status = 'pass'; observed = `${evidence.tenants} tenants — isolation testable`; }
          else if (evidence.tenants === 1) { status = 'unknown'; observed = 'Only 1 tenant — isolation untestable'; }
          else { status = 'fail'; observed = 'No tenants'; }
        }
        // Billing — need billing accounts + invoices
        else if (capName.includes('billing') || capName.includes('usage') || capName.includes('meter')) {
          severity = 'p1'; mandatory = true;
          if (evidence.billingAccounts > 0 && evidence.usageMeters > 0) {
            status = 'pass'; observed = `${evidence.billingAccounts} billing accounts, ${evidence.usageMeters} meters`;
          } else { status = 'unknown'; observed = 'Billing infrastructure incomplete'; }
        }
        // Verification — need verification records
        else if (capName.includes('verify') || capName.includes('verification')) {
          severity = 'p1'; mandatory = true;
          if (evidence.verifications > 0) { status = 'pass'; observed = `${evidence.verifications} verifications`; }
          else { status = 'unknown'; observed = 'No verification records'; }
        }
        // Lookup — need lookup results
        else if (capName.includes('lookup')) {
          severity = 'p2'; mandatory = false;
          if (evidence.lookups > 0) { status = 'pass'; observed = `${evidence.lookups} lookups`; }
          else { status = 'unknown'; observed = 'No lookup records'; }
        }
        // Recording/transcription — need speech transcripts
        else if (capName.includes('recording') || capName.includes('transcri')) {
          severity = 'p1'; mandatory = true;
          if (evidence.speechTranscripts > 0) { status = 'pass'; observed = `${evidence.speechTranscripts} transcripts`; }
          else { status = 'unknown'; observed = 'No transcription records'; }
        }
        // AI Voice — need AI voice sessions
        else if (capName.includes('ai voice') || capName.includes('ai assistant')) {
          severity = 'p1'; mandatory = true;
          if (evidence.aiVoiceSessions > 0) { status = 'pass'; observed = `${evidence.aiVoiceSessions} AI voice sessions`; }
          else { status = 'unknown'; observed = 'No AI voice sessions'; }
        }
        // Conversation memory — need memory records
        else if (capName.includes('memory') || capName.includes('conversation')) {
          severity = 'p1'; mandatory = true;
          if (evidence.conversationMemory > 0 || evidence.systemMemories > 0) {
            status = 'pass'; observed = `${evidence.conversationMemory} conv memory, ${evidence.systemMemories} system memory`;
          } else { status = 'unknown'; observed = 'No conversation memory records'; }
        }
        // Campaigns — need campaign records
        else if (capName.includes('campaign')) {
          severity = 'p2'; mandatory = false;
          if (evidence.campaigns > 0) { status = 'pass'; observed = `${evidence.campaigns} campaigns`; }
          else { status = 'unknown'; observed = 'No campaigns'; }
        }
        // Agents — need agent personas
        else if (capName.includes('agent')) {
          severity = 'p1'; mandatory = true;
          if (evidence.agentPersonas > 0) { status = 'pass'; observed = `${evidence.agentPersonas} agents`; }
          else { status = 'fail'; observed = 'No agents provisioned'; }
        }
        // SIP — need SIP trunks
        else if (capName.includes('sip')) {
          severity = 'p1'; mandatory = true;
          if (evidence.sipTrunks > 0) { status = 'pass'; observed = `${evidence.sipTrunks} SIP trunks`; }
          else { status = 'unknown'; observed = 'No SIP trunks'; }
        }
        // API keys — need API key records
        else if (capName.includes('api key') || capName.includes('api auth')) {
          severity = 'p0'; mandatory = true;
          if (evidence.apiKeys > 0) { status = 'pass'; observed = `${evidence.apiKeys} API keys`; }
          else { status = 'fail'; observed = 'No API keys'; }
        }
        // RCS — check for RCS-specific evidence
        else if (capName.includes('rcs')) {
          severity = 'p2'; mandatory = false;
          const rcsEvents = commsEvents.filter((e: any) => e.channel === 'rcs').length;
          if (rcsEvents > 0) { status = 'pass'; observed = `${rcsEvents} RCS events`; }
          else { status = 'unknown'; observed = 'No RCS events — capability may be provider-backed only'; }
        }
        // Email — check for email events
        else if (capName.includes('email')) {
          severity = 'p1'; mandatory = true;
          if (evidence.email > 0) { status = 'pass'; observed = `${evidence.email} email events`; }
          else { status = 'unknown'; observed = 'No email events in runtime'; }
        }
        // Default — mark unknown if no self-reported "LIVE" evidence
        else {
          severity = 'p2'; mandatory = false;
          // If capability self-reports LIVE but we have no evidence, mark unknown
          if (cap.status === 'LIVE') {
            status = 'unknown'; observed = `Self-reported LIVE but no runtime evidence found`;
          } else {
            status = 'unknown'; observed = `Status: ${cap.status}`;
          }
        }

        if (mandatory) mandatoryTotal++;
        if (mandatory && status === 'pass') mandatoryPass++;
        if (status === 'fail' && severity === 'p0') p0Failures++;
        if (status === 'fail' && severity === 'p1') p1Failures++;

        auditResults.push({
          capability_id: cap.id,
          capability_name: cap.name,
          self_reported_status: cap.status,
          self_reported_coverage: cap.coverage_pct,
          audited_status: status,
          observed: observed,
          severity,
          mandatory,
        });
      }

      // Delete old benchmark results for this system and create new honest ones
      if (existingBenchmarks.length > 0) {
        await base44.asServiceRole.entities.BenchmarkResult.deleteMany({ system_id }).catch(() => {});
      }

      // Create new benchmark results
      for (const result of auditResults) {
        await base44.asServiceRole.entities.BenchmarkResult.create({
          system_id,
          benchmark_id: `forensic.${result.capability_name?.toLowerCase().replace(/\s+/g, '_').slice(0, 50)}`,
          benchmark_version: '2.0',
          category: 'system_specific',
          test_name: result.capability_name,
          expected: 'Runtime evidence proving capability works',
          observed: result.observed,
          status: result.audited_status,
          severity: result.severity,
          mandatory: result.mandatory,
          score: result.audited_status === 'pass' ? 100 : 0,
          evidence: `Self-reported: ${result.self_reported_status} (${result.self_reported_coverage}%). Audited: ${result.audited_status}`,
          environment: 'production',
          validator: 'forensicAudit',
          validated_at: new Date().toISOString(),
        });
      }

      // Calculate honest score
      const verifiedScore = mandatoryTotal > 0 ? Math.round((mandatoryPass / mandatoryTotal) * 100) : 0;
      const distanceTo100 = 100 - verifiedScore;

      // Update system
      const systems = await base44.asServiceRole.entities.XtremeSystem.filter({ system_id }).catch(() => []);
      if (systems[0]) {
        await base44.asServiceRole.entities.XtremeSystem.update(systems[0].id, {
          verified_score: verifiedScore,
          distance_to_100: distanceTo100,
          p0_count: p0Failures,
          p1_count: p1Failures,
          last_benchmark_at: new Date().toISOString(),
          lifecycle_mode: verifiedScore === 100 ? 'preservation' : 'completion_sprint',
          consecutive_passes: verifiedScore === 100 ? (systems[0].consecutive_passes || 0) + 1 : 0,
        });
      }

      // Create repair packets for P0/P1 failures
      const repairsCreated: any[] = [];
      for (const result of auditResults) {
        if ((result.audited_status === 'fail' || (result.audited_status === 'unknown' && result.mandatory)) && (result.severity === 'p0' || result.severity === 'p1')) {
          const repairId = `repair-${system_id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const repair = await base44.asServiceRole.entities.RepairPacket.create({
            repair_id: repairId,
            system_id,
            benchmark_id: `forensic.${result.capability_name?.toLowerCase().replace(/\s+/g, '_').slice(0, 50)}`,
            finding: `${result.capability_name} — ${result.audited_status === 'fail' ? 'FAILED' : 'NO EVIDENCE'}`,
            expected: 'Runtime evidence proving capability works',
            observed: result.observed,
            evidence: `Self-reported: ${result.self_reported_status} (${result.self_reported_coverage}%). Audited: ${result.audited_status}`,
            root_cause: result.audited_status === 'unknown' ? 'missing_evidence' : 'implementation',
            root_cause_detail: result.audited_status === 'unknown'
              ? 'Capability self-reports as live but no runtime evidence exists to prove it'
              : 'Capability is not implemented or not connected',
            proposed_fix: result.audited_status === 'unknown'
              ? 'Generate runtime evidence by executing the capability and recording proof'
              : 'Implement the capability and connect it to the provider abstraction',
            risk_level: result.severity === 'p0' ? 'high' : 'medium',
            rollback_plan: 'Revert to previous state — no production data affected',
            acceptance_test: `Execute ${result.capability_name} and produce a ProofReceipt with pass status`,
            regression_test: `Automated test that verifies ${result.capability_name} produces runtime evidence`,
            status: 'pending',
            priority: result.severity,
            created_at: new Date().toISOString(),
          });
          repairsCreated.push({
            repair_id: repairId,
            finding: repair.finding,
            priority: repair.priority,
            root_cause: repair.root_cause,
          });
        }
      }

      return Response.json({
        action: 'forensic_audit',
        system_id,
        capabilities_audited: auditResults.length,
        mandatory_total: mandatoryTotal,
        mandatory_pass: mandatoryPass,
        verified_score: verifiedScore,
        distance_to_100: distanceTo100,
        p0_failures: p0Failures,
        p1_failures: p1Failures,
        repairs_created: repairsCreated.length,
        repair_summary: repairsCreated.slice(0, 10),
        evidence_summary: {
          total_comms_events: evidence.sms + evidence.mms + evidence.voice + evidence.whatsapp + evidence.email,
          delivered: evidence.delivered,
          failed: evidence.failed,
          test_results: evidence.testResults,
          test_passes: evidence.testPasses,
          proof_receipts: evidence.proofReceipts,
          proof_passes: evidence.proofPasses,
        },
        status_breakdown: {
          pass: auditResults.filter(r => r.audited_status === 'pass').length,
          fail: auditResults.filter(r => r.audited_status === 'fail').length,
          unknown: auditResults.filter(r => r.audited_status === 'unknown').length,
        },
      });
    }

    return Response.json({ error: 'unknown action', action }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}