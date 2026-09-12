import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import {
  Users, Search, RefreshCw, Loader2, CheckCircle2, Phone, Mail,
  Building2, Calendar, Shield, AlertCircle
} from "lucide-react";

export default function GoogleContactsManager() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("googleContactsSync", { action: "get_contacts" });
      setContacts(res?.data?.contacts || []);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const syncContacts = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("googleContactsSync", { action: "full_sync" });
      const data = res?.data || res;
      setSuccess(`Synced ${data.contacts_synced} contacts from Google + cross-referenced with Calendar & Gmail`);
      await load();
      setTimeout(() => setSuccess(null), 5000);
    } catch (e) {
      setError(e.message);
    }
    setSyncing(false);
  };

  const togglePermission = async (contact) => {
    try {
      await base44.functions.invoke("googleContactsSync", {
        action: "set_permission",
        contact_id: contact.id,
        agent_allowed: !contact.agent_allowed,
      });
      setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, agent_allowed: !c.agent_allowed } : c));
    } catch (e) {
      setError(e.message);
    }
  };

  const bulkAllow = async () => {
    const filtered = getFilteredContacts();
    const ids = filtered.map(c => c.id);
    if (!ids.length) return;
    try {
      await base44.functions.invoke("googleContactsSync", {
        action: "bulk_set_permission",
        contact_ids: ids,
        agent_allowed: true,
      });
      setContacts(prev => prev.map(c => ids.includes(c.id) ? { ...c, agent_allowed: true } : c));
      setSuccess(`${ids.length} contacts allowed for agents`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e.message);
    }
  };

  const getFilteredContacts = () => {
    let filtered = contacts;
    if (filter === "allowed") filtered = filtered.filter(c => c.agent_allowed);
    if (filter === "blocked") filtered = filtered.filter(c => !c.agent_allowed);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(c =>
        c.full_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.company?.toLowerCase().includes(q)
      );
    }
    return filtered;
  };

  const filteredContacts = getFilteredContacts();
  const allowedCount = contacts.filter(c => c.agent_allowed).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Google Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">Sync contacts and control which ones agents can interact with</p>
        </div>
        <button onClick={syncContacts} disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {syncing ? "Syncing..." : "Sync Now"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-lg bg-status-green/10 border border-status-green/20 text-sm text-status-green flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {success}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xl font-display font-bold text-foreground">{contacts.length}</p>
          <p className="text-xs text-muted-foreground">Total Synced</p>
        </div>
        <div className="rounded-xl border border-status-green/30 bg-status-green/5 p-4">
          <p className="text-2xl font-display font-bold text-status-green">{allowedCount}</p>
          <p className="text-xs text-muted-foreground">Allowed for Agents</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xl font-display font-bold text-foreground">{contacts.length - allowedCount}</p>
          <p className="text-xs text-muted-foreground">Blocked</p>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-lg bg-muted text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div className="flex gap-2">
          {["all", "allowed", "blocked"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-3 py-2 rounded-lg text-sm capitalize transition-colors",
                filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
              {f}
            </button>
          ))}
          <button onClick={bulkAllow} className="px-3 py-2 rounded-lg text-sm bg-status-green/10 text-status-green hover:bg-status-green/20 transition-colors">
            Allow All
          </button>
        </div>
      </div>

      {/* Contact list */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filteredContacts.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">
            {contacts.length === 0 ? "No contacts synced yet. Click Sync Now to pull from Google." : "No contacts match your filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredContacts.map(contact => (
            <div key={contact.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors">
              {contact.photo_url ? (
                <img src={contact.photo_url} alt={contact.full_name} className="w-10 h-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                  {contact.full_name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{contact.full_name || "Unknown"}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  {contact.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {contact.phone}</span>}
                  {contact.email && <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3" /> {contact.email}</span>}
                  {contact.company && <span className="flex items-center gap-1 truncate"><Building2 className="h-3 w-3" /> {contact.company}</span>}
                </div>
                {(contact.calendar_events?.length > 0 || contact.gmail_threads > 0) && (
                  <div className="flex items-center gap-2 mt-1">
                    {contact.calendar_events?.length > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-chart-3"><Calendar className="h-2.5 w-2.5" /> {contact.calendar_events.length} events</span>
                    )}
                    {contact.gmail_threads > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-chart-4"><Mail className="h-2.5 w-2.5" /> {contact.gmail_threads} emails</span>
                    )}
                  </div>
                )}
              </div>
              <button onClick={() => togglePermission(contact)}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0",
                  contact.agent_allowed
                    ? "bg-status-green/10 text-status-green hover:bg-status-green/20"
                    : "bg-muted text-muted-foreground hover:bg-accent")}>
                <Shield className="h-3.5 w-3.5" />
                {contact.agent_allowed ? "Allowed" : "Blocked"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}