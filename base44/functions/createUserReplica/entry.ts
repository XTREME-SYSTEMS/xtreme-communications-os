import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Scrapes the web for a person, generates a full AI replica with personality,
// sales techniques, communication style, and recommended messages.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch (_) {}

    const { full_name, email, phone_number, business_emails, social_media_accounts,
           communication_methods, profile_image_url, step } = body;

    if (!full_name) return Response.json({ error: 'full_name is required' }, { status: 400 });

    // ── Step 1: Web scrape ──
    let scraped = null;
    let scrapeError = null;

    try {
      const scrapeRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Search the web comprehensively for information about "${full_name}".
Look for their LinkedIn profile, Facebook page, Google results, news articles, blog posts,
social media presence, professional achievements, company affiliations, speaking engagements,
publications, and any other online content about this person.

If the person has provided social media accounts, use those to find more information:
${JSON.stringify(social_media_accounts || [])}

Business emails for additional context: ${JSON.stringify(business_emails || [])}

Compile everything you find into a comprehensive profile.`,
        add_context_from_internet: true,
        model: 'gemini_3_8_flash',
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string", description: "Comprehensive summary of everything found" },
            sources: { type: "array", items: { type: "string" }, description: "URLs or source names" },
            professional_background: { type: "string" },
            public_persona: { type: "string", description: "How they present themselves online" },
            interests: { type: "array", items: { type: "string" } },
            achievements: { type: "array", items: { type: "string" } },
            companies: { type: "array", items: { type: "string" } },
            locations: { type: "array", items: { type: "string" } }
          },
          required: ["summary"]
        }
      });
      scraped = scrapeRes;
    } catch (e) {
      scrapeError = e.message;
    }

    // ── Step 2: Generate AI replica ──
    let replicaData = null;
    let replicaError = null;

    try {
      const replicaRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are creating a comprehensive AI replica profile for a real person who will be used
to power an AI sales and marketing assistant that acts, speaks, and sells like them.

PERSON INFO:
- Name: ${full_name}
- Email: ${email}
- Phone: ${phone_number || 'N/A'}
- Business Emails: ${JSON.stringify(business_emails || [])}
- Social Media: ${JSON.stringify(social_media_accounts || [])}
- Communication Methods: ${JSON.stringify(communication_methods || [])}

${scraped ? `WEB SCRAPE RESULTS:
Summary: ${scraped.summary || 'No results'}
Professional Background: ${scraped.professional_background || 'N/A'}
Public Persona: ${scraped.public_persona || 'N/A'}
Interests: ${JSON.stringify(scraped.interests || [])}
Achievements: ${JSON.stringify(scraped.achievements || [])}
Companies: ${JSON.stringify(scraped.companies || [])}` : 'No web scrape data available.'}

Generate a COMPLETE AI replica profile:

1. PERSONALITY TRAITS: 5-10 traits that describe this person based on their online presence
2. SALES TECHNIQUES: 5-10 sales techniques they would naturally use
3. COMMUNICATION STYLE: Detailed description of how they communicate
4. RECOMMENDED TONES: 3-5 tones that match their personality for different scenarios
5. RECOMMENDED MESSAGES: 5 sample messages:
   - 1 cold outreach email
   - 1 follow-up email
   - 1 objection handling response
   - 1 SMS outreach
   - 1 closing message
6. AI REPLICA PROMPT: A complete system prompt (300+ words) that will make an AI act exactly like this person.
   Include their name, communication style, personality, sales approach, tone preferences,
   common phrases they would use, and how they handle objections. This prompt should make
   the AI indistinguishable from the real person in text and voice conversations.`,
        response_json_schema: {
          type: "object",
          properties: {
            personality_traits: { type: "array", items: { type: "string" } },
            sales_techniques: { type: "array", items: { type: "string" } },
            communication_style: { type: "string" },
            recommended_tones: { type: "array", items: { type: "string" } },
            recommended_messages: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  content: { type: "string" }
                }
              }
            },
            ai_replica_prompt: { type: "string" }
          },
          required: ["personality_traits", "communication_style", "ai_replica_prompt"]
        }
      });
      replicaData = replicaRes;
    } catch (e) {
      replicaError = e.message;
    }

    // ── Step 3: Save to UserReplica entity ──
    const replica = await base44.entities.UserReplica.create({
      full_name,
      email: email || '',
      phone_number: phone_number || '',
      business_emails: business_emails || [],
      social_media_accounts: social_media_accounts || [],
      communication_methods: communication_methods || [],
      profile_image_url: profile_image_url || '',
      scraped_summary: scraped?.summary || '',
      scraped_sources: scraped?.sources || [],
      personality_traits: replicaData?.personality_traits || [],
      sales_techniques: replicaData?.sales_techniques || [],
      communication_style: replicaData?.communication_style || '',
      recommended_tones: replicaData?.recommended_tones || [],
      recommended_messages: (replicaData?.recommended_messages || []).map(m => ({ ...m, approved: false })),
      ai_replica_prompt: replicaData?.ai_replica_prompt || '',
      ai_replica_status: 'training',
      onboarded: false,
    });

    return Response.json({
      replica_id: replica.id,
      scrape_error: scrapeError,
      replica_error: replicaError,
      scraped: scraped ? {
        summary: scraped.summary,
        sources: scraped.sources,
        professional_background: scraped.professional_background,
        public_persona: scraped.public_persona,
        interests: scraped.interests,
        achievements: scraped.achievements,
        companies: scraped.companies,
      } : null,
      replica: replicaData ? {
        personality_traits: replicaData.personality_traits,
        sales_techniques: replicaData.sales_techniques,
        communication_style: replicaData.communication_style,
        recommended_tones: replicaData.recommended_tones,
        recommended_messages: replicaData.recommended_messages,
        ai_replica_prompt: replicaData.ai_replica_prompt,
      } : null
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}