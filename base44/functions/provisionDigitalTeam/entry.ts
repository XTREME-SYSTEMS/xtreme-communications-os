import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { aiCompleteJson, MODELS } from '../../shared/aiGateway.ts';

// Digital Team Provisioning Engine
// Creates AI agent personas, communication templates, and provisions phone numbers
// for a fully autonomous digital sales/marketing team.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
    try { body = await req.json(); } catch (_) {}

    const apiKey = body.api_key || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!apiKey) return Response.json({ error: "api_key required" }, { status: 401 });
    const keys = await base44.asServiceRole.entities.ApiKey.filter({ key_value: apiKey, status: "active" });
    if (!keys.length) return Response.json({ error: "invalid api key" }, { status: 403 });

    const action = body.action || "provision";

    // ── AUTO-GENERATE TEAM: AI creates team members based on industry & goal ──
    if (action === "auto_generate_team") {
      const { industry, strategy_goal, team_size, channels, company_name } = body;

      const result = await aiCompleteJson({
        model: MODELS.fast,
        messages: [{
          role: 'user',
          content: `You are an AI team architect for ${company_name || 'a company'} in the ${industry || 'general'} industry.
Goal: ${strategy_goal || 'grow revenue'}
Channels: ${(channels || ['sms']).join(', ')}
Team size: ${team_size || 3} members

Create ${team_size || 3} realistic AI employee profiles that mimic human sales/marketing staff. Each needs:
- name: A professional human-sounding name
- role: Their job title (e.g. Lead Generator, SDR, Closer, Account Manager, Social Media Manager)
- skills: 3-5 relevant skills
- personality: One sentence describing their work personality
- system_prompt: A detailed system prompt for this AI agent
- assigned_channel: Their primary channel from: ${channels.join(', ')}

Distribute roles appropriate for a ${team_size}-person team.`,
        }],
        temperature: 0.7,
        schema: {
          type: 'object',
          properties: {
            team_members: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  role: { type: 'string' },
                  skills: { type: 'array', items: { type: 'string' } },
                  personality: { type: 'string' },
                  system_prompt: { type: 'string' },
                  assigned_channel: { type: 'string' },
                },
                required: ['name', 'role', 'skills', 'personality', 'system_prompt', 'assigned_channel'],
              },
            },
          },
          required: ['team_members'],
        },
      });

      return Response.json({ status: 'success', team_members: result.team_members });
    }

    // ── PROVISION: Create all agents, templates, assign numbers ──
    if (action === "provision") {
      const { team_id, team_data } = body;
      if (!team_data) return Response.json({ error: "team_data required" }, { status: 400 });

      const now = new Date().toISOString();
      const results = { agents_created: 0, templates_created: 0, numbers_assigned: 0, errors: [] };
      const createdPersonas: any[] = [];

      // 1. Create AgentPersona records
      for (const member of team_data.team_members || []) {
        try {
          const persona = await base44.asServiceRole.entities.AgentPersona.create({
            name: member.name,
            persona_type: team_data.channels?.includes('voice') ? 'voice' : 'phone',
            system_prompt: member.system_prompt || `You are ${member.name}, a ${member.role} at ${team_data.company_name}. Your goal is: ${team_data.strategy_goal}. You work in the ${team_data.industry} industry. Be professional, knowledgeable, and personable.`,
            personality_traits: member.skills || [],
            tone: 'professional',
            assigned_context: member.role,
            active: true,
            status: 'active',
            target_industry: team_data.industry,
            provisioned_at: now,
            avatar_color: '#ff6b00',
          });
          createdPersonas.push(persona);
          results.agents_created++;
        } catch (err: any) {
          results.errors.push(`Agent ${member.name}: ${err.message}`);
        }
      }

      // 2. Create CommunicationTemplates for each channel
      for (const channel of (team_data.channels || [])) {
        try {
          await base44.asServiceRole.entities.CommunicationTemplate.create({
            industry: team_data.industry || 'universal',
            channel: channel === 'social_media' ? 'universal' : channel,
            situation: 'outreach',
            tone: 'professional',
            template_body: `Hi {{first_name}}! This is ${team_data.company_name}. We help ${team_data.industry || 'businesses'} ${team_data.strategy_goal || 'grow'}. Would you be interested in learning more? Reply YES to learn more.`,
            active: true,
          });
          results.templates_created++;
        } catch (err: any) {
          results.errors.push(`Template ${channel}: ${err.message}`);
        }
      }

      // 3. Assign phone numbers to agents (from available inventory)
      const availableNumbers = await base44.asServiceRole.entities.PhoneNumber.filter(
        { status: 'available' }, '-created_date', team_data.phone_numbers_count || 1
      );
      for (let i = 0; i < Math.min(createdPersonas.length, availableNumbers.length); i++) {
        try {
          await base44.asServiceRole.entities.PhoneNumber.update(availableNumbers[i].id, {
            status: 'assigned',
            assigned_persona_id: createdPersonas[i].id,
          });
          await base44.asServiceRole.entities.AgentPersona.update(createdPersonas[i].id, {
            assigned_number: availableNumbers[i].e164,
          });
          results.numbers_assigned++;
        } catch (err: any) {
          results.errors.push(`Number assignment: ${err.message}`);
        }
      }

      // 4. Update team status
      if (team_id) {
        await base44.asServiceRole.entities.DigitalTeam.update(team_id, {
          status: 'active',
          launched_at: now,
          provisioning_result: results,
        });
      }

      return Response.json({ status: 'success', ...results, launched_at: now });
    }

    return Response.json({ error: "unknown action", action }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}