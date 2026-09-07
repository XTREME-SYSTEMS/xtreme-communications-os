import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Industry Intelligence Scraper & Generator
// Scrapes the company's web presence and ingests industry intelligence to build a
// knowledge base the AI agent uses during conversations.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const companyName = body.company_name || "";
    const website = body.website || "";
    const industry = body.industry || "general business";

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Research the company "${companyName}" ${website ? `(website: ${website})` : ""} in the ${industry} industry.

Find and compile ALL of the following:
1. COMPANY OVERVIEW: What they do, products/services, mission, team size estimate
2. SOCIAL MEDIA: Platforms, handles, URLs, content themes
3. DIFFERENTIATORS: Key value propositions and competitive advantages
4. COMMON Q&A: Top 10 questions customers ask and ideal answers
5. INDUSTRY INTELLIGENCE for ${industry}:
   - Sales techniques and best practices
   - Marketing strategies that convert
   - Service standards and expectations
   - Tools and technologies used in the industry
   - AI and automation trends
   - Customer service best practices
   - Common objections and proven responses
   - Compliance considerations (TCPA, opt-in, etc.)
6. AGENT KNOWLEDGE BASE: A comprehensive, structured knowledge base the AI agent can reference during live conversations with customers. Include company facts, industry terms, pricing approaches, and FAQ answers.

Return as structured JSON.`,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          company_overview: { type: "string" },
          products_services: { type: "array", items: { type: "string" } },
          mission: { type: "string" },
          social_media: {
            type: "array",
            items: {
              type: "object",
              properties: {
                platform: { type: "string" },
                handle: { type: "string" },
                url: { type: "string" },
                content_themes: { type: "array", items: { type: "string" } }
              }
            }
          },
          differentiators: { type: "array", items: { type: "string" } },
          common_qa: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                answer: { type: "string" }
              }
            }
          },
          industry_intelligence: {
            type: "object",
            properties: {
              sales_techniques: { type: "array", items: { type: "string" } },
              marketing_strategies: { type: "array", items: { type: "string" } },
              service_standards: { type: "array", items: { type: "string" } },
              tools_technologies: { type: "array", items: { type: "string" } },
              ai_automation_trends: { type: "array", items: { type: "string" } },
              customer_service_best_practices: { type: "array", items: { type: "string" } },
              common_objections: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    objection: { type: "string" },
                    response: { type: "string" }
                  }
                }
              },
              compliance_notes: { type: "string" }
            }
          },
          agent_knowledge_base: { type: "string", description: "Comprehensive knowledge base for the AI agent to reference during conversations" }
        },
        required: ["company_overview", "industry_intelligence", "agent_knowledge_base"]
      }
    });

    // Persist as an IndustryProfile for reuse
    if (res.industry_intelligence) {
      try {
        await base44.asServiceRole.entities.IndustryProfile.create({
          industry,
          is_primary: false,
          focus_areas: res.industry_intelligence.sales_techniques || [],
          objection_catalog: res.industry_intelligence.common_objections || [],
          qualification_criteria: res.industry_intelligence.service_standards || [],
          compliance_notes: res.industry_intelligence.compliance_notes || "",
          script_seed: res.agent_knowledge_base || "",
        });
      } catch (_) {}
    }

    return Response.json({ intelligence: res });
  } catch (error) {
    console.error("scrapeCompanyIntelligence error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}