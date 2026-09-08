import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Server, Database, Cloud, Code2, Phone, Brain, Mail, MessageCircle, Workflow, Image, Palette, HardDrive, Shield, Zap, GitBranch, FileText, KeyRound, BarChart3, Webhook, Layers, Cpu, Globe, Lock, Radio, CheckCircle2, ChevronDown, ChevronRight, ExternalLink, Copy, Volume2, FlaskConical, MessageSquare, Smile } from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "overview", label: "System Overview", icon: BookOpen },
  { id: "architecture", label: "Architecture", icon: Layers },
  { id: "entities", label: "Data Entities", icon: Database },
  { id: "functions", label: "Backend Functions", icon: Server },
  { id: "integrations", label: "Integrations", icon: Cloud },
  { id: "channels", label: "Communication Channels", icon: Phone },
  { id: "ai", label: "AI & Agents", icon: Brain },
  { id: "creative", label: "Creative Studio", icon: Palette },
  { id: "workflows", label: "Workflow Engine", icon: GitBranch },
  { id: "google", label: "Google Workspace", icon: HardDrive },
  { id: "monitoring", label: "Live Monitoring", icon: Radio },
  { id: "api", label: "API Reference", icon: Code2 },
  { id: "security", label: "Security & Auth", icon: Shield },
  { id: "billing", label: "Billing & Plans", icon: BarChart3 },
];

const ENTITIES = [
  { name: "AgentPersona", category: "AI", desc: "Voice, email, phone, and social media agent personas with system prompts and voice IDs" },
  { name: "AiAgentConfig", category: "AI", desc: "Telnyx AI assistant configurations with LLM model, STT model, and voice settings" },
  { name: "AiVoiceSession", category: "Voice", desc: "Active and historical voice call sessions with transcripts and recording URLs" },
  { name: "ConversationMemory", category: "AI", desc: "Post-call summaries, action items, and agent notes for user review" },
  { name: "CommunicationTemplate", category: "Templates", desc: "Industry-specific templates across voice, SMS, MMS, WhatsApp, email, and social channels" },
  { name: "PromptLibrary", category: "AI", desc: "Reusable prompt templates for conversation flows, objection handling, and qualification" },
  { name: "IndustryProfile", category: "Intelligence", desc: "Industry-specific objection catalogs, qualification criteria, and KPI targets" },
  { name: "PhoneNumber", category: "Telephony", desc: "Provisioned phone numbers with capabilities, routing, and agent assignments" },
  { name: "NumberInventory", category: "Telephony", desc: "Wholesale number inventory with cost, markup, and resale tracking" },
  { name: "Campaign", category: "Campaigns", desc: "Multi-channel campaign configurations with audience targeting and scheduling" },
  { name: "CampaignContact", category: "Campaigns", desc: "Contact records with follow-up staging and conversion tracking" },
  { name: "WorkflowDesign", category: "Workflows", desc: "Drag-and-drop workflow designs with channel types, steps, and agent assignments" },
  { name: "CreativeAsset", category: "Creative", desc: "AI-generated images, videos, hooks, jokes, emojis, and social media content" },
  { name: "BrandKit", category: "Creative", desc: "Brand identity — colors, fonts, tagline — fed into all creative generators" },
  { name: "AvatarConfig", category: "AI", desc: "AI avatar configurations for HeyGen, D-ID, Synthesia, and other video avatar providers" },
  { name: "TestSession", category: "Testing", desc: "SMS, MMS, email, voice, and E2E test sessions with message logs and transcripts" },
  { name: "TestRun", category: "Testing", desc: "Dual-agent voice test runs with sentiment analysis and quality scoring" },
  { name: "ApiKey", category: "Security", desc: "Scoped API keys for admin and user authentication" },
  { name: "CustomerSubscription", category: "Billing", desc: "Customer plan, status, onboarding progress, and usage tracking" },
  { name: "PromoCode", category: "Billing", desc: "Promotional codes with discount types, usage limits, and plan applicability" },
  { name: "UserReplica", category: "AI", desc: "AI replica of a user with scraped personality, communication style, and preferences" },
];

const FUNCTIONS = [
  { name: "gatewayCalls", category: "Voice", desc: "Make and manage outbound/inbound voice calls via Telnyx" },
  { name: "gatewayMessages", category: "Messaging", desc: "Send and receive SMS/MMS messages" },
  { name: "gatewayEmail", category: "Email", desc: "Send transactional and marketing emails" },
  { name: "gatewayVerify", category: "Verification", desc: "Phone number verification via SMS/voice OTP" },
  { name: "gatewayLookups", category: "Lookup", desc: "Carrier lookup and number intelligence (HLR, CNAM)" },
  { name: "gatewayNumberSearch", category: "Telephony", desc: "Search available phone numbers for purchase" },
  { name: "managePhoneNumbers", category: "Telephony", desc: "Buy, release, and configure phone numbers" },
  { name: "manageCallRecording", category: "Voice", desc: "Start, stop, and retrieve call recordings" },
  { name: "orchestrateVoiceLoop", category: "AI", desc: "Orchestrate AI voice conversation loops with tool use" },
  { name: "orchestrateConversation", category: "AI", desc: "Multi-turn conversation orchestration across channels" },
  { name: "generateContent", category: "AI", desc: "LLM-powered content generation for prompts, templates, and scripts" },
  { name: "generateCreativeMedia", category: "Creative", desc: "Generate AI images and videos for marketing assets" },
  { name: "generateMmsCreative", category: "Creative", desc: "Generate MMS-specific creative content with branding" },
  { name: "generateCommunicationSuite", category: "Templates", desc: "Generate full communication template suites by industry" },
  { name: "generateIndustryTemplate", category: "Templates", desc: "Generate industry-specific templates with psychology notes" },
  { name: "scrapeCompanyIntelligence", category: "Intelligence", desc: "Scrape company website and industry data for AI knowledge base" },
  { name: "googleWorkspaceSync", category: "Integration", desc: "Sync intelligence, templates, and schedules to Google Drive/Gmail/Calendar" },
  { name: "testWorkflowDesign", category: "Workflows", desc: "Test workflow designs with LLM-powered simulation" },
  { name: "executeWorkflowEngine", category: "Workflows", desc: "Execute active workflow designs step-by-step" },
  { name: "runClosedLoopTest", category: "Testing", desc: "Run closed-loop E2E tests across channels" },
  { name: "runAutonomousAudit", category: "System", desc: "Autonomous system audit for capability coverage and parity" },
  { name: "preflightHeal", category: "System", desc: "Auto-heal system issues identified by audits" },
  { name: "create-checkout", category: "Billing", desc: "Create Base44 Payments checkout sessions for plans and credits" },
  { name: "payments-webhook", category: "Billing", desc: "Handle payment webhooks and grant access on successful payment" },
  { name: "telnyxWebhook", category: "Webhooks", desc: "Handle inbound Telnyx webhooks for calls and messages" },
];

const INTEGRATIONS = [
  { name: "Telnyx", type: "Telephony Provider", status: "LIVE", desc: "Voice, SMS, MMS, phone number provisioning, AI assistant management", icon: Phone },
  { name: "Base44 Payments (Wix)", type: "Payment Processing", status: "LIVE", desc: "Checkout, subscriptions, and one-time purchases", icon: BarChart3 },
  { name: "Supabase", type: "Database & Auth", status: "LIVE", desc: "PostgreSQL database, authentication, row-level security, edge functions", icon: Database },
  { name: "Google Drive", type: "File Storage", status: "CONNECTED", desc: "Sync intelligence, templates, and creative assets to Drive", icon: HardDrive },
  { name: "Gmail", type: "Email Integration", status: "CONNECTED", desc: "Link email threads to agent memory and send via Gmail", icon: Mail },
  { name: "Google Calendar", type: "Scheduling", status: "CONNECTED", desc: "Auto-log agent tasks and scheduling playbooks", icon: Globe },
  { name: "Google Tasks", type: "Task Management", status: "CONNECTED", desc: "Sync agent action items to Google Tasks", icon: CheckCircle2 },
  { name: "Google Docs", type: "Document Sync", status: "CONNECTED", desc: "Export intelligence reports and templates to Google Docs", icon: FileText },
  { name: "Google Sheets", type: "Data Export", status: "CONNECTED", desc: "Export campaign and contact data to Google Sheets", icon: BarChart3 },
  { name: "Core LLM", type: "AI Engine", status: "LIVE", desc: "GPT-5, Claude, Gemini models for content generation and conversation", icon: Brain },
  { name: "Core Image Gen", type: "Image Generation", status: "LIVE", desc: "AI image generation for marketing assets and creative content", icon: Image },
  { name: "Core Video Gen", type: "Video Generation", status: "LIVE", desc: "AI video generation via Google Veo 3.x", icon: Zap },
  { name: "Core TTS", type: "Text-to-Speech", status: "LIVE", desc: "High-quality multilingual speech synthesis", icon: Cpu },
  { name: "Core Whisper", type: "Speech-to-Text", status: "LIVE", desc: "Audio transcription via Whisper", icon: Radio },
];

export default function CoreDocs() {
  const [active, setActive] = useState("overview");
  const [expanded, setExpanded] = useState({});

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">Core Documentation</h1>
              <p className="text-sm text-muted-foreground">Complete system reference for XTREME Communications OS</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="px-2 py-0.5 rounded-full bg-status-green/10 text-status-green text-xs font-medium">v2.0</span>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">Production</span>
            <span className="text-xs text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 flex gap-6">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 hidden md:block">
          <nav className="sticky top-6 space-y-0.5">
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => setActive(s.id)}
                className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                  active === s.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                <s.icon className="h-4 w-4 shrink-0" /> {s.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Overview */}
          {active === "overview" && (
            <div className="space-y-6">
              <DocSection title="What is XTREME Communications OS?">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  XTREME Communications OS is an autonomous, production-grade communications command center providing
                  full-stack orchestration for SMS, voice, WhatsApp, and AI-driven engagement. It combines telephony
                  infrastructure, AI agent management, creative content generation, workflow automation, and real-time
                  observability into a single platform.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                  The system is built on Base44's backend-as-a-service platform with Supabase as the authoritative data
                  layer, Telnyx as the telephony provider, and Google Workspace for per-user intelligence sync.
                </p>
              </DocSection>
              <DocSection title="Core Capabilities">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { icon: Phone, title: "Full-Stack Telephony", desc: "Voice, SMS, MMS, WhatsApp, phone number provisioning, SIP trunking" },
                    { icon: Brain, title: "AI Agent Management", desc: "Conversational AI with natural voices, tool use, and memory" },
                    { icon: GitBranch, title: "Workflow Automation", desc: "Drag-and-drop workflow builder with 5 channel types and 9 step types" },
                    { icon: Palette, title: "Creative Studio", desc: "AI image, video, emoji, GIF, joke, and social media content generation" },
                    { icon: HardDrive, title: "Google Workspace Sync", desc: "Auto-sync intelligence, templates, and schedules to Drive, Gmail, Calendar" },
                    { icon: Radio, title: "Live Monitoring", desc: "Real-time call transcripts, audio playback, and agent performance metrics" },
                    { icon: FlaskConical, title: "Testing Studio", desc: "Phone, email, and dual-agent voice testing with E2E loop validation" },
                    { icon: BarChart3, title: "Billing & Analytics", desc: "Pay-as-you-go and subscription plans with usage metering" },
                  ].map(c => (
                    <div key={c.title} className="rounded-lg border border-border bg-card p-4">
                      <c.icon className="h-5 w-5 text-primary mb-2" />
                      <h3 className="text-sm font-medium text-foreground mb-1">{c.title}</h3>
      <p className="text-xs text-muted-foreground">{c.desc}</p>
                    </div>
                  ))}
                </div>
              </DocSection>
              <DocSection title="System Architecture">
                <div className="rounded-lg border border-border bg-card p-4 font-mono text-xs text-muted-foreground">
                  <pre>{`┌─────────────────────────────────────────────────────────┐
│                    Frontend (React + Tailwind)            │
│  Marketing Site │ Customer Portal │ Admin Portal │ Core   │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│              Base44 Backend (Functions + SDK)              │
│  Gateway Functions │ AI Orchestration │ Sync │ Billing   │
└──────┬──────────┬──────────┬──────────┬──────────────────┘
       │          │          │          │
  ┌────▼───┐ ┌───▼────┐ ┌──▼───┐ ┌──▼──────────┐
  │Telnyx  │ │Supabase│ │Core  │ │Google        │
  │Telephony│ │Database│ │AI/LLM│ │Workspace     │
  └────────┘ └────────┘ └──────┘ └──────────────┘`}</pre>
                </div>
              </DocSection>
            </div>
          )}

          {/* Architecture */}
          {active === "architecture" && (
            <div className="space-y-6">
              <DocSection title="System Architecture">
                <p className="text-sm text-muted-foreground">The system follows a layered architecture with clear separation of concerns:</p>
                <div className="space-y-3 mt-4">
                  {[
                    { layer: "Presentation Layer", tech: "React + Tailwind CSS + shadcn/ui", desc: "Marketing site, customer portal, admin portal, and core documentation" },
                    { layer: "API Gateway Layer", tech: "Base44 Functions (TypeScript)", desc: "46+ backend functions handling telephony, AI, sync, billing, and system operations" },
                    { layer: "Business Logic Layer", tech: "Entity SDK + Shared Modules", desc: "30+ data entities with RLS, validation, and business rules" },
                    { layer: "Provider Layer", tech: "Telnyx + Google + Core AI", desc: "External service integrations via OAuth connectors and API keys" },
                    { layer: "Data Layer", tech: "Supabase PostgreSQL", desc: "Authoritative data store with row-level security and real-time subscriptions" },
                  ].map(l => (
                    <div key={l.layer} className="rounded-lg border border-border bg-card p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Layers className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-medium text-foreground">{l.layer}</h3>
                      </div>
                      <p className="text-xs text-primary font-mono mb-1">{l.tech}</p>
                      <p className="text-xs text-muted-foreground">{l.desc}</p>
                    </div>
                  ))}
                </div>
              </DocSection>
              <DocSection title="Autonomous Loop">
                <p className="text-sm text-muted-foreground mb-3">The system includes a forensic autonomous loop for self-monitoring and self-healing:</p>
                <div className="flex items-center gap-2 text-xs">
                  {["Vision Cortex (Plan)", "→", "AutoBuilder (Build)", "→", "Faultline (Audit)", "→", "Cloud Browser (Verify)"].map((s, i) => (
                    <span key={i} className={cn("px-3 py-1.5 rounded-lg", i % 2 === 0 ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground")}>{s}</span>
                  ))}
                </div>
              </DocSection>
            </div>
          )}

          {/* Entities */}
          {active === "entities" && (
            <DocSection title="Data Entities">
              <p className="text-sm text-muted-foreground mb-4">The system uses 30+ data entities to store all communications, AI, and business data. All entities include built-in fields: id, created_date, updated_date, created_by_id.</p>
              <div className="space-y-2">
                {ENTITIES.map(e => (
                  <div key={e.name} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Database className="h-3.5 w-3.5 text-primary" />
                      <code className="text-sm font-mono text-foreground font-medium">{e.name}</code>
                      <span className="px-1.5 py-0.5 rounded bg-accent text-[10px] text-muted-foreground uppercase">{e.category}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{e.desc}</p>
                  </div>
                ))}
              </div>
            </DocSection>
          )}

          {/* Functions */}
          {active === "functions" && (
            <DocSection title="Backend Functions">
              <p className="text-sm text-muted-foreground mb-4">46+ backend functions handle all server-side operations. Functions are invoked via <code className="text-primary">base44.functions.invoke('functionName', payload)</code>.</p>
              <div className="space-y-2">
                {FUNCTIONS.map(f => (
                  <div key={f.name} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Server className="h-3.5 w-3.5 text-primary" />
                      <code className="text-sm font-mono text-foreground font-medium">{f.name}</code>
                      <span className="px-1.5 py-0.5 rounded bg-accent text-[10px] text-muted-foreground uppercase">{f.category}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </div>
                ))}
              </div>
            </DocSection>
          )}

          {/* Integrations */}
          {active === "integrations" && (
            <DocSection title="Integrations">
              <div className="space-y-2">
                {INTEGRATIONS.map(i => (
                  <div key={i.name} className="rounded-lg border border-border bg-card p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><i.icon className="h-4 w-4 text-primary" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-foreground">{i.name}</h3>
                        <span className="text-[10px] text-muted-foreground">{i.type}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{i.desc}</p>
                    </div>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0",
                      i.status === "LIVE" ? "bg-status-green/10 text-status-green" :
                      i.status === "CONNECTED" ? "bg-primary/10 text-primary" :
                      "bg-accent text-muted-foreground")}>{i.status}</span>
                  </div>
                ))}
              </div>
            </DocSection>
          )}

          {/* Channels */}
          {active === "channels" && (
            <DocSection title="Communication Channels">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { icon: Phone, title: "Voice", desc: "Inbound/outbound calls, IVR, call recording, SIP trunking, conferencing. Powered by Telnyx.", endpoints: ["gatewayCalls", "manageCallRecording", "orchestrateVoiceLoop"] },
                  { icon: MessageSquare, title: "SMS & MMS", desc: "Text and multimedia messaging with A2P 10DLC compliance. Delivery receipts and threading.", endpoints: ["gatewayMessages"] },
                  { icon: MessageCircle, title: "WhatsApp Business", desc: "Template messages, session messaging, and business API integration.", endpoints: ["gatewayMessages"] },
                  { icon: Mail, title: "Email", desc: "Transactional and marketing email with AI-generated content and tracking.", endpoints: ["gatewayEmail"] },
                  { icon: Globe, title: "Social Media", desc: "Facebook, Instagram, TikTok, Snapchat, X/Twitter, LinkedIn content generation and scheduling.", endpoints: ["generateCreativeMedia"] },
                ].map(c => (
                  <div key={c.title} className="rounded-lg border border-border bg-card p-4">
                    <c.icon className="h-5 w-5 text-primary mb-2" />
                    <h3 className="text-sm font-medium text-foreground mb-1">{c.title}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{c.desc}</p>
                    <div className="flex flex-wrap gap-1">
                      {c.endpoints.map(e => <code key={e} className="px-1.5 py-0.5 rounded bg-accent text-[10px] text-primary font-mono">{e}</code>)}
                    </div>
                  </div>
                ))}
              </div>
            </DocSection>
          )}

          {/* AI */}
          {active === "ai" && (
            <div className="space-y-6">
              <DocSection title="AI Agent Architecture">
                <p className="text-sm text-muted-foreground">AI agents are configured through AgentPersona entities and deployed via Telnyx AI Assistants. Each agent has:</p>
                <ul className="mt-3 space-y-1.5">
                  {["System prompt defining behavior and personality", "Voice ID from Telnyx Ultra voice library", "LLM model selection (Claude, GPT, Gemini)", "STT model (Deepgram Nova-3 by default)", "Interruption handling and expressive mode", "Tool use for scheduling, lookups, and transfers", "Memory window for conversation context"].map(item => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-status-green shrink-0 mt-0.5" /> {item}</li>
                  ))}
                </ul>
              </DocSection>
              <DocSection title="AI Features">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { title: "Industry Intelligence", desc: "Scrape company websites and industry data to build knowledge bases for AI agents" },
                    { title: "Template Generation", desc: "AI-generated communication templates with psychology notes and effectiveness scoring" },
                    { title: "Dual-Agent Testing", desc: "Run two AI agents against each other with sentiment analysis and quality scoring" },
                    { title: "User Replicas", desc: "Create AI replicas of users with scraped personality traits and communication styles" },
                    { title: "Agent Memory", desc: "Post-call summaries, action items, and notes automatically generated after conversations" },
                    { title: "Content Generation", desc: "LLM-powered generation of prompts, scripts, jokes, social media posts, and more" },
                  ].map(f => (
                    <div key={f.title} className="rounded-lg border border-border bg-card p-3">
                      <h3 className="text-sm font-medium text-foreground mb-1">{f.title}</h3>
                      <p className="text-xs text-muted-foreground">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </DocSection>
            </div>
          )}

          {/* Creative */}
          {active === "creative" && (
            <div className="space-y-6">
              <DocSection title="Creative Studio">
                <p className="text-sm text-muted-foreground">The Creative Studio (Content Library) generates AI-powered marketing assets:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                  {[
                    { icon: Image, label: "AI Images" },
                    { icon: Image, label: "Human Images" },
                    { icon: Smile, label: "Emoji Sets" },
                    { icon: Zap, label: "GIF Style" },
                    { icon: FileText, label: "Jokes" },
                    { icon: Globe, label: "Social Posts" },
                    { icon: Zap, label: "AI Videos" },
                    { icon: FileText, label: "Uploads" },
                  ].map(g => (
                    <div key={g.label} className="rounded-lg border border-border bg-card p-3 text-center">
                      <g.icon className="h-5 w-5 text-primary mx-auto mb-1" />
                      <p className="text-xs font-medium text-foreground">{g.label}</p>
                    </div>
                  ))}
                </div>
              </DocSection>
              <DocSection title="Brand Kit">
                <p className="text-sm text-muted-foreground">Save your brand identity — primary color, secondary color, accent color, fonts, tagline — and feed it into all creative generators for consistent, on-brand assets across every channel.</p>
              </DocSection>
              <DocSection title="MMS Creative Studio">
                <p className="text-sm text-muted-foreground">Generate MMS-specific creative content with your brand colors, company context, and target audience. Each asset is saved to the CreativeAsset entity for reuse.</p>
              </DocSection>
            </div>
          )}

          {/* Workflows */}
          {active === "workflows" && (
            <DocSection title="Workflow Engine">
              <p className="text-sm text-muted-foreground mb-4">The Workflow Generator provides drag-and-drop workflow building for multi-channel communications:</p>
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2">Channel Types</h3>
                  <div className="flex flex-wrap gap-2">
                    {["Mobile", "Voice", "WhatsApp", "Email", "Custom"].map(c => <span key={c} className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium">{c}</span>)}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2">Step Types</h3>
                  <div className="flex flex-wrap gap-2">
                    {["AI Agent", "Time Window", "Day of Week", "Delay", "Script", "Template", "Message", "Image", "Condition"].map(c => <span key={c} className="px-2 py-1 rounded-lg bg-accent text-muted-foreground text-xs">{c}</span>)}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2">Testing</h3>
                  <p className="text-xs text-muted-foreground">Each workflow can be tested via the <code className="text-primary">testWorkflowDesign</code> backend function, which runs an LLM-powered simulation against a target phone number.</p>
                </div>
              </div>
            </DocSection>
          )}

          {/* Google */}
          {active === "google" && (
            <DocSection title="Google Workspace Integration">
              <p className="text-sm text-muted-foreground mb-4">Per-user Google Workspace sync for intelligence, templates, and schedules:</p>
              <div className="space-y-3">
                {[
                  { icon: HardDrive, title: "Google Drive", desc: "Auto-save company intelligence reports, communication templates, and creative assets to organized Drive folders" },
                  { icon: Mail, title: "Gmail", desc: "Link email threads to agent memory records. Send outbound emails via Gmail integration. Auto-log email conversations." },
                  { icon: Globe, title: "Google Calendar", desc: "Auto-log agent tasks and scheduling playbooks to Calendar. Two-way sync for appointment scheduling." },
                  { icon: CheckCircle2, title: "Google Tasks", desc: "Sync agent action items from ConversationMemory to Google Tasks for follow-up tracking" },
                  { icon: FileText, title: "Google Docs", desc: "Export intelligence reports and communication templates to Google Docs for collaborative editing" },
                  { icon: BarChart3, title: "Google Sheets", desc: "Export campaign contacts, performance metrics, and usage data to Google Sheets for analysis" },
                ].map(g => (
                  <div key={g.title} className="rounded-lg border border-border bg-card p-3 flex items-start gap-3">
                    <g.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-foreground">{g.title}</h3>
                      <p className="text-xs text-muted-foreground">{g.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/30">
                <p className="text-xs text-foreground"><strong>Auto-Sync:</strong> Intelligence, templates, and agent schedules sync automatically to your Google Workspace when auto-sync is enabled in the <Link to="/portal/google-workspace" className="text-primary hover:underline">Google Workspace dashboard</Link>.</p>
              </div>
            </DocSection>
          )}

          {/* Monitoring */}
          {active === "monitoring" && (
            <DocSection title="Live Monitoring">
              <p className="text-sm text-muted-foreground mb-4">Real-time monitoring of AI agent voice calls with live transcripts and audio playback:</p>
              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-card p-3">
                  <Radio className="h-5 w-5 text-primary mb-2" />
                  <h3 className="text-sm font-medium text-foreground mb-1">Live Call Viewer</h3>
                  <p className="text-xs text-muted-foreground">View active and recent voice sessions in real-time. Auto-refreshes every 5 seconds. Shows caller, agent, duration, and call status.</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <Volume2 className="h-5 w-5 text-primary mb-2" />
                  <h3 className="text-sm font-medium text-foreground mb-1">Audio Playback</h3>
                  <p className="text-xs text-muted-foreground">Play back call recordings directly from the viewer. Recording URLs are stored on the AiVoiceSession entity.</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <FileText className="h-5 w-5 text-primary mb-2" />
                  <h3 className="text-sm font-medium text-foreground mb-1">Live Transcripts</h3>
                  <p className="text-xs text-muted-foreground">View real-time conversation transcripts with speaker labels. Transcripts update as the call progresses.</p>
                </div>
              </div>
              <div className="mt-4">
                <Link to="/admin-portal" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                  Open Live Monitoring <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </DocSection>
          )}

          {/* API */}
          {active === "api" && (
            <DocSection title="API Reference">
              <p className="text-sm text-muted-foreground mb-4">All backend functions are accessible via the Base44 SDK. Use API keys for authentication:</p>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-foreground">Invocation Pattern</h3>
                  <button onClick={() => navigator.clipboard.writeText("await base44.functions.invoke('functionName', { ...payload })")} className="text-muted-foreground hover:text-foreground"><Copy className="h-3.5 w-3.5" /></button>
                </div>
                <pre className="text-xs font-mono text-muted-foreground bg-background p-3 rounded-lg overflow-x-auto">{`// From frontend code
import { base44 } from '@/api/base44Client';

const result = await base44.functions.invoke('gatewayMessages', {
  to: '+15551234567',
  body: 'Hello from XTREME!'
});

// Entity operations
const agents = await base44.entities.AgentPersona.list('-created_date', 20);
const agent = await base44.entities.AgentPersona.create({
  name: 'Sarah',
  persona_type: 'voice',
  system_prompt: 'You are a helpful assistant...'
});`}</pre>
              </div>
              <div className="mt-4 rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-medium text-foreground mb-2">External API Access</h3>
                <p className="text-xs text-muted-foreground mb-2">Use API keys (generated from the Admin Portal or API Keys page) to access the system externally:</p>
                <pre className="text-xs font-mono text-muted-foreground bg-background p-3 rounded-lg overflow-x-auto">{`curl -X POST https://xtreme-comms.base44.app/functions/gatewayMessages \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"to": "+15551234567", "body": "Hello"}'`}</pre>
              </div>
            </DocSection>
          )}

          {/* Security */}
          {active === "security" && (
            <div className="space-y-6">
              <DocSection title="Authentication">
                <p className="text-sm text-muted-foreground">The platform uses Base44's built-in authentication with email/password, Google OAuth, and API key authentication. All auth flows are managed by the platform — no custom auth backend logic.</p>
              </DocSection>
              <DocSection title="API Key Security">
                <p className="text-sm text-muted-foreground">API keys are scoped to specific operations (sms, mms, voice, whatsapp, email, numbers, agents, billing, admin). Keys can be created and revoked from the Admin Portal or API Keys page.</p>
              </DocSection>
              <DocSection title="Row-Level Security">
                <p className="text-sm text-muted-foreground">Entity-level RLS ensures users can only access their own data. Admin users have elevated access for system management. RLS rules are configured per entity in the entity schema files.</p>
              </DocSection>
              <DocSection title="Compliance">
                <div className="space-y-2">
                  {["A2P 10DLC compliant messaging", "SOC2 compliant infrastructure", "Encrypted at rest and in transit", "Token-based auth with scoped API keys", "GDPR-ready data handling"].map(c => (
                    <div key={c} className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="h-4 w-4 text-status-green" /> {c}</div>
                  ))}
                </div>
              </DocSection>
            </div>
          )}

          {/* Billing */}
          {active === "billing" && (
            <div className="space-y-6">
              <DocSection title="Plans">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { name: "Starter", price: "$49/mo", features: "1 number, 1 agent, 500 SMS" },
                    { name: "Essential", price: "$99/mo", features: "3 numbers, 2 agents, 2K SMS" },
                    { name: "Professional", price: "$149/mo", features: "5 numbers, 3 agents, WhatsApp" },
                    { name: "Growth", price: "$199/mo", features: "5 numbers, 5 agents, 5K SMS", featured: true },
                    { name: "Enterprise", price: "Custom", features: "Unlimited everything, SLA" },
                    { name: "Pay-As-You-Go", price: "$0/mo", features: "Pay only for what you use" },
                  ].map(p => (
                    <div key={p.name} className={cn("rounded-lg border p-3", p.featured ? "border-primary bg-primary/5" : "border-border bg-card")}>
                      <h3 className="text-sm font-medium text-foreground">{p.name}</h3>
                      <p className="text-lg font-display font-bold text-foreground">{p.price}</p>
                      <p className="text-xs text-muted-foreground">{p.features}</p>
                    </div>
                  ))}
                </div>
              </DocSection>
              <DocSection title="Payment Processing">
                <p className="text-sm text-muted-foreground">Payments are processed via Base44 Payments (powered by Wix). The <code className="text-primary">create-checkout</code> function creates checkout sessions, and the <code className="text-primary">payments-webhook</code> function handles payment confirmation and access granting.</p>
              </DocSection>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DocSection({ title, children }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-display font-bold text-foreground mb-3">{title}</h2>
      {children}
    </div>
  );
}