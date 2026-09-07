import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Strategic Minds AI — Communication Suite Generator
// Phase 1: Researches industry communication landscape (web search)
// Phase 2: Generates templates per channel covering all situation/tone combos
// Phase 3: Persists CommunicationTemplate records and returns research + template IDs
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch (_) {}
    const industry = body.industry || "Real Estate";
    const channels = body.channels || ["voice", "sms", "email", "whatsapp"];
    const situations = body.situations || ["sales", "follow_up", "outreach"];
    const tones = body.tones || ["professional", "friendly"];
    const genderPreference = body.gender_preference || "female";

    // ── Phase 1: Industry Communication Research ──
    const research = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the Strategic Minds AI Communication Intelligence Engine. Research the ${industry} industry's complete communication landscape. Identify:
1. ALL communication channels used by top performers (phone, SMS, MMS, WhatsApp, email, Facebook Messenger, Snapchat, Instagram DM, LinkedIn, Twitter/X, TikTok, Discord, RCS, etc.)
2. Customer psychology: what specific words and phrases produce the HIGHEST response and closing rates
3. Words and phrases to AVOID due to negative responses or spam filters
4. Top closing sales methods specific to this industry
5. Most effective marketing message patterns
6. Optimal follow-up cadence and timing
7. Compliance considerations (TCPA, CAN-SPAM, GDPR, industry-specific)
8. Human psychology triggers that drive engagement in this industry
Return as structured JSON.`,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          channels_identified: { type: "array", items: { type: "string" } },
          high_response_words: { type: "array", items: { type: "string" } },
          words_to_avoid: { type: "array", items: { type: "string" } },
          top_closing_methods: { type: "array", items: { type: "string" } },
          effective_marketing_patterns: { type: "array", items: { type: "string" } },
          follow_up_cadence: { type: "string" },
          compliance_notes: { type: "string" },
          customer_psychology: { type: "string" },
          best_performing_channel: { type: "string" },
          industry_specific_objections: { type: "array", items: { type: "string" } }
        },
        required: ["channels_identified", "high_response_words", "words_to_avoid", "top_closing_methods"]
      }
    });

    // ── Phase 2: Generate Templates Per Channel (parallel) ──
    const templatePromises = channels.map(channel =>
      base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are an ultra-humanistic AI communication expert for the ${industry} industry. Generate ${genderPreference} voice templates for the ${channel} channel.

For EACH combination of situation [${situations.join(", ")}] and tone [${tones.join(", ")}], create a complete, production-ready template.

Apply this research:
- High-response words to use: ${research.high_response_words?.join(", ") || "value, benefit, opportunity, exclusive"}
- Words to AVOID: ${research.words_to_avoid?.join(", ") || "buy now, limited time, act fast"}
- Top closing method: ${research.top_closing_methods?.[0] || "consultative approach"}
- Customer psychology: ${research.customer_psychology || "value-driven, trust-seeking"}
- Compliance: ${research.compliance_notes || "TCPA opt-out required for SMS/voice"}

Rules:
- Sound natural and human — contractions, empathy, conversational rhythm
- Never robotic or scripted-sounding
- Adapt length to the channel (SMS = concise, email = structured, voice = conversational)
- Include channel-specific best practices
- Gender voice: ${genderPreference}

Return a JSON object with a "templates" array, one entry per situation/tone combination.`,
        response_json_schema: {
          type: "object",
          properties: {
            templates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  situation: { type: "string" },
                  tone: { type: "string" },
                  template_body: { type: "string" },
                  psychology_notes: { type: "string" },
                  effectiveness_score: { type: "number" },
                  target_audience: { type: "string" }
                },
                required: ["situation", "tone", "template_body"]
              }
            }
          },
          required: ["templates"]
        }
      })
    );

    const channelResults = await Promise.all(templatePromises);

    // ── Phase 3: Persist Templates ──
    const records = [];
    channels.forEach((channel, ci) => {
      const channelTemplates = channelResults[ci]?.templates || [];
      channelTemplates.forEach(t => {
        records.push({
          industry,
          channel,
          situation: t.situation || "sales",
          tone: t.tone || "professional",
          gender_preference: genderPreference,
          template_body: t.template_body || "",
          psychology_notes: t.psychology_notes || "",
          high_response_words: research.high_response_words || [],
          words_to_avoid: research.words_to_avoid || [],
          effectiveness_score: t.effectiveness_score || 0,
          target_audience: t.target_audience || "",
          compliance_notes: research.compliance_notes || "",
          active: true
        });
      });
    });

    const created = records.length > 0
      ? await base44.asServiceRole.entities.CommunicationTemplate.bulkCreate(records)
      : [];

    return Response.json({
      industry,
      research: {
        channels_identified: research.channels_identified || [],
        high_response_words: research.high_response_words || [],
        words_to_avoid: research.words_to_avoid || [],
        top_closing_methods: research.top_closing_methods || [],
        effective_marketing_patterns: research.effective_marketing_patterns || [],
        follow_up_cadence: research.follow_up_cadence || "",
        compliance_notes: research.compliance_notes || "",
        customer_psychology: research.customer_psychology || "",
        best_performing_channel: research.best_performing_channel || "",
        industry_specific_objections: research.industry_specific_objections || []
      },
      templates_generated: created.length,
      template_ids: created.map(c => c.id),
      channels_covered: channels
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}