import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Scrapes business leads by industry, location, keyword, and radius using LLM web search.
// Returns structured business listings.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { industry, location, keyword, radius_miles } = body;

    if (!industry || !location) {
      return Response.json({ error: "Industry and location are required" }, { status: 400 });
    }

    const prompt = `Search for real businesses matching these criteria:
- Industry: ${industry}
- Location: ${location}
- Keyword: ${keyword || "any"}
- Radius: ${radius_miles || 25} miles

Find up to 20 actual businesses in this area. For each business, provide:
- business_name: the real business name
- address: full street address
- phone: phone number if available
- website: website URL if available
- email: email if found
- rating: Google rating (0-5) if available
- review_count: number of Google reviews if available
- google_reviews: array of up to 3 recent Google reviews with author, rating, and text
- latitude, longitude: approximate coordinates

Return ONLY a JSON object with a "leads" array. Each element must have all fields listed above (use empty string or 0 if unknown).`;

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          leads: {
            type: "array",
            items: {
              type: "object",
              properties: {
                business_name: { type: "string" },
                address: { type: "string" },
                phone: { type: "string" },
                website: { type: "string" },
                email: { type: "string" },
                rating: { type: "number" },
                review_count: { type: "integer" },
                google_reviews: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      author: { type: "string" },
                      rating: { type: "number" },
                      text: { type: "string" }
                    }
                  }
                },
                latitude: { type: "number" },
                longitude: { type: "number" }
              }
            }
          }
        }
      }
    });

    return Response.json({ leads: res.leads || [] });
  } catch (error) {
    console.error("scrapeLeads error:", error);
    return Response.json({ error: error.message, leads: [] }, { status: 500 });
  }
}