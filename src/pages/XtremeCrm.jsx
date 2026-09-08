import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  Users, Plus, Search, Phone, Mail, MessageSquare, MessageCircle, Image as ImageIcon,
  Repeat, Download, Share2, RefreshCw, Loader2, X, Tag, Filter, ChevronDown,
  Building2, MapPin, Star, Send, CheckSquare, Square, MoreVertical, Zap
} from "lucide-react";
import BulkActionBar from "@/components/crm/BulkActionBar";
import FollowUpConfig from "@/components/crm/FollowUpConfig";

const STAGES = ["lead", "contacted", "qualified", "proposal", "won", "lost"];
const STAGE_COLORS = {
  lead: "bg-muted/20 text-muted-foreground",
  contacted: "bg-blue-500/10 text-blue-500",
  qualified: "bg-chart-2/10 text-chart-2",
  proposal: "bg-chart-4/10 text-chart-4",
  won: "bg-status-green/10 text-status-green",
  lost: "bg-destructive/10 text-destructive",
};

export default function XtremeCrm() {
  const { toast } = useToast();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [selected, setSelected] = useState(new Set());
  const [detail, setDetail] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.XtremeCrmContact.list('-updated_date', 200);
      setContacts(list || []);
    } catch (e) {
      toast({ title: "Load failed", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const filtered = contacts.filter(c => {
    const matchSearch = !search ||
      c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === "all" || c.lifecycle_stage === stageFilter;
    return matchSearch && matchStage;
  });

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(c => c.id)));
  };

  const sendComm = async (contact, channel) => {
    try {
      if (channel === "email") {
        await base44.functions.invoke("gatewayEmail", { to: contact.email, subject: "Following up", body: "Hi " + contact.full_name?.split(" ")[0] + ", just following up!" });
      } else {
        await base44.functions.invoke("gatewayMessages", { to: contact.phone, body: "Hi " + contact.full_name?.split(" ")[0] + ", just following up!", channel });
      }
      await base44.entities.XtremeCrmContact.update(contact.id, {
        last_contacted_at: new Date().toISOString(),
        last_contact_channel: channel,
        lifecycle_stage: contact.lifecycle_stage === "lead" ? "contacted" : contact.lifecycle_stage,
        follow_up_count: (contact.follow_up_count || 0) + 1,
      });
      toast({ title: `${channel.toUpperCase()} sent`, description: `To ${contact.full_name}` });
      load();
    } catch (e) {
      toast({ title: "Send failed", description: e.message, variant: "destructive" });
    }
  };

  const syncHubspot = async () => {
    setSyncing(true);
    try {
      const toSync = selected.size > 0 ? filtered.filter(c => selected.has(c.id)) : filtered;
      let pushed = 0;
      for (const contact of toSync) {
        try {
          const res = await base44.functions.invoke("syncHubspot", {
            action: "push",
            contact_data: contact,
          });
          if (res.data?.synced) {
            await base44.entities.XtremeCrmContact.update(contact.id, {
              hubspot_synced: true,
              hubspot_contact_id: res.data.hubspot_contact_id,
            });
            pushed++;
          }
        } catch {}
      }
      toast({ title: "HubSpot sync complete", description: `${pushed} contacts synced` });
      load();
    } catch (e) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    }
    setSyncing(false);
  };

  const exportCsv = () => {
    const headers = ["Name", "Email", "Phone", "Company", "Title", "Stage", "Tags", "Last Contacted"];
    const rows = filtered.map(c => [c.full_name, c.email, c.phone, c.company, c.title, c.lifecycle_stage, (c.tags || []).join(";"), c.last_contacted_at?.slice(0, 10)]);
    const csv = [headers, ...rows].map(r => r.map(f => `"${(f || "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "xtreme-crm-contacts.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const updateStage = async (contact, stage) => {
    try {
      await base44.entities.XtremeCrmContact.update(contact.id, { lifecycle_stage: stage });
      load();
    } catch (e) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    }
  };

  const stats = {
    total: contacts.length,
    leads: contacts.filter(c => c.lifecycle_stage === "lead").length,
    qualified: contacts.filter(c => c.lifecycle_stage === "qualified").length,
    won: contacts.filter(c => c.lifecycle_stage === "won").length,
    followUps: contacts.filter(c => c.follow_up_enabled && c.next_follow_up_at).length,
    pipeline: contacts.reduce((sum, c) => sum + (c.deal_value || 0), 0),
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 md:h-6 md:w-6 text-primary" /> XTREME CRM
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">AI-assisted contact management · HubSpot sync · Multi-channel outreach</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={syncHubspot} disabled={syncing}
            className="px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent flex items-center gap-1.5 disabled:opacity-50">
            <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} /> <span className="hidden sm:inline">Sync HubSpot</span>
          </button>
          <button onClick={exportCsv}
            className="px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent flex items-center gap-1.5">
            <Download className="h-4 w-4" /> <span className="hidden sm:inline">Export</span>
          </button>
          <button onClick={() => setShowAdd(true)}
            className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Leads", value: stats.leads, color: "text-muted-foreground" },
          { label: "Qualified", value: stats.qualified, color: "text-chart-2" },
          { label: "Won", value: stats.won, color: "text-status-green" },
          { label: "Follow-Ups", value: stats.followUps, color: "text-primary" },
          { label: "Pipeline", value: `$${stats.pipeline.toLocaleString()}`, color: "text-chart-4" },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-2.5">
            <p className={cn("text-lg md:text-xl font-display font-bold", s.color)}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts…"
            className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-card text-sm focus:border-primary outline-none" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className="px-3 h-10 rounded-lg border border-border text-sm font-medium hover:bg-accent flex items-center gap-1.5">
          <Filter className="h-4 w-4" /> <span className="hidden sm:inline">Filter</span>
          {stageFilter !== "all" && <span className="h-2 w-2 rounded-full bg-primary" />}
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-1.5 mb-3 p-3 rounded-lg border border-border bg-card">
          <button onClick={() => { setStageFilter("all"); setShowFilters(false); }}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium", stageFilter === "all" ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground")}>All</button>
          {STAGES.map(s => (
            <button key={s} onClick={() => { setStageFilter(s); setShowFilters(false); }}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium capitalize", stageFilter === s ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground")}>{s}</button>
          ))}
        </div>
      )}

      {/* Contact list */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">No contacts yet. Add one or scrape leads to get started.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {/* Select all */}
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground">
            <button onClick={selectAll} className="flex items-center gap-1.5 hover:text-foreground">
              {selected.size === filtered.length && filtered.length > 0
                ? <CheckSquare className="h-4 w-4 text-primary" />
                : <Square className="h-4 w-4" />}
              {selected.size > 0 ? `${selected.size} selected` : "Select all"}
            </button>
            <span className="ml-auto">{filtered.length} contacts</span>
          </div>

          {filtered.map(contact => (
            <div key={contact.id}
              className={cn("rounded-lg border bg-card p-3 transition-colors",
                selected.has(contact.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/30")}>
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <button onClick={() => toggleSelect(contact.id)} className="mt-1 shrink-0">
                  {selected.has(contact.id)
                    ? <CheckSquare className="h-5 w-5 text-primary" />
                    : <Square className="h-5 w-5 text-muted-foreground" />}
                </button>

                {/* Avatar + info */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetail(contact)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">{contact.full_name}</p>
                    <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-medium uppercase", STAGE_COLORS[contact.lifecycle_stage] || STAGE_COLORS.lead)}>
                      {contact.lifecycle_stage}
                    </span>
                    {contact.follow_up_enabled && (
                      <span className="flex items-center gap-0.5 text-[9px] text-primary"><Repeat className="h-2.5 w-2.5" /> Auto</span>
                    )}
                    {contact.hubspot_synced && (
                      <span className="text-[9px] text-chart-3">● HS</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    {contact.company && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {contact.company}</span>}
                    {contact.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {contact.email}</span>}
                    {contact.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {contact.phone}</span>}
                    {contact.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {contact.location}</span>}
                  </div>
                  {(contact.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(contact.tags || []).slice(0, 4).map(t => (
                        <span key={t} className="px-1.5 py-0.5 rounded bg-accent text-[9px] text-muted-foreground">{t}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Comm buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  {contact.phone && (
                    <>
                      <button onClick={() => sendComm(contact, "voice")} title="Call" className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"><Phone className="h-3.5 w-3.5" /></button>
                      <button onClick={() => sendComm(contact, "sms")} title="SMS" className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"><MessageSquare className="h-3.5 w-3.5" /></button>
                      <button onClick={() => sendComm(contact, "whatsapp")} title="WhatsApp" className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"><MessageCircle className="h-3.5 w-3.5" /></button>
                    </>
                  )}
                  {contact.email && (
                    <button onClick={() => sendComm(contact, "email")} title="Email" className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"><Mail className="h-3.5 w-3.5" /></button>
                  )}
                  <button onClick={() => setShowFollowUp(contact)} title="Follow-up" className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-primary"><Repeat className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <BulkActionBar
          selectedIds={[...selected]}
          contacts={filtered}
          onClear={() => setSelected(new Set())}
          onDone={() => { setSelected(new Set()); load(); }}
        />
      )}

      {/* Follow-up config modal */}
      {showFollowUp && (
        <FollowUpConfig
          contact={showFollowUp}
          onUpdate={(updated) => setContacts(prev => prev.map(c => c.id === updated.id ? updated : c))}
          onClose={() => setShowFollowUp(null)}
        />
      )}

      {/* Detail modal */}
      {detail && <ContactDetail contact={detail} onClose={() => setDetail(null)} onUpdate={load} onSendComm={sendComm} onStageChange={updateStage} />}

      {/* Add modal */}
      {showAdd && <AddContactModal onClose={() => setShowAdd(null)} onCreated={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

// Contact detail modal
function ContactDetail({ contact, onClose, onUpdate, onSendComm, onStageChange }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(contact);

  const save = async () => {
    try {
      await base44.entities.XtremeCrmContact.update(contact.id, form);
      onUpdate();
      setEditing(false);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto scrollbar-thin rounded-xl border border-border bg-card" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="font-medium text-foreground">{contact.full_name}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          {/* Stage selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Lifecycle Stage</label>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map(s => (
                <button key={s} onClick={() => { onStageChange(contact, s); setForm({ ...form, lifecycle_stage: s }); }}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-medium capitalize",
                    contact.lifecycle_stage === s ? STAGE_COLORS[s] : "bg-accent text-muted-foreground")}>{s}</button>
              ))}
            </div>
          </div>

          {/* Fields */}
          {[
            { k: "full_name", l: "Name" },
            { k: "email", l: "Email" },
            { k: "phone", l: "Phone" },
            { k: "company", l: "Company" },
            { k: "title", l: "Title" },
            { k: "industry", l: "Industry" },
            { k: "location", l: "Location" },
            { k: "website", l: "Website" },
          ].map(f => (
            <div key={f.k}>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">{f.l}</label>
              <input value={form[f.k] || ""} onChange={e => setForm({ ...form, [f.k]: e.target.value })} disabled={!editing}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none disabled:opacity-60" />
            </div>
          ))}

          {/* Enrichment data */}
          {contact.enrichment_data && Object.keys(contact.enrichment_data).length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block flex items-center gap-1"><Zap className="h-3 w-3 text-primary" /> Enrichment Data</label>
              <div className="rounded-lg border border-border bg-accent/30 p-3 text-xs text-foreground max-h-40 overflow-y-auto scrollbar-thin">
                <pre className="whitespace-pre-wrap">{JSON.stringify(contact.enrichment_data, null, 2)}</pre>
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Tags (comma-separated)</label>
            <input value={(form.tags || []).join(", ")} onChange={e => setForm({ ...form, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) })} disabled={!editing}
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none disabled:opacity-60" />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Notes</label>
            <textarea value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} disabled={!editing} rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none disabled:opacity-60 resize-none" />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {!editing ? (
              <button onClick={() => setEditing(true)} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent">Edit</button>
            ) : (
              <button onClick={save} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Save</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Add contact modal
function AddContactModal({ onClose, onCreated }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", company: "", title: "", industry: "", location: "", lifecycle_stage: "lead", lead_source: "manual", tags: [] });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.full_name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await base44.entities.XtremeCrmContact.create(form);
      toast({ title: "Contact added" });
      onCreated();
    } catch (e) {
      toast({ title: "Add failed", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-foreground">Add Contact</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Full name *"
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email"
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone"
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          <input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Company"
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Job title"
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} placeholder="Industry"
              className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
            <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Location"
              className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          </div>
          <button onClick={save} disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add Contact
          </button>
        </div>
      </div>
    </div>
  );
}