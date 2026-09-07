import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Users, Mail, Phone, Upload, Send, Loader2, CheckCircle2, XCircle, FileText, Filter, ChevronRight } from "lucide-react";

export default function CampaignConsole() {
  const { toast } = useToast();
  const [replicas, setReplicas] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedReplica, setSelectedReplica] = useState("");
  const [channel, setChannel] = useState("email");
  const [scenario, setScenario] = useState("Sales outreach — new product announcement with discount");
  const [tone, setTone] = useState("professional");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [batchSize, setBatchSize] = useState(10);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [loadingContacts, setLoadingContacts] = useState(true);

  // Manual contact add
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContact, setNewContact] = useState({ full_name: "", email: "", phone: "", company: "", title: "" });

  useEffect(() => { loadReplicas(); loadContacts(); }, []);

  const loadReplicas = async () => {
    try {
      const list = await base44.entities.UserReplica.list('-created_date', 20);
      setReplicas(list);
      if (list[0]) setSelectedReplica(list[0].id);
    } catch (_) {}
  };

  const loadContacts = async () => {
    try {
      const list = await base44.entities.CampaignContact.list('-created_date', 200);
      setContacts(list);
    } catch (_) {}
    setLoadingContacts(false);
  };

  const handleImport = async (file) => {
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const extractRes = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            contacts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  full_name: { type: "string" },
                  email: { type: "string" },
                  phone: { type: "string" },
                  company: { type: "string" },
                  title: { type: "string" }
                }
              }
            }
          }
        }
      });
      const extracted = extractRes.output?.contacts || extractRes.output || [];
      if (extracted.length > 0) {
        await base44.entities.CampaignContact.bulkCreate(
          extracted.map(c => ({ ...c, status: 'new', source: 'import' }))
        );
        toast({ title: "Imported", description: `${extracted.length} contacts added.` });
        await loadContacts();
      }
    } catch (e) {
      toast({ title: "Import Failed", description: e.message, variant: "destructive" });
    }
  };

  const handleAddContact = async () => {
    if (!newContact.full_name) return;
    try {
      await base44.entities.CampaignContact.create({ ...newContact, status: 'new', source: 'manual' });
      setNewContact({ full_name: "", email: "", phone: "", company: "", title: "" });
      setShowAddForm(false);
      await loadContacts();
      toast({ title: "Contact Added" });
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleRunCampaign = async () => {
    if (!selectedReplica) { toast({ title: "Select an AI replica first", variant: "destructive" }); return; }
    setRunning(true);
    setResults(null);
    try {
      const eligible = contacts.filter(c => 
        (channel === 'email' ? c.email : c.phone) &&
        (filterStatus === 'all' || c.status === filterStatus)
      ).slice(0, batchSize);

      if (eligible.length === 0) { toast({ title: "No eligible contacts", variant: "destructive" }); setRunning(false); return; }

      const res = await base44.functions.invoke('runReplicaCampaign', {
        replica_id: selectedReplica,
        contacts: eligible,
        channel, scenario, tone,
        spreadsheet_id: spreadsheetId || undefined,
        batch_size: batchSize,
      });
      setResults(res.data || res);
      toast({ title: "Campaign Sent", description: `${(res.data || res).sent} sent, ${(res.data || res).failed} failed.` });
      await loadContacts();
    } catch (e) {
      toast({ title: "Campaign Failed", description: e.message, variant: "destructive" });
    }
    setRunning(false);
  };

  const filteredContacts = contacts.filter(c => filterStatus === 'all' || c.status === filterStatus);
  const stats = {
    total: contacts.length,
    new: contacts.filter(c => c.status === 'new').length,
    contacted: contacts.filter(c => c.status === 'contacted').length,
    responded: contacts.filter(c => c.status === 'responded').length,
    converted: contacts.filter(c => c.status === 'converted').length,
  };

  return (
    <div className="min-h-screen bg-base tl-grid-bg">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-accent-orange" />
          <h1 className="font-display text-lg tracking-[0.15em] uppercase text-text-primary">Campaign Console</h1>
          <span className="text-[10px] text-text-muted ml-auto">AI-Generated · Personalized · Tracked</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: 'Total', value: stats.total, color: 'text-text-primary' },
            { label: 'New', value: stats.new, color: 'text-accent-orange' },
            { label: 'Contacted', value: stats.contacted, color: 'text-chart-3' },
            { label: 'Responded', value: stats.responded, color: 'text-chart-4' },
            { label: 'Converted', value: stats.converted, color: 'text-status-green' },
          ].map(({ label, value, color }) => (
            <div key={label} className="tl-panel rounded-lg p-2.5 text-center">
              <p className={cn("text-xl font-display", color)}>{value}</p>
              <p className="text-[9px] font-display uppercase text-text-muted">{label}</p>
            </div>
          ))}
        </div>

        {/* Campaign Builder */}
        <div className="tl-panel rounded-xl p-5 space-y-4">
          <h2 className="font-display text-xs uppercase tracking-wider">Campaign Builder</h2>

          <div className="grid grid-cols-2 gap-3">
            {/* Replica selector */}
            <div>
              <label className="text-[10px] font-display uppercase text-text-muted">AI Replica (Sender)</label>
              <select value={selectedReplica} onChange={e => setSelectedReplica(e.target.value)}
                className="w-full h-9 px-2 rounded border border-surface-border bg-base text-sm focus:border-accent-orange outline-none">
                {replicas.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
              </select>
            </div>
            {/* Channel */}
            <div>
              <label className="text-[10px] font-display uppercase text-text-muted">Channel</label>
              <div className="flex gap-2">
                <button onClick={() => setChannel('email')} className={cn("flex-1 h-9 rounded border text-xs font-display uppercase", channel === 'email' ? "border-accent-orange bg-accent-orange/10 text-accent-orange" : "border-surface-border text-text-muted")}>
                  <Mail className="h-3.5 w-3.5 inline mr-1" /> Email
                </button>
                <button onClick={() => setChannel('sms')} className={cn("flex-1 h-9 rounded border text-xs font-display uppercase", channel === 'sms' ? "border-accent-orange bg-accent-orange/10 text-accent-orange" : "border-surface-border text-text-muted")}>
                  <Phone className="h-3.5 w-3.5 inline mr-1" /> SMS
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-display uppercase text-text-muted">Scenario</label>
            <select value={scenario} onChange={e => setScenario(e.target.value)}
              className="w-full h-9 px-2 rounded border border-surface-border bg-base text-sm focus:border-accent-orange outline-none">
              <option>Sales outreach — new product announcement with discount</option>
              <option>Follow-up — previous customer re-engagement</option>
              <option>Cold outreach — introduction to new prospects</option>
              <option>Nurture — drop hints about upcoming products</option>
              <option>Discount offer — limited time promotion</option>
              <option>Re-engagement — we miss you campaign</option>
              <option>Appointment setting — schedule a demo</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-display uppercase text-text-muted">Tone</label>
              <select value={tone} onChange={e => setTone(e.target.value)}
                className="w-full h-9 px-2 rounded border border-surface-border bg-base text-sm focus:border-accent-orange outline-none">
                <option>professional</option><option>casual</option><option>friendly</option>
                <option>persuasive</option><option>consultative</option><option>energetic</option>
                <option>empathetic</option><option>urgent</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-display uppercase text-text-muted">Batch Size</label>
              <input type="number" value={batchSize} onChange={e => setBatchSize(Number(e.target.value))} min="1" max="50"
                className="w-full h-9 px-2 rounded border border-surface-border bg-base text-sm focus:border-accent-orange outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-display uppercase text-text-muted">Google Sheets ID (optional)</label>
              <input value={spreadsheetId} onChange={e => setSpreadsheetId(e.target.value)}
                placeholder="Spreadsheet ID" className="w-full h-9 px-2 rounded border border-surface-border bg-base text-sm focus:border-accent-orange outline-none" />
            </div>
          </div>

          <button onClick={handleRunCampaign} disabled={running || !selectedReplica}
            className="w-full h-11 rounded-lg bg-accent-orange text-white font-display text-sm uppercase tracking-wider hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {running ? 'Generating & Sending...' : 'Launch Campaign'}
          </button>
        </div>

        {/* Results */}
        {results && (
          <div className="tl-panel rounded-xl p-5 space-y-3 tl-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-status-green" />
              <h3 className="font-display text-xs uppercase tracking-wider">Campaign Results</h3>
              <span className="ml-auto text-[10px] text-text-muted">
                {results.sent} sent · {results.failed} failed · {results.skipped || 0} skipped
                {results.sheets_logged && <span className="ml-2 text-status-green">✓ Sheets</span>}
              </span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
              {results.results?.map((r, i) => (
                <div key={i} className={cn("rounded-lg border p-3", r.status === 'sent' ? "border-status-green/30 bg-status-green/5" : "border-destructive/30 bg-destructive/5")}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-text-primary">{r.contact_name}</span>
                    {r.status === 'sent' ? <CheckCircle2 className="h-3.5 w-3.5 text-status-green" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                  </div>
                  {r.subject && <p className="text-[10px] text-text-muted mt-0.5">Subject: {r.subject}</p>}
                  <p className="text-[10px] text-text-muted mt-0.5">{r.message_preview}...</p>
                  {r.error && <p className="text-[10px] text-destructive mt-0.5">⚠ {r.error}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Management */}
        <div className="tl-panel rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xs uppercase tracking-wider">Contacts ({contacts.length})</h2>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-surface-border text-[10px] font-display uppercase text-text-muted hover:text-text-primary cursor-pointer">
                <Upload className="h-3.5 w-3.5" /> Import CSV
                <input type="file" accept=".csv,.xlsx" className="hidden" onChange={e => handleImport(e.target.files[0])} />
              </label>
              <button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-accent-orange text-[10px] font-display uppercase text-accent-orange hover:bg-accent-orange/10">
                <Users className="h-3.5 w-3.5" /> Add Contact
              </button>
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-text-muted" />
            {['all', 'new', 'contacted', 'responded', 'converted'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={cn("px-2.5 py-1 rounded text-[10px] font-display uppercase", filterStatus === s ? "bg-accent-orange text-white" : "bg-surface text-text-muted")}>
                {s}
              </button>
            ))}
          </div>

          {/* Add Form */}
          {showAddForm && (
            <div className="grid grid-cols-5 gap-2 p-3 rounded-lg border border-surface-border bg-base/40">
              <input value={newContact.full_name} onChange={e => setNewContact({...newContact, full_name: e.target.value})} placeholder="Name" className="h-8 px-2 rounded border border-surface-border bg-base text-xs" />
              <input value={newContact.email} onChange={e => setNewContact({...newContact, email: e.target.value})} placeholder="Email" className="h-8 px-2 rounded border border-surface-border bg-base text-xs" />
              <input value={newContact.phone} onChange={e => setNewContact({...newContact, phone: e.target.value})} placeholder="Phone" className="h-8 px-2 rounded border border-surface-border bg-base text-xs" />
              <input value={newContact.company} onChange={e => setNewContact({...newContact, company: e.target.value})} placeholder="Company" className="h-8 px-2 rounded border border-surface-border bg-base text-xs" />
              <button onClick={handleAddContact} className="h-8 rounded bg-accent-orange text-white text-xs font-display uppercase">Add</button>
            </div>
          )}

          {/* Contact List */}
          <div className="space-y-1.5 max-h-96 overflow-y-auto scrollbar-thin">
            {loadingContacts ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 text-text-muted animate-spin" /></div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-8 text-xs text-text-muted">No contacts yet. Import a CSV or add manually.</div>
            ) : (
              filteredContacts.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-surface-border bg-base/40 hover:bg-surface/50">
                  <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-xs font-display text-text-muted">
                    {c.full_name?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">{c.full_name}</p>
                    <p className="text-[10px] text-text-muted truncate">{c.email || c.phone || 'No contact info'}</p>
                  </div>
                  {c.company && <span className="text-[10px] text-text-muted hidden md:block">{c.company}</span>}
                  <span className={cn("px-2 py-0.5 rounded text-[9px] font-display uppercase",
                    c.status === 'new' ? 'bg-accent-orange/10 text-accent-orange' :
                    c.status === 'contacted' ? 'bg-chart-3/10 text-chart-3' :
                    c.status === 'responded' ? 'bg-chart-4/10 text-chart-4' :
                    c.status === 'converted' ? 'bg-status-green/10 text-status-green' :
                    'bg-surface text-text-muted'
                  )}>{c.status}</span>
                  {c.follow_up_stage > 0 && <span className="text-[9px] text-text-muted">F/U: {c.follow_up_stage}</span>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}