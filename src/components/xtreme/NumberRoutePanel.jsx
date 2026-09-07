import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Phone, Globe, Link2, Save, Check } from "lucide-react";

export default function NumberRoutePanel({ personas }) {
  const { toast } = useToast();
  const [numbers, setNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ route_url: "", route_label: "", route_type: "website", assigned_persona_id: "" });

  const load = async () => {
    try {
      const data = await base44.entities.PhoneNumber.list("-created_date", 100);
      setNumbers(data);
    } catch (e) { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startEdit = (n) => {
    setEditing(n.id);
    setForm({
      route_url: n.route_url || "",
      route_label: n.route_label || "",
      route_type: n.route_type || "website",
      assigned_persona_id: n.assigned_persona_id || ""
    });
  };

  const save = async (id) => {
    try {
      await base44.entities.PhoneNumber.update(id, form);
      toast({ title: "Route updated", description: "Phone number routing saved" });
      setEditing(null);
      load();
    } catch (e) {
      toast({ title: "Failed", description: String(e.message || e), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-accent-orange" />
        <span className="font-display text-[11px] tracking-[0.15em] uppercase text-text-primary">Phone Number → Website Routing</span>
      </div>

      {loading && <div className="text-[11px] text-text-muted font-display">Loading numbers…</div>}

      <div className="space-y-2">
        {numbers.map(n => {
          const isEditing = editing === n.id;
          const persona = personas.find(p => p.id === n.assigned_persona_id);
          return (
            <div key={n.id} className="rounded-lg border border-surface-border bg-surface p-3">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-accent-orange shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[12px] text-text-primary">{n.e164}</div>
                  {!isEditing ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      {n.route_url ? (
                        <>
                          <Link2 className="h-3 w-3 text-text-muted" />
                          <span className="text-[10px] text-text-muted">{n.route_label || n.route_url}</span>
                          {persona && <span className="text-[9px] text-accent-orange font-display uppercase">· {persona.name}</span>}
                        </>
                      ) : (
                        <span className="text-[10px] text-text-muted italic">No route assigned</span>
                      )}
                    </div>
                  ) : null}
                </div>
                {!isEditing ? (
                  <button onClick={() => startEdit(n)}
                    className="h-7 px-2.5 rounded border border-surface-border text-[10px] font-display uppercase tracking-wider hover:bg-surface/50">
                    Edit
                  </button>
                ) : (
                  <button onClick={() => save(n.id)}
                    className="flex items-center gap-1 h-7 px-2.5 rounded bg-status-green/20 text-status-green text-[10px] font-display uppercase tracking-wider hover:bg-status-green/30">
                    <Save className="h-3 w-3" /> Save
                  </button>
                )}
              </div>
              {isEditing && (
                <div className="mt-3 grid md:grid-cols-2 gap-2 pt-3 border-t border-surface-border">
                  <div>
                    <label className="font-display text-[9px] uppercase tracking-wider text-text-muted">Website URL</label>
                    <input value={form.route_url} onChange={e => setForm({ ...form, route_url: e.target.value })}
                      className="w-full mt-1 h-8 px-2 rounded border border-surface-border bg-base text-[11px]" placeholder="https://mywebsite.com" />
                  </div>
                  <div>
                    <label className="font-display text-[9px] uppercase tracking-wider text-text-muted">Label</label>
                    <input value={form.route_label} onChange={e => setForm({ ...form, route_label: e.target.value })}
                      className="w-full mt-1 h-8 px-2 rounded border border-surface-border bg-base text-[11px]" placeholder="My Business Site" />
                  </div>
                  <div>
                    <label className="font-display text-[9px] uppercase tracking-wider text-text-muted">Route Type</label>
                    <select value={form.route_type} onChange={e => setForm({ ...form, route_type: e.target.value })}
                      className="w-full mt-1 h-8 px-2 rounded border border-surface-border bg-base text-[11px]">
                      <option value="website">Website</option>
                      <option value="webhook">Webhook</option>
                      <option value="api">API Endpoint</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-display text-[9px] uppercase tracking-wider text-text-muted">Assigned Persona</label>
                    <select value={form.assigned_persona_id} onChange={e => setForm({ ...form, assigned_persona_id: e.target.value })}
                      className="w-full mt-1 h-8 px-2 rounded border border-surface-border bg-base text-[11px]">
                      <option value="">None</option>
                      {personas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!loading && numbers.length === 0 && (
          <div className="text-[11px] text-text-muted font-display text-center py-8">No phone numbers provisioned yet</div>
        )}
      </div>
    </div>
  );
}