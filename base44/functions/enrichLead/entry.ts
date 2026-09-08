import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Enriches a scraped lead with additional data based on selected enrichment options.
// options: ["social_profiles", "employee_count", "revenue", "tech_stack", "contact_info", "competitors"]
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { business_name, address, website, industry, enrichment_options } = body;

    if (!business_name) {
      return Response.json({ error: "business_name is required" }, { status: 400 });
    }

    const options = enrichment_options || ["social_profiles", "contact_info"];
    const optionDescriptions = {
      social_profiles: "social media profiles (Facebook, Instagram, LinkedIn, Twitter/X) with URLs and follower counts",
      employee_count: "estimated number of employees",
      revenue: "estimated annual revenue range",
      tech_stack: "website technology stack (CMS, analytics, hosting)",
      contact_info: "key decision maker names, titles, and emails",
      competitors: "top 3 local competitors with names and websites"
    };

    const requestedInfo = options.map(o => optionDescriptions[o]).filter(Boolean).join(", ");

    const prompt = `Research the business "${business_name}" located at ${address || "unknown address"}${website ? ` (website: ${website})` : ""} in the ${industry || "unknown"} industry.

Find and provide the following information: ${requestedInfo}.

Return a JSON object with all available data. Use null for anything not found.`;

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          social_profiles: {
            type: "array",
            items: {
              type: "object",
              properties: {
                platform: { type: "string" },
                url: { type: "string" },
                followers: { type: "string" }
              }
            }
          },
          employee_count: { type: "string" },
          revenue: { type: "string" },
          tech_stack: { type: "array", "items": { type: "string" } },
          decision_makers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                title: { type: "string" },
                email: { type: "string" }
              }
            }
          },
          competitors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                website: { type: "string" }
              }
            }
          },
          summary: { type: "string" }
        }
      }
    });

    return Response.json({ enrichment_data: res });
  } catch (error) {
    console.error("enrichLead error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}