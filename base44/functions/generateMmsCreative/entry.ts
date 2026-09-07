import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// MMS Creative Generator — produces branded images, logos, hooks, closes, bids, and pricing
// sheets for use in MMS campaigns. Text generators use InvokeLLM; image generators use GenerateImage.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { type, company_name, industry, brand_colors, context, target_audience } = body;

    if (!type) return Response.json({ error: "Generator type required" }, { status: 400 });

    const colors = (brand_colors && brand_colors.length > 0) ? brand_colors.join(", ") : "professional brand colors";
    const company = company_name || "the company";
    const ind = industry || "business";
    const ctx = context || "";
    const audience = target_audience || "potential customers";

    // ── Image generators ──
    if (type === "image") {
      const res = await base44.asServiceRole.integrations.Core.GenerateImage({
        prompt: `Create a professional branded marketing image for ${company}, a ${ind} company. ${ctx ? `Context: ${ctx}.` : ""} Target audience: ${audience}. Use these brand colors: ${colors}. The image should be eye-catching, modern, clean, and suitable for MMS messaging on mobile devices. High quality, professional design with clear visual hierarchy.`
      });
      return Response.json({ image_url: res.url, content_type: "image", type: "image" });
    }

    if (type === "logo") {
      const res = await base44.asServiceRole.integrations.Core.GenerateImage({
        prompt: `Create a professional, modern logo for ${company}, a ${ind} company. Use these brand colors: ${colors}. The design should be minimalist, clean, and scalable — working well at small sizes for MMS, social media, and digital use. No text or minimal text. Vector-style flat design.`
      });
      return Response.json({ image_url: res.url, content_type: "image", type: "logo" });
    }

    if (type === "promo") {
      const res = await base44.asServiceRole.integrations.Core.GenerateImage({
        prompt: `Create a promotional graphic for ${company}, a ${ind} company. ${ctx ? `Promotion: ${ctx}.` : ""} Use brand colors: ${colors}. Include visual elements that convey urgency and value. Design should be bold, eye-catching, and optimized for MMS viewing on mobile. Modern marketing style.`
      });
      return Response.json({ image_url: res.url, content_type: "image", type: "promo" });
    }

    if (type === "testimonial") {
      const res = await base44.asServiceRole.integrations.Core.GenerateImage({
        prompt: `Create a testimonial card graphic for ${company}, a ${ind} company. ${ctx ? `Testimonial: ${ctx}.` : ""} Use brand colors: ${colors}. The design should feature a clean card layout with space for a quote, suitable for MMS and social media. Professional, trustworthy aesthetic.`
      });
      return Response.json({ image_url: res.url, content_type: "image", type: "testimonial" });
    }

    // ── Text generators ──
    let prompt = "";

    if (type === "hook") {
      prompt = `Generate 5 attention-grabbing hooks (opening lines) for ${company}, a ${ind} company.
${ctx ? `Product/Service context: ${ctx}.` : ""}
Target audience: ${audience}.
Tone: compelling, curiosity-driven, action-oriented.

Each hook should:
- Be under 15 words
- Immediately capture attention
- Work across SMS, MMS, voice, and email
- Avoid spammy language

Format as a numbered list (1-5).`;
    } else if (type === "close") {
      prompt = `Generate 5 closing messages for ${company}, a ${ind} company.
${ctx ? `Product/Service context: ${ctx}.` : ""}
Target audience: ${audience}.

Each close should:
- Be under 25 words
- Drive a specific action (schedule, buy, reply, call)
- Create urgency without being pushy
- Work across SMS, MMS, voice, and email

Format as a numbered list (1-5).`;
    } else if (type === "bid") {
      prompt = `Generate a professional bid/quote proposal for ${company}, a ${ind} company.
${ctx ? `Service/Product: ${ctx}.` : ""}
Target audience: ${audience}.

Include:
1. Scope of work (3-5 bullet points)
2. Timeline
3. Pricing structure (3 tiers if applicable)
4. Terms and conditions (brief)
5. Call to action

Keep it professional, concise, and ready to send via MMS or email. Use clear formatting with headers.`;
    } else if (type === "pricing") {
      prompt = `Generate a clear, compelling pricing sheet for ${company}, a ${ind} company.
${ctx ? `Product/Service: ${ctx}.` : ""}

Create 3 pricing tiers:
- Basic/Starter: entry-level offering
- Professional: most popular mid-tier
- Enterprise/Premium: top-tier

For each tier include:
- Price (realistic for the industry)
- 4-6 key features
- Best for (target customer type)

Format as a clean text table that can be sent via MMS. Keep it scannable and easy to read on mobile.`;
    } else {
      return Response.json({ error: `Unknown generator type: ${type}` }, { status: 400 });
    }

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
    return Response.json({ content: res, content_type: "text", type });
  } catch (error) {
    console.error("generateMmsCreative error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}