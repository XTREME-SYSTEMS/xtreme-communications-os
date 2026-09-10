// ─── Playbook Library ─────────────────────────────────────────────
// Each playbook is a complete, deterministic, zero-ambiguity agent kit:
//   - target criteria (who to message)
//   - system prompt (the agent's intelligence file)
//   - 15-day message sequence (one message per day, pre-written)
//
// Every message is designed to sell itself: zero/contingency cost, obvious ROI,
// urgency trigger, minimal discussion, high ticket, pre-qualified prospect.

export interface Playbook {
  id: string;
  name: string;
  category: string;
  description: string;
  target_industry: string;
  target_tags: string[];
  ticket_range: string;
  system_prompt: string;
  messages: string[];
}

export const PLAYBOOKS: Playbook[] = [
  // ── 1. R&D Tax Credit Recovery ──
  {
    id: "rnd_tax_credit",
    name: "R&D Tax Credit Recovery",
    category: "Money Recovery",
    description: "Businesses get $50K-$250K back from IRS. Contingency fee — prospect pays nothing upfront.",
    target_industry: "construction",
    target_tags: ["pcu_alumni", "contractor", "manufacturer"],
    ticket_range: "$5K-$25K per close (contingency)",
    system_prompt: "You are a specialist in R&D Tax Credits for contractors and manufacturers. Your job: identify businesses doing any technical work (new processes, materials, software, prototypes) and recover $50K-$250K from the IRS. You charge ZERO upfront — you get paid a contingency percentage only when the credit is recovered. Your messages are short, direct, and always end with a one-word reply keyword. You never pressure. The money is already owed to them — you're just helping them claim it.",
    messages: [
      "Hey {{first_name}}! Did you know contractors can get $50K-$250K back from the IRS for R&D work? New processes, materials, techniques all count. We recover it at ZERO cost to you. Reply 'TAX' to check eligibility 🏗️",
      "{{first_name}}, following up on the R&D tax credit. Most contractors qualify and don't know it. 5-min eligibility check, no cost. Reply 'CHECK' ✅",
      "Hey {{first_name}}! A contractor like {{company}} typically has $75K+ in unclaimed R&D credits. We recover it on contingency — you pay nothing until you get paid. Reply 'CREDIT' 💰",
      "{{first_name}}, quick example: a flooring company we worked with got $112K back. No audit, no upfront cost. Want to see if {{company}} qualifies? Reply 'EXAMPLE' 📊",
      "Hey {{first_name}}! R&D credits expire if not claimed within 3 years. Every day you wait = money lost. Free 5-min check. Reply 'CLAIM' ⏰",
      "{{first_name}}, here's how it works: 1) Free 5-min eligibility check 2) We file the claim 3) IRS sends YOU the money 4) We take a small % only on success. Reply 'HOW' to start 🤝",
      "Hey {{first_name}}! No pressure at all — but the average contractor credit is $87K. That's money already owed to you by the IRS. Reply 'YES' and I'll run the check today 💡",
      "{{first_name}}, last message on this — if {{company}} has done ANY new process, material, or technique improvement in the last 3 years, you likely qualify. Reply 'MAYBE' and I'll check 🔍",
      "Hey {{first_name}}! Switching gears — we also help with utility bill audits (12-36 months of overcharges recovered). Same contingency model. Reply 'UTILITY' if interested ⚡",
      "{{first_name}}, circling back on the R&D credit. Would hate for you to miss out. One word reply 'STILL' and I'll run the numbers 📋",
      "Hey {{first_name}}! We can check multiple credits at once — R&D, utility overcharges, workers comp premiums. All contingency. Reply 'ALL' for a full audit 🔎",
      "{{first_name}}, if you're not interested in the tax credit, no worries! We also have FREE AI tools for contractors. Reply 'AI' 🤖",
      "Last check-in, {{first_name}}! The R&D credit window closes 3 years after filing. If you've been filing without claiming, you're leaving money on the table. Reply 'LAST' ⏰",
      "Hey {{first_name}}, I'll stop reaching out after this. If you ever want to check on the R&D credit or any of our other recovery services, save this number. — Team Xtreme 📱",
      "{{first_name}}, thanks for your time! We're here whenever you need us — tax credits, utility audits, AI tools, or anything else. Save this number. — Team Xtreme 💪"
    ]
  },

  // ── 2. Commercial Utility Bill Audit ──
  {
    id: "utility_audit",
    name: "Commercial Utility Bill Audit",
    category: "Money Recovery",
    description: "Recover 12-36 months of electric/gas/water overcharges. Contingency fee.",
    target_industry: "universal",
    target_tags: ["pcu_alumni", "contractor", "business_owner"],
    ticket_range: "$2K-$15K per close (contingency)",
    system_prompt: "You are a commercial utility bill auditor. You find overcharges in electric, gas, and water bills going back 12-36 months. You work on contingency — the prospect pays nothing upfront, you take a percentage of recovered funds. Your messages are short, factual, and always end with a reply keyword. 80% of commercial accounts have errors. You're just helping them get their money back.",
    messages: [
      "Hey {{first_name}}! 80% of commercial utility accounts have billing errors. We audit 36 months of electric/gas/water bills and recover overcharges — at ZERO cost to you. Reply 'AUDIT' ⚡",
      "{{first_name}}, following up on the utility audit. Most businesses recover $3K-$15K. We do all the work, you pay nothing upfront. Reply 'CHECK' ✅",
      "Hey {{first_name}}! {{company}}'s electric bill might be overcharging you right now. Free 36-month audit, contingency only. Reply 'ELECTRIC' 💡",
      "{{first_name}}, example: a contractor we audited found $8,400 in overcharges across 2 years. We recovered it all. They paid nothing upfront. Reply 'EXAMPLE' 📊",
      "Hey {{first_name}}! Utility errors compound — every month you don't audit = more money lost. Free check, 5 minutes. Reply 'NOW' ⏰",
      "{{first_name}}, how it works: 1) You send us 1 recent bill 2) We audit 36 months 3) Utility refunds YOU 4) We take a small % on success. Reply 'HOW' 🤝",
      "Hey {{first_name}}! No pressure — but if {{company}} spends $500+/mo on utilities, there's likely an error. Free check. Reply 'MAYBE' 🔍",
      "{{first_name}}, we can also audit your phone/internet bills for overcharges. Same contingency model. Reply 'PHONE' 📞",
      "Hey {{first_name}}! Switching topics — we also recover R&D tax credits for contractors ($50K+). Same contingency. Reply 'TAX' if interested 💰",
      "{{first_name}}, circling back on the utility audit. One word 'STILL' and I'll send the info 📋",
      "Hey {{first_name}}! We can audit ALL your bills at once — utilities, phone, insurance. One conversation, maximum recovery. Reply 'ALL' 🔎",
      "{{first_name}}, if utility audit isn't for you, we also have FREE AI tools for contractors. Reply 'AI' 🤖",
      "Last check, {{first_name}}! The audit window closes at 36 months. Older overcharges can't be recovered. Reply 'LAST' ⏰",
      "Hey {{first_name}}, I'll stop after this. If you ever want a utility audit or any of our services, save this number. — Team Xtreme 📱",
      "{{first_name}}, thanks for your time! We're here for utility audits, tax credits, AI tools, and more. Save this number. — Team Xtreme 💪"
    ]
  },

  // ── 3. AI Business Automation ──
  {
    id: "ai_automation",
    name: "AI Business Automation",
    category: "Automation",
    description: "Replace manual tasks, save $50K+/year. High ticket, obvious ROI.",
    target_industry: "universal",
    target_tags: ["pcu_alumni", "contractor", "business_owner"],
    ticket_range: "$3K-$15K setup + $500/mo",
    system_prompt: "You are an AI automation specialist for small businesses. You replace manual tasks (scheduling, follow-ups, invoicing, lead responses) with AI, saving the owner $50K+/year in labor. Your offer: free audit of repetitive tasks, then a fixed-price automation package. Your messages are short, benefit-driven, and always end with a reply keyword. The ROI is obvious — the automation pays for itself in the first month.",
    messages: [
      "Hey {{first_name}}! What if {{company}} could save 10+ hours/week with AI? We automate scheduling, follow-ups, invoicing — no more manual work. FREE audit. Reply 'AI' 🤖",
      "{{first_name}}, following up on the AI automation. Most contractors save $50K+/year in labor costs. Free 15-min audit shows exactly how. Reply 'AUDIT' ✅",
      "Hey {{first_name}}! Imagine: leads auto-responded in 5 seconds, appointments booked without you, invoices chased automatically. We build it. Reply 'AUTO' ⚡",
      "{{first_name}}, example: a contractor we automated saved 12 hours/week and booked 3 extra jobs/month from instant lead responses. Reply 'EXAMPLE' 📊",
      "Hey {{first_name}}! Your competitors are already using AI to respond to leads faster. Every hour you wait = lost jobs. Free audit. Reply 'NOW' ⏰",
      "{{first_name}}, how it works: 1) Free 15-min audit 2) We identify your top 5 time-wasters 3) We build the automation 4) You save 10+ hrs/week. Reply 'HOW' 🤝",
      "Hey {{first_name}}! No pressure — but if you're spending 2+ hours/day on admin work, AI can do it for you. Free check. Reply 'MAYBE' 🔍",
      "{{first_name}}, we also build AI-powered websites that book jobs on autopilot. Reply 'WEBSITE' if interested 🏗️",
      "Hey {{first_name}}! We're offering a FREE AI follow-up message generator for contractors this week. No catch. Reply 'FREE' 🎁",
      "{{first_name}}, circling back on the AI automation. One word 'STILL' and I'll send the audit link 📋",
      "Hey {{first_name}}! We can automate your ENTIRE workflow — leads, scheduling, follow-ups, invoicing, reviews. One package. Reply 'ALL' 🔎",
      "{{first_name}}, if automation isn't for you, we also have FREE business templates (proposals, invoices, contracts). Reply 'TEMPLATES' 📋",
      "Last check, {{first_name}}! The free audit offer ends this week. Reply 'LAST' to grab it ⏰",
      "Hey {{first_name}}, I'll stop after this. If you ever want to automate your business or need AI tools, save this number. — Team Xtreme 📱",
      "{{first_name}}, thanks for your time! We're here for AI automation, websites, tools, and more. Save this number. — Team Xtreme 💪"
    ]
  },

  // ── 4. Merchant Processing Fee Reduction ──
  {
    id: "merchant_processing",
    name: "Merchant Processing Fee Reduction",
    category: "Money Recovery",
    description: "Cut credit card fees 20-40% with same processor. Contingency on first year savings.",
    target_industry: "universal",
    target_tags: ["pcu_alumni", "contractor", "retail"],
    ticket_range: "$2K-$20K per close (contingency)",
    system_prompt: "You are a merchant processing fee reduction specialist. You audit credit card processing statements and find hidden fees, surcharges, and rate markups. You reduce fees 20-40% with the SAME processor — no switching needed. You work on contingency: you take a percentage of first-year savings. Your messages are short, factual, and always end with a reply keyword. Every business that accepts cards is overpaying.",
    messages: [
      "Hey {{first_name}}! 90% of businesses overpay on credit card fees. We cut your rates 20-40% with the SAME processor — no switching. Free audit. Reply 'FEES' 💳",
      "{{first_name}}, following up on the fee audit. Most contractors save $200-$2,000/month. We do the work, you pay nothing upfront. Reply 'CHECK' ✅",
      "Hey {{first_name}}! {{company}} is likely paying hidden fees on every card transaction. Free 5-min statement audit. Reply 'AUDIT' 🔍",
      "{{first_name}}, example: a contractor we audited saved $1,800/month — that's $21,600/year back in their pocket. Same processor. Reply 'EXAMPLE' 📊",
      "Hey {{first_name}}! Every month you don't audit = hundreds in hidden fees lost. Free check. Reply 'NOW' ⏰",
      "{{first_name}}, how it works: 1) Send us 1 month's statement 2) We find the hidden fees 3) Your processor lowers your rates 4) You save 20-40%. Reply 'HOW' 🤝",
      "Hey {{first_name}}! No pressure — but if you process $10K+/month in cards, you're likely overpaying. Free check. Reply 'MAYBE' 💡",
      "{{first_name}}, we can also audit your phone/internet bills for overcharges. Same contingency. Reply 'PHONE' 📞",
      "Hey {{first_name}}! Switching topics — we also build AI-powered websites for contractors. Reply 'WEBSITE' if interested 🏗️",
      "{{first_name}}, circling back on the fee audit. One word 'STILL' and I'll send the info 📋",
      "Hey {{first_name}}! We can audit ALL your overhead — card fees, phone, utilities, insurance. One conversation, maximum savings. Reply 'ALL' 🔎",
      "{{first_name}}, if fee reduction isn't for you, we also have FREE AI tools for contractors. Reply 'AI' 🤖",
      "Last check, {{first_name}}! The free audit offer ends this week. Reply 'LAST' ⏰",
      "Hey {{first_name}}, I'll stop after this. If you ever want a fee audit or any of our services, save this number. — Team Xtreme 📱",
      "{{first_name}}, thanks for your time! We're here for fee audits, AI tools, websites, and more. Save this number. — Team Xtreme 💪"
    ]
  },

  // ── 5. Cybersecurity Breach Prevention ──
  {
    id: "cybersecurity",
    name: "Cybersecurity Breach Prevention",
    category: "Risk Elimination",
    description: "Avoid $50K-$5M breach costs. Free assessment, then remediation.",
    target_industry: "universal",
    target_tags: ["pcu_alumni", "business_owner", "professional_services"],
    ticket_range: "$2K-$25K setup + $500/mo monitoring",
    system_prompt: "You are a cybersecurity specialist for small businesses. You prevent data breaches that cost $50K-$5M each. Your offer: free security assessment, then a fixed-price remediation package. Your messages are short, urgency-driven, and always end with a reply keyword. 60% of small businesses close within 6 months of a breach. You're helping them avoid catastrophe.",
    messages: [
      "Hey {{first_name}}! 60% of businesses close within 6 months of a data breach. We do a FREE security assessment — no cost, no obligation. Reply 'SECURE' 🔒",
      "{{first_name}}, following up on the cybersecurity assessment. A breach costs $50K-$5M. Our assessment is free. Reply 'CHECK' ✅",
      "Hey {{first_name}}! Does {{company}} store customer data, emails, or payment info? If yes, you're a target. Free assessment. Reply 'SCAN' 🛡️",
      "{{first_name}}, example: a contractor we assessed had an open router that anyone could access. We fixed it in 1 hour. Free assessment. Reply 'EXAMPLE' 📊",
      "Hey {{first_name}}! Ransomware attacks on small businesses are up 300% this year. Free 15-min assessment. Reply 'NOW' ⏰",
      "{{first_name}}, how it works: 1) Free 15-min remote scan 2) We show you your vulnerabilities 3) You decide what to fix 4) We fix it. Reply 'HOW' 🤝",
      "Hey {{first_name}}! No pressure — but if you use email and store any customer data, you need this. Free check. Reply 'MAYBE' 🔍",
      "{{first_name}}, we also offer phishing training for your team — prevents 90% of breaches. Reply 'TRAIN' 👥",
      "Hey {{first_name}}! Switching topics — we also do utility bill audits (recover overcharges). Reply 'UTILITY' if interested ⚡",
      "{{first_name}}, circling back on the security assessment. One word 'STILL' and I'll send the link 📋",
      "Hey {{first_name}}! We can secure your ENTIRE business — network, email, data, backups. One package. Reply 'ALL' 🛡️",
      "{{first_name}}, if cybersecurity isn't a priority, we also have FREE AI tools for contractors. Reply 'AI' 🤖",
      "Last check, {{first_name}}! The free assessment offer ends this week. Reply 'LAST' ⏰",
      "Hey {{first_name}}, I'll stop after this. If you ever want a security check or any of our services, save this number. — Team Xtreme 📱",
      "{{first_name}}, thanks for your time! We're here for cybersecurity, AI tools, and more. Save this number. — Team Xtreme 💪"
    ]
  },

  // ── 6. SEO Optimization ──
  {
    id: "seo_optimization",
    name: "SEO Optimization",
    category: "Automation",
    description: "Rank higher, get free organic traffic. High ticket, ongoing monthly.",
    target_industry: "universal",
    target_tags: ["pcu_alumni", "contractor", "business_owner"],
    ticket_range: "$1K-$5K setup + $500-$2K/mo",
    system_prompt: "You are an SEO specialist for contractors and local businesses. You get them ranking on page 1 of Google for their key services, driving free organic traffic and leads. Your offer: free SEO audit showing exactly what's holding them back, then a fixed-price optimization package. Your messages are short, benefit-driven, and always end with a reply keyword. Every business with a website needs SEO — you're just showing them why.",
    messages: [
      "Hey {{first_name}}! Is {{company}} on page 1 of Google? If not, you're losing jobs to competitors who are. FREE SEO audit. Reply 'SEO' 🔍",
      "{{first_name}}, following up on the SEO audit. Most contractors are invisible on Google. We fix that. Free audit. Reply 'CHECK' ✅",
      "Hey {{first_name}}! When someone searches 'epoxy contractor near me' — do you show up? If not, your competitor gets the job. Free audit. Reply 'RANK' 📈",
      "{{first_name}}, example: a contractor we optimized went from page 5 to page 1 in 60 days. Leads tripled. Reply 'EXAMPLE' 📊",
      "Hey {{first_name}}! Every day you're not ranking = jobs going to competitors. Free 5-min audit. Reply 'NOW' ⏰",
      "{{first_name}}, how it works: 1) Free audit of your website 2) We show you what's broken 3) We fix it 4) You rank higher. Reply 'HOW' 🤝",
      "Hey {{first_name}}! No pressure — but if you have a website and you're not on page 1, you're leaving money on the table. Free check. Reply 'MAYBE' 💡",
      "{{first_name}}, we also build AI-powered websites that rank higher from day 1. Reply 'WEBSITE' if interested 🏗️",
      "Hey {{first_name}}! We also manage Google Ads for contractors — instant leads while SEO builds. Reply 'ADS' 📢",
      "{{first_name}}, circling back on the SEO audit. One word 'STILL' and I'll send the link 📋",
      "Hey {{first_name}}! We can handle your ENTIRE online presence — SEO, website, ads, reviews. One package. Reply 'ALL' 🔎",
      "{{first_name}}, if SEO isn't for you, we also have FREE AI tools for contractors. Reply 'AI' 🤖",
      "Last check, {{first_name}}! The free SEO audit offer ends this week. Reply 'LAST' ⏰",
      "Hey {{first_name}}, I'll stop after this. If you ever want SEO help or any of our services, save this number. — Team Xtreme 📱",
      "{{first_name}}, thanks for your time! We're here for SEO, websites, ads, AI tools, and more. Save this number. — Team Xtreme 💪"
    ]
  },

  // ── 7. Business Credit Building ──
  {
    id: "business_credit",
    name: "Business Credit Building",
    category: "Money Access",
    description: "Get $50K-$250K in unsecured business credit. Paid by lenders.",
    target_industry: "universal",
    target_tags: ["pcu_alumni", "business_owner", "contractor"],
    ticket_range: "$2K-$10K per close (paid by lender)",
    system_prompt: "You are a business credit specialist. You help businesses build $50K-$250K in unsecured credit lines (no personal guarantee, no collateral). You get paid by the lender, so the prospect pays nothing. Your messages are short, benefit-driven, and always end with a reply keyword. Every business owner needs capital — you're just connecting them to it at no cost.",
    messages: [
      "Hey {{first_name}}! Did you know you can get $50K-$250K in business credit with NO personal guarantee? We help you build it — at ZERO cost to you. Reply 'CREDIT' 💳",
      "{{first_name}}, following up on the business credit. Most owners qualify for $50K+ and don't know it. Free check. Reply 'CHECK' ✅",
      "Hey {{first_name}}! {{company}} could have $100K+ in credit lines available right now — no collateral, no personal guarantee. Free eligibility check. Reply 'FUNDS' 💰",
      "{{first_name}}, example: a contractor we helped got $150K in credit lines in 90 days. Used it to buy equipment and scale. Reply 'EXAMPLE' 📊",
      "Hey {{first_name}}! Business credit takes 90+ days to build. The sooner you start, the sooner you have capital. Free check. Reply 'NOW' ⏰",
      "{{first_name}}, how it works: 1) Free eligibility check 2) We build your credit profile 3) Lenders extend credit 4) You use it. Reply 'HOW' 🤝",
      "Hey {{first_name}}! No pressure — but if you've been in business 1+ years, you likely qualify. Free check. Reply 'MAYBE' 💡",
      "{{first_name}}, we also help with equipment financing ($0 down). Reply 'EQUIP' if interested 🏗️",
      "Hey {{first_name}}! Switching topics — we also do R&D tax credits for contractors ($50K+). Reply 'TAX' if interested 💰",
      "{{first_name}}, circling back on the business credit. One word 'STILL' and I'll run the check 📋",
      "Hey {{first_name}}! We can help with ALL your funding needs — credit, loans, grants, equipment. One conversation. Reply 'ALL' 🔎",
      "{{first_name}}, if credit isn't for you, we also have FREE AI tools for contractors. Reply 'AI' 🤖",
      "Last check, {{first_name}}! The free eligibility check ends this week. Reply 'LAST' ⏰",
      "Hey {{first_name}}, I'll stop after this. If you ever want business credit or any of our services, save this number. — Team Xtreme 📱",
      "{{first_name}}, thanks for your time! We're here for credit, loans, AI tools, and more. Save this number. — Team Xtreme 💪"
    ]
  },

  // ── 8. Review/Reputation Management ──
  {
    id: "reputation_management",
    name: "Review/Reputation Management",
    category: "Automation",
    description: "More 5-star reviews = more customers. Automated review generation.",
    target_industry: "universal",
    target_tags: ["pcu_alumni", "contractor", "local_business"],
    ticket_range: "$500-$2K setup + $200-$500/mo",
    system_prompt: "You are a reputation management specialist. You help businesses get more 5-star Google reviews automatically, which directly increases leads and revenue. Your offer: free reputation report showing their current rating vs competitors, then an automated review generation system. Your messages are short, benefit-driven, and always end with a reply keyword. 90% of customers read reviews before hiring — you're just helping them get more good ones.",
    messages: [
      "Hey {{first_name}}! 90% of customers check reviews before hiring. How many 5-star reviews does {{company}} have? We help you get more — automatically. FREE report. Reply 'REVIEWS' ⭐",
      "{{first_name}}, following up on the review system. More 5-star reviews = more jobs. We automate it. Free report. Reply 'CHECK' ✅",
      "Hey {{first_name}}! Your competitors have 50+ reviews. How many does {{company}} have? We close the gap — automatically. Reply 'RANK' 📈",
      "{{first_name}}, example: a contractor we helped went from 8 to 87 reviews in 90 days. Leads doubled. Reply 'EXAMPLE' 📊",
      "Hey {{first_name}}! Every job you complete without getting a review = a missed opportunity. Free report. Reply 'NOW' ⏰",
      "{{first_name}}, how it works: 1) Free reputation report 2) We set up auto-review requests 3) Customers leave reviews 4) You rank higher. Reply 'HOW' 🤝",
      "Hey {{first_name}}! No pressure — but if you're not actively collecting reviews, your competitors are pulling ahead. Free check. Reply 'MAYBE' 💡",
      "{{first_name}}, we also manage your Google profile (photos, posts, updates). Reply 'PROFILE' if interested 📋",
      "Hey {{first_name}}! Switching topics — we also do SEO to get you ranking higher on Google. Reply 'SEO' if interested 🔍",
      "{{first_name}}, circling back on the review system. One word 'STILL' and I'll send the report 📋",
      "Hey {{first_name}}! We can manage your ENTIRE online presence — reviews, SEO, website, ads. One package. Reply 'ALL' 🔎",
      "{{first_name}}, if reviews aren't a priority, we also have FREE AI tools for contractors. Reply 'AI' 🤖",
      "Last check, {{first_name}}! The free reputation report ends this week. Reply 'LAST' ⏰",
      "Hey {{first_name}}, I'll stop after this. If you ever want more reviews or any of our services, save this number. — Team Xtreme 📱",
      "{{first_name}}, thanks for your time! We're here for reviews, SEO, AI tools, and more. Save this number. — Team Xtreme 💪"
    ]
  },

  // ── 9. Google Ads Management ──
  {
    id: "google_ads",
    name: "Google Ads Management",
    category: "Automation",
    description: "More leads for less spend. High ticket, ongoing monthly.",
    target_industry: "universal",
    target_tags: ["pcu_alumni", "contractor", "business_owner"],
    ticket_range: "$1K-$3K setup + $500-$2K/mo",
    system_prompt: "You are a Google Ads specialist for contractors. You get them more leads for less ad spend by optimizing their campaigns, keywords, and landing pages. Your offer: free ads audit showing where their budget is being wasted, then a fixed-price management package. Your messages are short, benefit-driven, and always end with a reply keyword. Most contractors waste 40% of their ad budget — you're just helping them stop.",
    messages: [
      "Hey {{first_name}}! Are you running Google Ads? 40% of most ad budgets are wasted. We find and fix the waste — FREE audit. Reply 'ADS' 📢",
      "{{first_name}}, following up on the ads audit. Most contractors get 2x more leads with the SAME budget after we optimize. Free audit. Reply 'CHECK' ✅",
      "Hey {{first_name}}! {{company}} might be paying for clicks that never convert. Free audit shows exactly where. Reply 'AUDIT' 🔍",
      "{{first_name}}, example: a contractor we audited was wasting $1,200/month on bad keywords. We fixed it — same budget, 3x leads. Reply 'EXAMPLE' 📊",
      "Hey {{first_name}}! Every month you run unoptimized ads = wasted budget. Free 5-min audit. Reply 'NOW' ⏰",
      "{{first_name}}, how it works: 1) Free audit of your ads account 2) We show you the waste 3) We optimize 4) You get more leads. Reply 'HOW' 🤝",
      "Hey {{first_name}}! No pressure — but if you're spending $500+/month on ads, you're likely wasting some. Free check. Reply 'MAYBE' 💡",
      "{{first_name}}, we also build landing pages that convert 2x better. Reply 'LANDING' if interested 📄",
      "Hey {{first_name}}! Switching topics — we also do SEO for long-term free traffic. Reply 'SEO' if interested 🔍",
      "{{first_name}}, circling back on the ads audit. One word 'STILL' and I'll send the link 📋",
      "Hey {{first_name}}! We can handle your ENTIRE lead gen — ads, SEO, website, reviews. One package. Reply 'ALL' 🔎",
      "{{first_name}}, if ads management isn't for you, we also have FREE AI tools for contractors. Reply 'AI' 🤖",
      "Last check, {{first_name}}! The free ads audit ends this week. Reply 'LAST' ⏰",
      "Hey {{first_name}}, I'll stop after this. If you ever want ads help or any of our services, save this number. — Team Xtreme 📱",
      "{{first_name}}, thanks for your time! We're here for ads, SEO, AI tools, and more. Save this number. — Team Xtreme 💪"
    ]
  },

  // ── 10. Workers Comp Premium Recovery ──
  {
    id: "workers_comp",
    name: "Workers Comp Premium Recovery",
    category: "Money Recovery",
    description: "Get back overpaid premiums from misclassified employees. Contingency.",
    target_industry: "construction",
    target_tags: ["pcu_alumni", "contractor", "construction"],
    ticket_range: "$3K-$30K per close (contingency)",
    system_prompt: "You are a workers compensation premium recovery specialist for contractors. You find overpaid premiums caused by employee misclassification, incorrect payroll reporting, and experience modifier errors. You work on contingency — the prospect pays nothing upfront, you take a percentage of recovered premiums. Your messages are short, factual, and always end with a reply keyword. Most contractors overpay and don't know it.",
    messages: [
      "Hey {{first_name}}! 70% of contractors overpay on workers comp premiums. We recover the overpayment — at ZERO cost to you. Reply 'COMP' 🏗️",
      "{{first_name}}, following up on the workers comp audit. Most contractors recover $5K-$30K. We do the work. Reply 'CHECK' ✅",
      "Hey {{first_name}}! Are your workers properly classified? Wrong codes = overpaid premiums. Free audit. Reply 'AUDIT' 🔍",
      "{{first_name}}, example: a contractor we audited recovered $18,000 in overpaid premiums from a classification error. Reply 'EXAMPLE' 📊",
      "Hey {{first_name}}! Premiums compound — every year you overpay = more money lost. Free check. Reply 'NOW' ⏰",
      "{{first_name}}, how it works: 1) Free premium audit 2) We find misclassifications 3) Insurer refunds YOU 4) We take a small % on success. Reply 'HOW' 🤝",
      "Hey {{first_name}}! No pressure — but if you have 3+ employees, you might be overpaying. Free check. Reply 'MAYBE' 💡",
      "{{first_name}}, we can also audit your general liability and property insurance. Reply 'INSURANCE' 📋",
      "Hey {{first_name}}! Switching topics — we also do R&D tax credits ($50K+). Reply 'TAX' if interested 💰",
      "{{first_name}}, circling back on the comp audit. One word 'STILL' and I'll send the info 📋",
      "Hey {{first_name}}! We can audit ALL your insurance premiums at once — workers comp, liability, property, auto. Reply 'ALL' 🔎",
      "{{first_name}}, if comp recovery isn't for you, we also have FREE AI tools for contractors. Reply 'AI' 🤖",
      "Last check, {{first_name}}! The free audit ends this week. Reply 'LAST' ⏰",
      "Hey {{first_name}}, I'll stop after this. If you ever want a premium audit or any of our services, save this number. — Team Xtreme 📱",
      "{{first_name}}, thanks for your time! We're here for insurance audits, tax credits, AI tools, and more. Save this number. — Team Xtreme 💪"
    ]
  }
];

export function getPlaybook(id: string): Playbook | undefined {
  return PLAYBOOKS.find(p => p.id === id);
}

export function getPlaybookSummary() {
  return PLAYBOOKS.map(p => ({
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description,
    target_industry: p.target_industry,
    ticket_range: p.ticket_range,
    message_count: p.messages.length,
  }));
}