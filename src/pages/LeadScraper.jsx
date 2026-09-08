import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  Search, Loader2, MapPin, Star, Phone, Globe, Mail, Building2, Plus,
  CheckSquare, Square, Zap, RefreshCw, Users, Download, X, Sparkles, Filter
} from "lucide-react";

const ENRICHMENT_OPTIONS = [
  { v: "social_profiles", label: "Social Profiles", desc: "Facebook, Instagram, LinkedIn, X" },
  { v: "employee_count", label: "Employee Count", desc: "Estimated team size" },
  { v: "revenue", label: "Revenue Range", desc: "Estimated annual revenue" },
  { v: "tech_stack", label: "Tech Stack", desc: "Website technologies" },
  { v: "contact_info", label: "Decision Makers", desc: "Names, titles, emails" },
  { v: "competitors", label: "Competitors", desc: "Top 3 local competitors" },
];

export default function LeadScraper() {
  const { toast } = useToast();
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [keyword, setKeyword] = useState("");
  const [radius, setRadius] = useState(25);
  const [scraping, setScraping] = useState(false);
  const [leads, setLeads] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [enriching, setEnriching] = useState(null);
  const [showEnrich, setShowEnrich] = useState(null);
  const [enrichOptions, setEnrichOptions] = useState(["social_profiles", "contact_info"]);
  const [ingesting, setIngesting] = useState(false);

  const scrape = async () => {
    if (!industry || !location) { toast({ title: "Industry and location required", variant: "destructive" }); return; }
    setScraping(true);
    setLeads([]);
    setSelected(new Set());
    try {
      const res = await base44.functions.invoke("scrapeLeads", { industry, location, keyword, radius_miles: radius });
      const found = res.data?.leads || res.leads || [];
      if (found.length === 0) {
        toast({ title: "No leads found", description: "Try different criteria", variant: "destructive" });
      } else {
        // Save to ScrapedLead entity
        const saved = await base44.entities.ScrapedLead.bulkCreate(
          found.map(l => ({
            business_name: l.business_name || "",
            address: l.address || "",
            phone: l.phone || "",
            website: l.website || "",
            email: l.email || "",
            industry,
            location,
            keyword,
            radius_miles: radius,
            rating: l.rating || 0,
            review_count: l.review_count || 0,
            google_reviews: l.google_reviews || [],
            latitude: l.latitude,
            longitude: l.longitude,
            scraped_at: new Date().toISOString(),
          }))
        );
        setLeads(saved || found);
        toast({ title: `Found ${found.length} leads` });
      }
    } catch (e) {
      toast({ title: "Scrape failed", description: e.message, variant: "destructive" });
    }
    setScraping(false);
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === leads.length) setSelected(new Set());
    else setSelected(new Set(leads.map(l => l.id)));
  };

  const enrichLead = async (lead, options) => {
    setEnriching(lead.id);
    try {
      const res = await base44.functions.invoke("enrichLead", {
        business_name: lead.business_name,
        address: lead.address,
        website: lead.website,
        industry: lead.industry,
        enrichment_options: options,
      });
      const data = res.data?.enrichment_data || res.enrichment_data || {};
      const updated = await base44.entities.ScrapedLead.update(lead.id, { enriched: true, enrichment_data: data });
      setLeads(prev => prev.map(l => l.id === lead.id ? updated : l));
      toast({ title: "Lead enriched", description: lead.business_name });
    } catch (e) {
      toast({ title: "Enrich failed", description: e.message, variant: "destructive" });
    }
    setEnriching(null);
    setShowEnrich(null);
  };

  const ingestToCrm = async () => {
    const toIngest = leads.filter(l => selected.has(l.id) && !l.ingested_to_crm);
    if (toIngest.length === 0) { toast({ title: "No new leads to ingest" }); return; }
    setIngesting(true);
    try {
      const contacts = await base44.entities.XtremeCrmContact.bulkCreate(
        toIngest.map(l => ({
          full_name: l.business_name,
          email: l.email || "",
          phone: l.phone || "",
          company: l.business_name,
          industry: l.industry,
          location: l.location,
          website: l.website || "",
          lifecycle_stage: "lead",
          lead_source: "scraper",
          enrichment_data: l.enrichment_data || {},
          tags: ["scraper", l.industry, l.location].filter(Boolean),
        }))
      );
      // Mark as ingested
      for (const c of contacts || []) {
        const lead = toIngest.find(l => l.business_name === c.company);
        if (lead) {
          await base44.entities.ScrapedLead.update(lead.id, { ingested_to_crm: true, crm_contact_id: c.id });
        }
      }
      setLeads(prev => prev.map(l => selected.has(l.id) ? { ...l, ingested_to_crm: true } : l));
      toast({ title: `${contacts?.length || 0} leads ingested to CRM` });
      setSelected(new Set());
    } catch (e) {
      toast({ title: "Ingest failed", description: e.message, variant: "destructive" });
    }
    setIngesting(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto pb-24 md:pb-6">
      <div className="mb-4">
        <h1 className="text-xl md:text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <Search className="h-5 w-5 md:h-6 md:w-6 text-primary" /> Lead Scraper
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Find businesses by industry, location, keyword, and radius. Enrich and ingest into XTREME CRM.</p>
      </div>

      {/* Search form */}
      <div className="rounded-xl border border-border bg-card p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Industry *</label>
            <input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. HVAC, Dentist, Restaurant"
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Location *</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Miami, FL"
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Keyword</label>
            <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="e.g. emergency, 24/7"
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Radius (miles)</label>
            <input type="number" min="1" max="100" value={radius} onChange={e => setRadius(parseInt(e.target.value) || 25)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none" />
          </div>
        </div>
        <button onClick={scrape} disabled={scraping}
          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {scraping ? <><Loader2 className="h-4 w-4 animate-spin" /> Scraping…</> : <><Search className="h-4 w-4" /> Scrape Leads</>}
        </button>
      </div>

      {/* Results */}
      {leads.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-3">
            <button onClick={selectAll} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              {selected.size === leads.length && leads.length > 0
                ? <CheckSquare className="h-4 w-4 text-primary" />
                : <Square className="h-4 w-4" />}
              {selected.size > 0 ? `${selected.size} selected` : "Select all"}
            </button>
            <div className="flex gap-2">
              <button onClick={ingestToCrm} disabled={ingesting || selected.size === 0}
                className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5">
                {ingesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Ingest to CRM
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {leads.map(lead => (
              <div key={lead.id} className={cn("rounded-lg border bg-card p-3", selected.has(lead.id) ? "border-primary bg-primary/5" : "border-border")}>
                <div className="flex items-start gap-3">
                  <button onClick={() => toggleSelect(lead.id)} className="mt-1 shrink-0">
                    {selected.has(lead.id) ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5 text-muted-foreground" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground">{lead.business_name}</p>
                      {lead.rating > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-chart-4"><Star className="h-3 w-3 fill-current" /> {lead.rating} ({lead.review_count})</span>
                      )}
                      {lead.enriched && <span className="flex items-center gap-0.5 text-[9px] text-primary"><Zap className="h-2.5 w-2.5" /> Enriched</span>}
                      {lead.ingested_to_crm && <span className="text-[9px] text-status-green">✓ In CRM</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      {lead.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {lead.address}</span>}
                      {lead.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {lead.phone}</span>}
                      {lead.website && <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {lead.website}</span>}
                      {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {lead.email}</span>}
                    </div>
                    {lead.enrichment_data && Object.keys(lead.enrichment_data).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-primary cursor-pointer">View enrichment data</summary>
                        <pre className="mt-1 p-2 rounded bg-accent/30 text-[10px] text-foreground max-h-32 overflow-y-auto scrollbar-thin">{JSON.stringify(lead.enrichment_data, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => setShowEnrich(lead)} disabled={lead.enriched}
                      className="px-2 py-1 rounded-lg border border-border text-xs hover:bg-accent disabled:opacity-50 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Enrich
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Enrichment modal */}
      {showEnrich && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowEnrich(null)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-foreground flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Enrich: {showEnrich.business_name}</h3>
              <button onClick={() => setShowEnrich(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Select what data to enrich this lead with:</p>
            <div className="space-y-2 mb-4">
              {ENRICHMENT_OPTIONS.map(o => (
                <label key={o.v} className="flex items-start gap-2 p-2.5 rounded-lg border border-border hover:bg-accent/30 cursor-pointer">
                  <input type="checkbox" checked={enrichOptions.includes(o.v)}
                    onChange={e => setEnrichOptions(prev => e.target.checked ? [...prev, o.v] : prev.filter(x => x !== o.v))}
                    className="mt-0.5 h-4 w-4 accent-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{o.label}</p>
                    <p className="text-xs text-muted-foreground">{o.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            <button onClick={() => enrichLead(showEnrich, enrichOptions)} disabled={enriching === showEnrich.id}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {enriching === showEnrich.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {enriching === showEnrich.id ? "Enriching…" : "Enrich Lead"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}