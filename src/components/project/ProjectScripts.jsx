import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { FileText, Plus, Trash2, Loader2, MessageSquare, Phone, Mail, Copy } from "lucide-react";

export default function ProjectScripts({ project }) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTpl, setNewTpl] = useState({
    channel: "sms", situation: "sales", tone: "professional",
    template_body: "", target_audience: "",
  });

  useEffect(() => { load(); }, [project?.id]);

  async function load() {
    if (!project?.template_ids?.length) { setLoading(false); return; }
    try {
      const { items } = await base44.entities.CommunicationTemplate.filter(
        { id: { $in: project.template_ids } },
        { sort: "-created_date", limit: 50 }
      );
      setTemplates(items);
    } catch (_) {}
    setLoading(false);
  }

  async function createTemplate() {
    if (!newTpl.template_body) return;
    try {
      const tpl = await base44.entities.CommunicationTemplate.create({
        ...newTpl,
        industry: project?.industry || "universal",
        active: true,
      });
      await base44.entities.Project.update(project.id, {
        template_ids: [...(project.template_ids || []), tpl.id],
      });
      setNewTpl({ channel: "sms", situation: "sales", tone: "professional", template_body: "", target_audience: "" });
      setShowCreate(false);
      load();
      toast({ title: "Script created" });
    } catch (e) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  }

  async function deleteTemplate(tpl) {
    await base44.entities.CommunicationTemplate.delete(tpl.id);
    await base44.entities.Project.update(project.id, {
      template_ids: (project.template_ids || []).filter(id => id !== tpl.id),
    });
    load();
  }

  const channelIcons = { sms: MessageSquare, voice: Phone, email: Mail, mms: MessageSquare, whatsapp: MessageSquare };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Scripts & Templates ({templates.length})</h3>
        <button onClick={() => setShowCreate(!showCreate)} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1">
          <Plus className="h-3 w-3" /> New Script
        </button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <select value={newTpl.channel} onChange={e => setNewTpl({ ...newTpl, channel: e.target.value })}
              className="h-10 px-3 rounded-lg border border-border bg-background text-sm">
              <option value="sms">SMS</option><option value="voice">Voice</option>
              <option value="email">Email</option><option value="mms">MMS</option><option value="whatsapp">WhatsApp</option>
            </select>
            <select value={newTpl.situation} onChange={e => setNewTpl({ ...newTpl, situation: e.target.value })}
              className="h-10 px-3 rounded-lg border border-border bg-background text-sm">
              <option value="sales">Sales</option><option value="follow_up">Follow Up</option>
              <option value="outreach">Outreach</option><option value="response">Response</option>
              <option value="objection_handling">Objection Handling</option><option value="qualification">Qualification</option>
              <option value="closing">Closing</option><option value="appointment">Appointment</option>
              <option value="re_engagement">Re-engagement</option>
            </select>
            <select value={newTpl.tone} onChange={e => setNewTpl({ ...newTpl, tone: e.target.value })}
              className="h-10 px-3 rounded-lg border border-border bg-background text-sm">
              <option value="professional">Professional</option><option value="casual">Casual</option>
              <option value="friendly">Friendly</option><option value="persuasive">Persuasive</option>
              <option value="consultative">Consultative</option><option value="energetic">Energetic</option>
              <option value="calm">Calm</option><option value="urgent">Urgent</option>
            </select>
          </div>
          <input value={newTpl.target_audience} onChange={e => setNewTpl({ ...newTpl, target_audience: e.target.value })}
            placeholder="Target audience (e.g. new leads, past clients)"
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
          <textarea value={newTpl.template_body} onChange={e => setNewTpl({ ...newTpl, template_body: e.target.value })}
            placeholder="Script body... (use {{name}} for personalization)"
            rows={4} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none" />
          <div className="flex gap-2">
            <button onClick={createTemplate} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Create</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg border border-border text-sm">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : templates.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No scripts yet. Create message templates for your agents to use.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map(tpl => {
            const Icon = channelIcons[tpl.channel] || MessageSquare;
            return (
              <div key={tpl.id} className="p-3 rounded-lg border border-border bg-card">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-foreground">{tpl.channel} · {tpl.situation}</p>
                      <p className="text-[10px] text-muted-foreground">{tpl.tone} {tpl.target_audience ? `· ${tpl.target_audience}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { navigator.clipboard.writeText(tpl.template_body); toast({ title: "Copied" }); }}
                      className="text-muted-foreground hover:text-primary p-1"><Copy className="h-3.5 w-3.5" /></button>
                    <button onClick={() => deleteTemplate(tpl)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap pl-10">{tpl.template_body}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}