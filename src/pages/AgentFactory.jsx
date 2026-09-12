import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import {
  Rocket, Bot, Users, Ghost, Zap, Phone, MessageSquare, Mail, Globe,
  Brain, Shield, Plus, Check, X, Loader2, RefreshCw, Trash2, Play,
  Pause, Network, KeyRound, Cpu, Sparkles, Send, Eye,
  Smartphone, MousePointer, Share2
} from "lucide-react";

const TIERS = [
  {
    key: "standard",
    label: "Standard Agent",
    icon: Bot,
    color: "text-blue-400",
    border: "border-blue-500/30",
    bg: "bg-blue-500/5",
    desc: "Single-channel worker for one task",
    defaults: { capabilities: ["sms"], power_level: 1, autonomy: "supervised" },
  },
  {
    key: "super",
    label: "Super Agent",
    icon: Zap,
    color: "text-accent-orange",
    border: "border-accent-orange/40",
    bg: "bg-accent-orange/5",
    desc: "Multi-channel powerhouse with full comms + browser + API",
    defaults: { capabilities: ["sms", "mms", "voice", "whatsapp", "cloud_browser", "web_interact", "api_access"], power_level: 7, autonomy: "autonomous" },
  },
  {
    key: "swarm",
    label: "AGI Swarm",
    icon: Users,
    color: "text-purple-400",
    border: "border-purple-500/30",
    bg: "bg-purple-500/5",
    desc: "Coordinator + workers that collaborate on complex missions",
    defaults: { capabilities: ["sms", "voice", "cloud_browser", "web_interact"], power_level: 5, autonomy: "autonomous" },
  },
  {
    key: "fulfillment",
    label: "Fulfillment Agent",
    icon: Rocket,
    color: "text-status-green",
    border: "border-status-green/30",
    bg: "bg-status-green/5",
    desc: "Executes tasks via cloud + phone browser, SMS, MMS, voice, API",
    defaults: { capabilities: ["sms", "mms", "voice", "cloud_browser", "phone_browser", "web_interact", "api_access", "cross_site_automation"], power_level: 6, autonomy: "autonomous" },
  },
  {
    key: "shadow",
    label: "Shadow Agent",
    icon: Ghost,
    color: "text-slate-400",
    border: "border-slate-500/30",
    bg: "bg-slate-500/5",
    desc: "Stealth operative — fully autonomous, cross-site, API-driven",
    defaults: { capabilities: ["sms", "voice", "cloud_browser", "web_interact", "api_access", "cross_site_automation", "shadow_mode"], power_level: 9, autonomy: "fully_autonomous" },
  },
];

const ALL_CAPS = [
  { key: "sms", label: "SMS", icon: MessageSquare },
  { key: "mms", label: "MMS", icon: MessageSquare },
  { key: "voice", label: "Voice Calls", icon: Phone },
  { key: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { key: "email", label: "Email", icon: Mail },
  { key: "cloud_browser", label: "Cloud Browser", icon: Globe },
  { key: "phone_browser", label: "Phone Browser", icon: Smartphone },
  { key: "web_interact", label: "Web Interact", icon: MousePointer },
  { key: "api_access", label: "API Access", icon: KeyRound },
  { key: "cross_site_automation", label: "Cross-Site Auto", icon: Network },
  { key: "shadow_mode", label: "Shadow Mode", icon: Ghost },
  { key: "social_media", label: "Social Media", icon: Share2 },
];

export default function AgentFactory() {
  const [agents, setAgents] = useState([]);
  const [numbers, setNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedTier, setSelectedTier] = useState("super");
  const [showForm, setShowForm] = useState(false);
  const [showSwarmForm, setShowSwarmForm] = useState(false);
  const [showApiCreds, setShowApiCreds] = useState(false);
  const [executing, setExecuting] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    system_prompt: "",
    tone: "",
    assigned_number: "",
    target_industry: "",
    capabilities: [],
    shadow_mode: false,
    power_level: 7,
    autonomy_level: "autonomous",
    assigned_context: "",
    // Swarm
    swarm_role: "worker",
    swarm_coordinator_id: "",
    // Fulfillment
    fulfillment_browser: "cloud",
    fulfillment_auto_execute: true,
    // API creds
    api_credentials: [],
  });

  // Swarm form
  const [swarmForm, setSwarmForm] = useState({
    swarm_name: "",
    coordinator_name: "",
    worker_count: 3,
    system_prompt: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [agentList, numList] = await Promise.all([
        base44.entities.AgentPersona.list("-provisioned_at", 50).catch(() => []),
        base44.entities.PhoneNumber.list("-created_date", 30).catch(() => []),
      ]);
      setAgents(agentList || []);
      setNumbers(numList || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectTier = (tierKey) => {
    const tier = TIERS.find(t => t.key === tierKey);
    setSelectedTier(tierKey);
    setForm(prev => ({
      ...prev,
      capabilities: tier.defaults.capabilities,
      power_level: tier.defaults.power_level,
      autonomy_level: tier.defaults.autonomy,
      shadow_mode: tierKey === "shadow",
    }));
  };

  const toggleCap = (cap) => {
    setForm(prev => ({
      ...prev,
      capabilities: prev.capabilities.includes(cap)
        ? prev.capabilities.filter(c => c !== cap)
        : [...prev.capabilities, cap],
    }));
  };

  const addApiCredential = () => {
    setForm(prev => ({
      ...prev,
      api_credentials: [...prev.api_credentials, {
        site_name: "", base_url: "", username: "", password: "", api_key: "", auth_type: "basic",
      }],
    }));
  };

  const updateApiCredential = (i, field, value) => {
    setForm(prev => {
      const creds = [...prev.api_credentials];
      creds[i] = { ...creds[i], [field]: value };
      return { ...prev, api_credentials: creds };
    });
  };

  const removeApiCredential = (i) => {
    setForm(prev => ({
      ...prev,
      api_credentials: prev.api_credentials.filter((_, idx) => idx !== i),
    }));
  };

  const createAgent = async () => {
    if (!form.name.trim()) { setError("Agent name is required"); return; }
    setCreating(true);
    setError(null);
    try {
      const payload = {
        action: "provision",
        name: form.name,
        agent_tier: selectedTier,
        system_prompt: form.system_prompt,
        tone: form.tone,
        assigned_number: form.assigned_number,
        target_industry: form.target_industry,
        capabilities: form.capabilities,
        shadow_mode: form.shadow_mode,
        power_level: form.power_level,
        autonomy_level: form.autonomy_level,
        assigned_context: form.assigned_context,
        swarm_role: form.swarm_role,
        swarm_coordinator_id: form.swarm_coordinator_id,
        fulfillment_config: {
          auto_execute: form.fulfillment_auto_execute,
          browser_type: form.fulfillment_browser,
        },
        api_credentials: form.api_credentials,
      };
      const res = await base44.functions.invoke("provisionSuperAgent", payload);
      setSuccess(`Agent "${form.name}" provisioned successfully`);
      setShowForm(false);
      setForm({
        name: "", system_prompt: "", tone: "", assigned_number: "", target_industry: "",
        capabilities: [], shadow_mode: false, power_level: 7, autonomy_level: "autonomous",
        assigned_context: "", swarm_role: "worker", swarm_coordinator_id: "",
        fulfillment_browser: "cloud", fulfillment_auto_execute: true, api_credentials: [],
      });
      await load();
      setTimeout(() => setSuccess(null), 4000);
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const createSwarm = async () => {
    if (!swarmForm.swarm_name || !swarmForm.coordinator_name) { setError("Swarm name and coordinator name required"); return; }
    setCreating(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("provisionSuperAgent", {
        action: "create_swarm",
        swarm_name: swarmForm.swarm_name,
        coordinator_name: swarmForm.coordinator_name,
        worker_count: parseInt(swarmForm.worker_count) || 3,
        worker_template: { system_prompt: swarmForm.system_prompt },
      });
      const data = res?.data || res;
      setSuccess(`Swarm "${swarmForm.swarm_name}" created with ${data.worker_count} workers`);
      setShowSwarmForm(false);
      setSwarmForm({ swarm_name: "", coordinator_name: "", worker_count: 3, system_prompt: "" });
      await load();
      setTimeout(() => setSuccess(null), 4000);
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleAgentStatus = async (agent) => {
    try {
      await base44.functions.invoke("provisionSuperAgent", {
        action: agent.status === "active" ? "standdown" : "deploy",
        agent_id: agent.id,
      });
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const executeAgent = async (agent) => {
    setExecuting(agent.id);
    setError(null);
    try {
      const task = prompt(`What task should ${agent.name} execute?`);
      if (!task) { setExecuting(null); return; }
      const res = await base44.functions.invoke("provisionSuperAgent", {
        action: "execute",
        agent_id: agent.id,
        task,
      });
      const data = res?.data || res;
      setSuccess(`${agent.name} executed: ${data.status}`);
      setTimeout(() => setSuccess(null), 4000);
    } catch (e) {
      setError(e.message);
    } finally {
      setExecuting(null);
    }
  };

  const deleteAgent = async (agent) => {
    if (!confirm(`Delete agent "${agent.name}"?`)) return;
    try {
      await base44.entities.AgentPersona.delete(agent.id);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const tierInfo = TIERS.find(t => t.key === selectedTier);
  const swarmCoordinators = agents.filter(a => a.agent_tier === "swarm" && a.swarm_role === "coordinator");

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Cpu className="h-6 w-6 text-accent-orange" />
            Agent Factory
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Build super agents, AGI swarms, fulfillment & shadow operatives with full capabilities</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSwarmForm(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors border border-purple-500/30">
            <Users className="h-4 w-4" /> New Swarm
          </button>
          <button onClick={() => { setShowForm(true); selectTier("super"); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> New Agent
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive flex items-center gap-2">
          <X className="h-4 w-4 shrink-0" /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-lg bg-status-green/10 border border-status-green/20 text-sm text-status-green flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" /> {success}
        </div>
      )}

      {/* Tier selection cards */}
      {!showForm && !showSwarmForm && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {TIERS.map((tier) => (
            <button
              key={tier.key}
              onClick={() => { setShowForm(true); selectTier(tier.key); }}
              className={cn("p-4 rounded-xl border text-left transition-all hover:scale-[1.02]", tier.border, tier.bg)}
            >
              <tier.icon className={cn("h-6 w-6 mb-2", tier.color)} />
              <p className="text-sm font-medium text-foreground">{tier.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{tier.desc}</p>
            </button>
          ))}
        </div>
      )}

      {/* Agent creation form */}
      {showForm && (
        <div className="mb-6 p-5 rounded-xl border border-border bg-card space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-semibold text-foreground">Create {tierInfo?.label}</h2>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
          </div>

          {/* Tier selector */}
          <div className="flex gap-2 flex-wrap">
            {TIERS.map(t => (
              <button
                key={t.key}
                onClick={() => selectTier(t.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                  selectedTier === t.key ? cn(t.border, t.bg, t.color) : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
          </div>

          {/* Basic info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Agent Name *</label>
              <input
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Apex Closer, Shadow Recon-7"
                className="w-full px-3 py-2 rounded-lg bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Assigned Phone Number</label>
              <select
                value={form.assigned_number} onChange={e => setForm({ ...form, assigned_number: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-muted text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">No number assigned</option>
                {numbers.map(n => <option key={n.id} value={n.e164}>{n.e164}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Target Industry</label>
              <input
                value={form.target_industry} onChange={e => setForm({ ...form, target_industry: e.target.value })}
                placeholder="e.g. Real Estate, SaaS, Healthcare"
                className="w-full px-3 py-2 rounded-lg bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tone</label>
              <input
                value={form.tone} onChange={e => setForm({ ...form, tone: e.target.value })}
                placeholder="e.g. professional, aggressive, empathetic"
                className="w-full px-3 py-2 rounded-lg bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">System Prompt</label>
            <textarea
              value={form.system_prompt} onChange={e => setForm({ ...form, system_prompt: e.target.value })}
              placeholder="Define the agent's role, behavior, and objectives..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {/* Capabilities */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Capabilities</label>
            <div className="flex flex-wrap gap-2">
              {ALL_CAPS.map(cap => {
                const active = form.capabilities.includes(cap.key);
                return (
                  <button
                    key={cap.key}
                    onClick={() => toggleCap(cap.key)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      active ? "bg-primary/10 border-primary/40 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <cap.icon className="h-3.5 w-3.5" /> {cap.label}
                    {active && <Check className="h-3 w-3" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Swarm config */}
          {selectedTier === "swarm" && (
            <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/20 space-y-3">
              <p className="text-sm font-medium text-purple-400 flex items-center gap-1.5"><Users className="h-4 w-4" /> Swarm Configuration</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Role</label>
                  <select
                    value={form.swarm_role} onChange={e => setForm({ ...form, swarm_role: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-muted text-sm text-foreground"
                  >
                    <option value="coordinator">Coordinator (delegates to workers)</option>
                    <option value="worker">Worker (reports to coordinator)</option>
                  </select>
                </div>
                {form.swarm_role === "worker" && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Coordinator</label>
                    <select
                      value={form.swarm_coordinator_id} onChange={e => setForm({ ...form, swarm_coordinator_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-muted text-sm text-foreground"
                    >
                      <option value="">Select coordinator...</option>
                      {swarmCoordinators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fulfillment config */}
          {selectedTier === "fulfillment" && (
            <div className="p-4 rounded-lg bg-status-green/5 border border-status-green/20 space-y-3">
              <p className="text-sm font-medium text-status-green flex items-center gap-1.5"><Rocket className="h-4 w-4" /> Fulfillment Configuration</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Browser Type</label>
                  <select
                    value={form.fulfillment_browser} onChange={e => setForm({ ...form, fulfillment_browser: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-muted text-sm text-foreground"
                  >
                    <option value="cloud">Cloud Browser (Browserbase)</option>
                    <option value="phone">Phone Browser</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox" checked={form.fulfillment_auto_execute}
                      onChange={e => setForm({ ...form, fulfillment_auto_execute: e.target.checked })}
                      className="rounded"
                    />
                    Auto-execute tasks
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Power & autonomy */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Power Level: {form.power_level}/10</label>
              <input
                type="range" min="1" max="10" value={form.power_level}
                onChange={e => setForm({ ...form, power_level: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Autonomy Level</label>
              <select
                value={form.autonomy_level} onChange={e => setForm({ ...form, autonomy_level: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-muted text-sm text-foreground"
              >
                <option value="manual">Manual</option>
                <option value="supervised">Supervised</option>
                <option value="autonomous">Autonomous</option>
                <option value="fully_autonomous">Fully Autonomous</option>
              </select>
            </div>
          </div>

          {/* Shadow mode */}
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox" checked={form.shadow_mode}
              onChange={e => setForm({ ...form, shadow_mode: e.target.checked })}
              className="rounded"
            />
            <Ghost className="h-4 w-4 text-slate-400" /> Shadow Mode (stealth — operates without supervision)
          </label>

          {/* API Credentials */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" /> API Credentials (for cross-site automation)
              </label>
              <button onClick={addApiCredential} className="text-xs text-primary hover:underline flex items-center gap-1">
                <Plus className="h-3 w-3" /> Add credential
              </button>
            </div>
            {form.api_credentials.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No credentials stored. Add usernames/passwords/API keys for other apps this agent can operate.</p>
            ) : (
              <div className="space-y-2">
                {form.api_credentials.map((cred, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/50 border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">Credential #{i + 1}</span>
                      <button onClick={() => removeApiCredential(i)} className="text-destructive hover:opacity-70"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      <input value={cred.site_name} onChange={e => updateApiCredential(i, "site_name", e.target.value)} placeholder="Site name" className="px-2 py-1.5 rounded bg-background text-xs" />
                      <input value={cred.base_url} onChange={e => updateApiCredential(i, "base_url", e.target.value)} placeholder="https://api.site.com" className="px-2 py-1.5 rounded bg-background text-xs col-span-2" />
                      <input value={cred.username} onChange={e => updateApiCredential(i, "username", e.target.value)} placeholder="Username" className="px-2 py-1.5 rounded bg-background text-xs" />
                      <input value={cred.password} onChange={e => updateApiCredential(i, "password", e.target.value)} placeholder="Password" type="password" className="px-2 py-1.5 rounded bg-background text-xs" />
                      <select value={cred.auth_type} onChange={e => updateApiCredential(i, "auth_type", e.target.value)} className="px-2 py-1.5 rounded bg-background text-xs">
                        <option value="basic">Basic Auth</option>
                        <option value="bearer">Bearer Token</option>
                        <option value="api_key">API Key</option>
                        <option value="session">Session</option>
                      </select>
                      {cred.auth_type !== "basic" && (
                        <input value={cred.api_key} onChange={e => updateApiCredential(i, "api_key", e.target.value)} placeholder="API key / token" className="px-2 py-1.5 rounded bg-background text-xs col-span-3" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create button */}
          <button
            onClick={createAgent}
            disabled={creating || !form.name.trim()}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors",
              creating || !form.name.trim() ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary text-primary-foreground hover:opacity-90"
            )}
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {creating ? "Provisioning..." : `Provision ${tierInfo?.label}`}
          </button>
        </div>
      )}

      {/* Swarm creation form */}
      {showSwarmForm && (
        <div className="mb-6 p-5 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-semibold text-purple-400 flex items-center gap-2"><Users className="h-5 w-5" /> Create AGI Swarm</h2>
            <button onClick={() => setShowSwarmForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Swarm Name *</label>
              <input value={swarmForm.swarm_name} onChange={e => setSwarmForm({ ...swarmForm, swarm_name: e.target.value })} placeholder="e.g. Sales Swarm Alpha" className="w-full px-3 py-2 rounded-lg bg-muted text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Coordinator Name *</label>
              <input value={swarmForm.coordinator_name} onChange={e => setSwarmForm({ ...swarmForm, coordinator_name: e.target.value })} placeholder="e.g. Alpha Commander" className="w-full px-3 py-2 rounded-lg bg-muted text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Worker Count (max 20)</label>
              <input type="number" min="1" max="20" value={swarmForm.worker_count} onChange={e => setSwarmForm({ ...swarmForm, worker_count: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Worker System Prompt</label>
            <textarea value={swarmForm.system_prompt} onChange={e => setSwarmForm({ ...swarmForm, system_prompt: e.target.value })} placeholder="Define what each worker should do..." rows={2} className="w-full px-3 py-2 rounded-lg bg-muted text-sm resize-none" />
          </div>
          <button onClick={createSwarm} disabled={creating} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium bg-purple-500 text-white hover:opacity-90 transition-opacity disabled:opacity-50">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
            {creating ? "Creating Swarm..." : "Create Swarm"}
          </button>
        </div>
      )}

      {/* Agent roster */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-foreground">Agent Roster ({agents.length})</h2>
          <button onClick={load} className="text-muted-foreground hover:text-foreground"><RefreshCw className="h-4 w-4" /></button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : agents.length === 0 ? (
          <div className="text-center py-12">
            <Bot className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-sm text-muted-foreground">No agents yet. Create one above to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {agents.map(agent => {
              const tier = TIERS.find(t => t.key === agent.agent_tier) || TIERS[0];
              const TierIcon = tier.icon;
              return (
                <div key={agent.id} className="p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", tier.bg)}>
                      <TierIcon className={cn("h-5 w-5", tier.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground">{agent.name}</p>
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border", tier.border, tier.color)}>{tier.label}</span>
                        {agent.status === "active" && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-status-green/10 text-status-green border border-status-green/20">Active</span>}
                        {agent.status === "paused" && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">Paused</span>}
                        {agent.shadow_mode && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 flex items-center gap-0.5"><Ghost className="h-2.5 w-2.5" /> Shadow</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                        {agent.assigned_number && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {agent.assigned_number}</span>}
                        {agent.target_industry && <span>{agent.target_industry}</span>}
                        {agent.swarm_id && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {agent.swarm_role}</span>}
                        {agent.power_level > 1 && <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> P{agent.power_level}</span>}
                        {agent.api_credentials?.length > 0 && <span className="flex items-center gap-1"><KeyRound className="h-3 w-3" /> {agent.api_credentials.length} creds</span>}
                      </div>
                      {agent.capabilities?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {agent.capabilities.slice(0, 6).map(cap => (
                            <span key={cap} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{cap}</span>
                          ))}
                          {agent.capabilities.length > 6 && <span className="text-[10px] text-muted-foreground">+{agent.capabilities.length - 6}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => executeAgent(agent)} disabled={executing === agent.id} className="p-2 rounded-lg hover:bg-primary/10 text-primary disabled:opacity-50" title="Execute task">
                        {executing === agent.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      </button>
                      <button onClick={() => toggleAgentStatus(agent)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground" title={agent.status === "active" ? "Stand down" : "Deploy"}>
                        {agent.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <button onClick={() => deleteAgent(agent)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}