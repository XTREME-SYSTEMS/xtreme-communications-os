import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// ─── SUPER AGENT PROVISIONER ───────────────────────────────────────
// Creates and deploys agents of any tier: standard, super, swarm,
// fulfillment, shadow. Handles phone number assignment, capability
// activation, swarm linking, and API credential storage.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body: any = {};
    try { body = await req.json(); } catch (_) {}

    const action = body.action || 'provision';

    // ── PROVISION: Create or update an agent ──
    if (action === 'provision') {
      const { name, agent_tier, persona_type, system_prompt, tone, personality_traits,
              assigned_number, target_industry, capabilities, shadow_mode,
              swarm_id, swarm_role, swarm_members, swarm_coordinator_id,
              fulfillment_config, api_credentials, api_endpoints,
              power_level, autonomy_level, assigned_context } = body;

      if (!name) return Response.json({ error: 'name required' }, { status: 400 });

      // Map tier to persona_type if not provided
      const tierToType = {
        standard: persona_type || 'voice',
        super: 'super',
        swarm: swarm_role === 'coordinator' ? 'swarm_coordinator' : 'swarm_worker',
        fulfillment: 'fulfillment',
        shadow: 'shadow',
      };
      const finalPersonaType = persona_type || tierToType[agent_tier] || 'voice';

      // Default capabilities per tier
      const tierDefaults: any = {
        standard: ['sms'],
        super: ['sms', 'mms', 'voice', 'whatsapp', 'cloud_browser', 'web_interact', 'api_access'],
        swarm: ['sms', 'voice', 'cloud_browser', 'web_interact'],
        fulfillment: ['sms', 'mms', 'voice', 'cloud_browser', 'phone_browser', 'web_interact', 'api_access', 'cross_site_automation'],
        shadow: ['sms', 'voice', 'cloud_browser', 'web_interact', 'api_access', 'cross_site_automation', 'shadow_mode'],
      };
      const finalCapabilities = capabilities || tierDefaults[agent_tier] || ['sms'];

      // Create the agent
      const agent = await base44.entities.AgentPersona.create({
        name,
        persona_type: finalPersonaType,
        agent_tier: agent_tier || 'standard',
        system_prompt: system_prompt || '',
        tone: tone || '',
        personality_traits: personality_traits || [],
        assigned_number: assigned_number || '',
        target_industry: target_industry || '',
        capabilities: finalCapabilities,
        shadow_mode: shadow_mode || (agent_tier === 'shadow'),
        swarm_id: swarm_id || '',
        swarm_role: swarm_role || 'worker',
        swarm_members: swarm_members || [],
        swarm_coordinator_id: swarm_coordinator_id || '',
        fulfillment_config: fulfillment_config || {
          auto_execute: true,
          retry_count: 3,
          timeout_seconds: 120,
          browser_type: 'cloud',
        },
        api_credentials: api_credentials || [],
        api_endpoints: api_endpoints || [],
        power_level: power_level || (agent_tier === 'super' ? 7 : 1),
        autonomy_level: autonomy_level || (agent_tier === 'shadow' ? 'fully_autonomous' : 'supervised'),
        assigned_context: assigned_context || '',
        status: 'active',
        provisioned_at: new Date().toISOString(),
      });

      // If this is a swarm worker, link it to the coordinator
      if (agent_tier === 'swarm' && swarm_role === 'worker' && swarm_coordinator_id) {
        try {
          const coordinator = await base44.entities.AgentPersona.get(swarm_coordinator_id);
          const members = coordinator.swarm_members || [];
          if (!members.includes(agent.id)) {
            members.push(agent.id);
            await base44.entities.AgentPersona.update(swarm_coordinator_id, { swarm_members: members });
          }
        } catch (_) {}
      }

      return Response.json({
        action: 'provision',
        status: 'provisioned',
        agent_id: agent.id,
        agent_name: agent.name,
        agent_tier: agent_tier,
        persona_type: finalPersonaType,
        capabilities: finalCapabilities,
        assigned_number: assigned_number || '',
        swarm_id: swarm_id || '',
        shadow_mode: agent.shadow_mode,
      });
    }

    // ── DEPLOY: Activate an agent for live operation ──
    if (action === 'deploy') {
      const { agent_id } = body;
      if (!agent_id) return Response.json({ error: 'agent_id required' }, { status: 400 });
      const agent = await base44.entities.AgentPersona.update(agent_id, {
        status: 'active',
        active: true,
      });
      return Response.json({ action: 'deploy', status: 'deployed', agent_id, agent_name: agent.name });
    }

    // ── STANDDOWN: Pause an agent ──
    if (action === 'standdown') {
      const { agent_id } = body;
      if (!agent_id) return Response.json({ error: 'agent_id required' }, { status: 400 });
      const agent = await base44.entities.AgentPersona.update(agent_id, { status: 'paused', active: false });
      return Response.json({ action: 'standdown', status: 'paused', agent_id, agent_name: agent.name });
    }

    // ── SWARM CREATE: Create a coordinator + multiple workers in one call ──
    if (action === 'create_swarm') {
      const { swarm_name, coordinator_name, worker_count, worker_template, capabilities } = body;
      if (!swarm_name || !coordinator_name) return Response.json({ error: 'swarm_name and coordinator_name required' }, { status: 400 });

      const swarmId = `swarm-${Date.now()}`;
      const swarmCapabilities = capabilities || ['sms', 'voice', 'cloud_browser', 'web_interact'];

      // Create coordinator
      const coordinator = await base44.entities.AgentPersona.create({
        name: coordinator_name,
        persona_type: 'swarm_coordinator',
        agent_tier: 'swarm',
        system_prompt: worker_template?.system_prompt || `You are ${coordinator_name}, the coordinator of the ${swarm_name} swarm. Delegate tasks to your workers and synthesize their results.`,
        capabilities: swarmCapabilities,
        swarm_id: swarmId,
        swarm_role: 'coordinator',
        swarm_members: [],
        autonomy_level: 'autonomous',
        status: 'active',
        provisioned_at: new Date().toISOString(),
      });

      // Create workers
      const workers: any[] = [];
      const count = Math.min(worker_count || 3, 20);
      for (let i = 1; i <= count; i++) {
        const worker = await base44.entities.AgentPersona.create({
          name: `${swarm_name} Worker ${i}`,
          persona_type: 'swarm_worker',
          agent_tier: 'swarm',
          system_prompt: worker_template?.system_prompt || `You are a worker in the ${swarm_name} swarm. Execute tasks assigned by your coordinator.`,
          capabilities: swarmCapabilities,
          swarm_id: swarmId,
          swarm_role: 'worker',
          swarm_coordinator_id: coordinator.id,
          autonomy_level: 'supervised',
          status: 'active',
          provisioned_at: new Date().toISOString(),
        });
        workers.push({ id: worker.id, name: worker.name });
      }

      // Link workers to coordinator
      await base44.entities.AgentPersona.update(coordinator.id, {
        swarm_members: workers.map((w) => w.id),
      });

      return Response.json({
        action: 'create_swarm',
        status: 'created',
        swarm_id: swarmId,
        swarm_name,
        coordinator: { id: coordinator.id, name: coordinator.name },
        worker_count: workers.length,
        workers,
      });
    }

    // ── EXECUTE: Run an agent action using its capabilities ──
    if (action === 'execute') {
      const { agent_id, task, target_url, deliver_to } = body;
      if (!agent_id || !task) return Response.json({ error: 'agent_id and task required' }, { status: 400 });

      const agent = await base44.entities.AgentPersona.get(agent_id);
      if (!agent) return Response.json({ error: 'agent not found' }, { status: 404 });

      const results: any = { agent_name: agent.name, agent_tier: agent.agent_tier };

      // If agent has cloud_browser capability, use Browserbase
      if (agent.capabilities?.includes('cloud_browser') && target_url) {
        try {
          const bbResult = await base44.functions.invoke('executeAutonomousAction', {
            action: 'browser_agent',
            task: `${task}. Navigate to ${target_url}.`,
            wait_for_completion: true,
          });
          results.browser_result = bbResult?.data || bbResult;
        } catch (err: any) {
          results.browser_error = err.message;
        }
      }

      // If agent has web_interact capability, analyze the page
      if (agent.capabilities?.includes('web_interact') && target_url) {
        try {
          const interactResult = await base44.functions.invoke('executeAutonomousAction', {
            action: 'web_interact',
            url: target_url,
            goal: task,
          });
          results.web_analysis = interactResult?.data || interactResult;
        } catch (err: any) {
          results.web_interact_error = err.message;
        }
      }

      // If agent has sms capability and deliver_to, send the result
      if (agent.capabilities?.includes('sms') && deliver_to && agent.assigned_number) {
        try {
          const smsResult = await base44.functions.invoke('executeAutonomousAction', {
            action: 'send_sms',
            from_number: agent.assigned_number,
            to_number: deliver_to,
            message: `[${agent.name}] ${task} — execution complete.`,
          });
          results.sms_delivery = smsResult?.data || smsResult;
        } catch (err: any) {
          results.sms_error = err.message;
        }
      }

      return Response.json({ action: 'execute', status: 'completed', ...results });
    }

    // ── API CALL: Use stored API credentials to call an external site ──
    if (action === 'api_call') {
      const { agent_id, credential_index, method, endpoint_path, body: reqBody, headers } = body;
      if (!agent_id) return Response.json({ error: 'agent_id required' }, { status: 400 });

      const agent = await base44.entities.AgentPersona.get(agent_id);
      if (!agent) return Response.json({ error: 'agent not found' }, { status: 404 });

      const creds = agent.api_credentials?.[credential_index || 0];
      if (!creds) return Response.json({ error: 'no API credentials stored for this agent' }, { status: 400 });

      const url = creds.base_url?.replace(/\/$/, '') + (endpoint_path || '');
      const reqHeaders: any = { 'Content-Type': 'application/json' };
      if (creds.auth_type === 'bearer' && creds.api_key) {
        reqHeaders['Authorization'] = `Bearer ${creds.api_key}`;
      } else if (creds.auth_type === 'api_key' && creds.api_key) {
        reqHeaders['X-API-Key'] = creds.api_key;
      } else if (creds.auth_type === 'basic' && creds.username && creds.password) {
        reqHeaders['Authorization'] = `Basic ${btoa(`${creds.username}:${creds.password}`)}`;
      }
      Object.assign(reqHeaders, headers || {});

      const res = await fetch(url, {
        method: method || 'GET',
        headers: reqHeaders,
        body: method !== 'GET' ? JSON.stringify(reqBody || {}) : undefined,
      });
      const data = await res.text();
      let parsed: any = data;
      try { parsed = JSON.parse(data); } catch (_) {}

      return Response.json({
        action: 'api_call',
        status: res.ok ? 'success' : 'error',
        status_code: res.status,
        site: creds.site_name,
        url,
        response: parsed,
      });
    }

    return Response.json({ error: 'unknown action', action }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}