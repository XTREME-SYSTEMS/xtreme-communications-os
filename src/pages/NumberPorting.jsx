import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { ArrowLeft, Phone, Loader2, CheckCircle2, Clock, AlertCircle, FileText, ArrowRight } from "lucide-react";

export default function NumberPorting() {
  const { toast } = useToast();
  const [ports, setPorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    number_to_port: "",
    current_carrier: "",
    account_number: "",
    account_pin: "",
    authorized_user: "",
    billing_address: "",
    port_type: "residential",
    notes: "",
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      // Load porting requests from PhoneNumber entity with porting status
      const list = await base44.entities.PhoneNumber.filter({ status: "porting" });
      setPorts(list);
    } catch (_) {}
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.number_to_port || !form.current_carrier || !form.account_number) {
      toast({ title: "Fill required fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // Create a porting record
      await base44.entities.PhoneNumber.create({
        e164: form.number_to_port,
        type: "local",
        capabilities: ["sms", "voice"],
        status: "porting",
        classification: "PROVIDER-BACKED",
        route_label: `Porting from ${form.current_carrier}`,
        route_type: "none",
      });
      toast({ title: "Porting request submitted!", description: `${form.number_to_port} · Estimated 2-10 business days` });
      setForm({ number_to_port: "", current_carrier: "", account_number: "", account_pin: "", authorized_user: "", billing_address: "", port_type: "residential", notes: "" });
      await load();
    } catch (e) {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  const carriers = ["AT&T", "Verizon", "T-Mobile", "Sprint", "US Cellular", "Google Voice", "Bandwidth", "Twilio", "Other"];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link to="/portal" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"><ArrowLeft className="h-3 w-3" /> Dashboard</Link>
      <h1 className="text-2xl font-display font-bold text-foreground mb-1">Number Porting</h1>
      <p className="text-sm text-muted-foreground mb-6">Port your existing phone number to Xtreme Communications. Typically takes 2-10 business days.</p>

      {/* Porting Form */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6 space-y-4">
        <h2 className="font-medium text-foreground flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Porting Request</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Number to Port *</label>
            <input value={form.number_to_port} onChange={e => setForm({ ...form, number_to_port: e.target.value })}
              placeholder="+1 954-884-8885" className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Carrier *</label>
            <select value={form.current_carrier} onChange={e => setForm({ ...form, current_carrier: e.target.value })}
              className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
              <option value="">Select...</option>
              {carriers.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Account Number *</label>
            <input value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })}
              placeholder="Account # from your carrier" className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Account PIN / Password</label>
            <input value={form.account_pin} onChange={e => setForm({ ...form, account_pin: e.target.value })}
              placeholder="PIN or password" className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Authorized User *</label>
            <input value={form.authorized_user} onChange={e => setForm({ ...form, authorized_user: e.target.value })}
              placeholder="John Doe" className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Port Type</label>
            <select value={form.port_type} onChange={e => setForm({ ...form, port_type: e.target.value })}
              className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none">
              <option value="residential">Residential</option>
              <option value="business">Business</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Service Address</label>
          <input value={form.billing_address} onChange={e => setForm({ ...form, billing_address: e.target.value })}
            placeholder="123 Main St, City, State, ZIP" className="w-full h-10 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</label>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="Any additional information..." className="w-full h-16 px-3 py-2 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none resize-none" />
        </div>
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="text-xs text-foreground font-medium mb-1">📋 Porting Requirements</p>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            <li>• The number must be active with your current carrier</li>
            <li>• Account info must match exactly (name, address, account #)</li>
            <li>• Do not cancel your current service until porting completes</li>
            <li>• Typical timeline: 2-10 business days</li>
          </ul>
        </div>
        <button onClick={handleSubmit} disabled={submitting}
          className="w-full py-2.5 rounded-lg gold-gradient text-black font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {submitting ? "Submitting..." : "Submit Porting Request"}
        </button>
      </div>

      {/* Active Ports */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium text-foreground mb-3">Porting Requests ({ports.length})</h2>
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 text-muted-foreground animate-spin" /></div>
        ) : ports.length === 0 ? (
          <div className="text-center py-8">
            <Phone className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No active porting requests.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ports.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-accent/30">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.e164}</p>
                    <p className="text-xs text-muted-foreground">{p.route_label || "Porting in progress"}</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{p.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}