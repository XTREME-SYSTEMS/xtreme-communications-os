import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket, Loader2, Users, MessageCircle, Phone, Target, Zap, CheckCircle2, ArrowLeft, Brain, Send, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

// Playbook library (mirrors base44/shared/playbooks.ts metadata)
const PLAYBOOKS = [
  { id: "rnd_tax_credit", name: "R&D Tax Credit Recovery", category: "Money Recovery", description: "Businesses get $50K-$250K back from IRS. Contingency fee — prospect pays nothing upfront.", target_industry: "construction", ticket_range: "$5K-$25K per close", target_tags: ["pcu_alumni", "contractor", "manufacturer"] },
  { id: "utility_audit", name: "Commercial Utility Bill Audit", category: "Money Recovery", description: "Recover 12-36 months of electric/gas/water overcharges. Contingency fee.", target_industry: "universal", ticket_range: "$2K-$15K per close", target_tags: ["pcu_alumni", "contractor"] },
  { id: "ai_automation", name: "AI Business Automation", category: "Automation", description: "Replace manual tasks, save $50K+/year. High ticket, obvious ROI.", target_industry: "universal", ticket_range: "$3K-$15K setup + $500/mo", target_tags: ["pcu_alumni", "contractor"] },
  { id: "merchant_processing", name: "Merchant Processing Fee Reduction", category: "Money Recovery", description: "Cut credit card fees 20-40% with same processor. Contingency on first year savings.", target_industry: "universal", ticket_range: "$2K-$20K per close", target_tags: ["pcu_alumni", "contractor", "retail"] },
  { id: "cybersecurity", name: "Cybersecurity Breach Prevention", category: "Risk Elimination", description: "Avoid $50K-$5M breach costs. Free assessment, then remediation.", target_industry: "universal", ticket_range: "$2K-$25K setup + $500/mo", target_tags: ["pcu_alumni", "business_owner"] },
  { id: "seo_optimization", name: "SEO Optimization", category: "Automation", description: "Rank higher, get free organic traffic. High ticket, ongoing monthly.", target_industry: "universal", ticket_range: "$1K-$5K setup + $500-$2K/mo", target_tags: ["pcu_alumni", "contractor"] },
  { id: "business_credit", name: "Business Credit Building", category: "Money Access", description: "Get $50K-$250K in unsecured business credit. Paid by lenders.", target_industry: "universal", ticket_range: "$2K-$10K per close", target_tags: ["pcu_alumni", "business_owner"] },
  { id: "reputation_management", name: "Review/Reputation Management", category: "Automation", description: "More 5-star reviews = more customers. Automated review generation.", target_industry: "universal", ticket_range: "$500-$2K setup + $200-$500/mo", target_tags: ["pcu_alumni", "contractor"] },
  { id: "google_ads", name: "Google Ads Management", category: "Automation", description: "More leads for less spend. High ticket, ongoing monthly.", target_industry: "universal", ticket_range: "$1K-$3K setup + $500-$2K/mo", target_tags: ["pcu_alumni", "contractor"] },
  { id: "workers_comp", name: "Workers Comp Premium Recovery", category: "Money Recovery", description: "Get back overpaid premiums from misclassified employees. Contingency.", target_industry: "construction", ticket_range: "$3K-$30K per close", target_tags: ["pcu_alumni", "contractor", "construction"] },
];

const CATEGORIES = ["Money Recovery", "Money Access", "Risk Elimination", "Automation"];

const CATEGORY_COLORS = {
  "Money Recovery": "text-status-green",
  "Money Access": "text-primary",
  "Risk Elimination": "text-destructive",
  "Automation": "text-chart-3",
};

export default function AgentGenerator() {
  const { toast } = useToast();
  const [selectedPlaybook, setSelectedPlaybook] = useState(null);
  const [fromNumber, setFromNumber] = useState("+18334843799");
  const [channel, setChannel] = useState("whatsapp");
  const [contactTag, setContactTag] = useState("pcu_alumni");
  const [numbers, setNumbers] = useState([]);
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeAgents, setActiveAgents] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const nums = await base44.entities.PhoneNumber.list('-created_date', 20);
        setNumbers(nums.filter(n => n.capabilities && n.capabilities.includes("sms")));
        const keys = await base44.entities.ApiKey.filter({ status: "active" });
        if (keys.length) setApiKey(keys[0].key_value);
        const agents = await base44.entities.AgentPersona.filter({ status: "active" }, '-provisioned_at', 20);
        setActiveAgents(agents);
      } catch (_) {}
    })();
  }, []);

  const handleGenerate = async () => {
    if (!selectedPlaybook) { toast({ title: "Select a playbook first", variant: "destructive" }); return; }
    if (!apiKey) { toast({ title: "No API key", description: "Create an API key first.", variant: "destructive" }); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('provisionAgent', {
        api_key: apiKey,
        playbook_id: selectedPlaybook.id,
        from_number: fromNumber,
        channel,
        contact_tag: contactTag || undefined,
      });
      const data = res.data || res;
      if (data.error) {
        toast({ title: "Provisioning failed", description: data.error, variant: "destructive" });
      } else {
        setResult(data);
        toast({ title: "Agent launched!", description: `${data.persona?.name} — ${data.day1_sent} day-1 messages sent` });
        const agents = await base44.entities.AgentPersona.filter({ status: "active" }, '-provisioned_at', 20);
        setActiveAgents(agents);
      }
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const selectedPb = PLAYBOOKS.find(p => p.id === selectedPlaybook);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link to="/portal" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
          <ArrowLeft className="h-3 w-3" /> Dashboard
        </Link>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <Rocket className="h-6 w-6 text-primary" /> Agent Generator
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Provision a fully automated AI agent — one persona, one number, one 15-day playbook, one intelligence file — then launch it to start messaging immediately.
        </p>
      </div>

      {/* Active Agents */}
      {activeAgents.length > 0 && (
        <Card className="mb-6 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /> Active Agents ({activeAgents.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {activeAgents.map(a => (
                <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-accent/30">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {a.assigned_number || 'No number'} · {a.contacts_assigned || 0} contacts · {a.playbook_id || 'custom'}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-status-green border-status-green/30 shrink-0">Active</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Select Playbook */}
      <div className="mb-6">
        <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">1</span>
          Select a Playbook
        </h2>
        <div className="space-y-3">
          {CATEGORIES.map(cat => (
            <div key={cat}>
              <p className={cn("text-xs font-medium uppercase tracking-wider mb-2", CATEGORY_COLORS[cat])}>{cat}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {PLAYBOOKS.filter(p => p.category === cat).map(pb => (
                  <button key={pb.id} onClick={() => setSelectedPlaybook(pb.id)}
                    className={cn("text-left p-3 rounded-lg border transition-all",
                      selectedPlaybook === pb.id ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border bg-card hover:border-primary/40")}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{pb.name}</p>
                      {selectedPlaybook === pb.id && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{pb.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-[10px]">{pb.ticket_range}</Badge>
                      <Badge variant="outline" className="text-[10px]">{pb.target_tags.join(', ')}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step 2: Configuration */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">2</span>
            Configure & Launch
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">From Number</label>
              <select value={fromNumber} onChange={e => setFromNumber(e.target.value)}
                className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
                {(numbers.length > 0 ? numbers : [{ e164: "+18334843799" }, { e164: "+18337001239" }, { e164: "+19548848885" }]).map(n => (
                  <option key={n.e164} value={n.e164}>{n.e164}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Channel</label>
              <select value={channel} onChange={e => setChannel(e.target.value)}
                className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact Filter (Tag)</label>
              <input value={contactTag} onChange={e => setContactTag(e.target.value)}
                placeholder="pcu_alumni"
                className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
            </div>
          </div>

          {/* Preview */}
          {selectedPb && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-foreground">Agent Preview</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div><span className="text-muted-foreground">Playbook:</span> <span className="font-medium">{selectedPb.name}</span></div>
                <div><span className="text-muted-foreground">Number:</span> <span className="font-medium">{fromNumber}</span></div>
                <div><span className="text-muted-foreground">Channel:</span> <span className="font-medium uppercase">{channel}</span></div>
                <div><span className="text-muted-foreground">Targets:</span> <span className="font-medium">{contactTag || selectedPb.target_tags.join(', ')}</span></div>
              </div>
              <div className="mt-3 pt-3 border-t border-primary/20 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Finds matching contacts</span>
                <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> Creates 15-day templates</span>
                <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> Sends day 1 NOW</span>
                <span className="flex items-center gap-1"><Brain className="h-3 w-3" /> Daily auto-follow-up</span>
              </div>
            </div>
          )}

          {/* Launch Button */}
          <Button onClick={handleGenerate} disabled={loading || !selectedPlaybook}
            className="w-full h-12 text-base">
            {loading ? (
              <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Provisioning & Launching Agent...</>
            ) : (
              <><Rocket className="h-5 w-5 mr-2" /> Generate & Launch Agent</>
            )}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            This creates the agent persona, assigns a number, builds the 15-day template book, finds matching contacts, and sends day 1 messages immediately.
          </p>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className={cn("border-2", result.status === 'launched' ? 'border-status-green/40' : 'border-destructive/40')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {result.status === 'launched' ? <CheckCircle2 className="h-5 w-5 text-status-green" /> : <AlertCircle className="h-5 w-5 text-destructive" />}
              {result.status === 'launched' ? 'Agent Launched Successfully' : 'Agent Provisioned (No Contacts)'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.persona && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg bg-accent/50 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">Agent</p>
                  <p className="text-sm font-medium">{result.persona.name}</p>
                </div>
                <div className="rounded-lg bg-accent/50 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">From Number</p>
                  <p className="text-sm font-medium">{result.persona.from_number}</p>
                </div>
                <div className="rounded-lg bg-accent/50 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">Templates Created</p>
                  <p className="text-sm font-medium">{result.templates_created}</p>
                </div>
                <div className="rounded-lg bg-accent/50 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">Contacts Assigned</p>
                  <p className="text-sm font-medium">{result.contacts_assigned}</p>
                </div>
              </div>
            )}
            {result.day1_sent !== undefined && (
              <div className="flex items-center gap-4 p-3 rounded-lg bg-status-green/10">
                <Send className="h-5 w-5 text-status-green" />
                <div>
                  <p className="text-sm font-medium text-status-green">Day 1 Messages Sent: {result.day1_sent}</p>
                  {result.day1_failed > 0 && <p className="text-xs text-destructive">{result.day1_failed} failed</p>}
                </div>
              </div>
            )}
            {result.next_follow_up && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Brain className="h-3 w-3" /> {result.next_follow_up}
              </p>
            )}
            {result.results && result.results.length > 0 && (
              <div className="max-h-48 overflow-y-auto scrollbar-thin space-y-1">
                {result.results.slice(0, 20).map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded bg-accent/30">
                    <span className="text-foreground">{r.name}</span>
                    <Badge variant="outline" className={r.status === 'sent' ? 'text-status-green border-status-green/30' : 'text-destructive border-destructive/30'}>
                      {r.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}