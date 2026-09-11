import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap, MessageSquare, Phone, Bot, Globe, UserPlus, Play, Loader2, CheckCircle2, XCircle, AlertTriangle, ListChecks, Monitor } from 'lucide-react';

const ACTION_TYPES = [
  { id: 'send_sms', label: 'Send SMS', icon: MessageSquare, color: 'text-green-500', desc: 'Real SMS via Telnyx' },
  { id: 'send_whatsapp', label: 'Send WhatsApp', icon: MessageSquare, color: 'text-green-500', desc: 'WhatsApp via Telnyx' },
  { id: 'make_call', label: 'AI Voice Call', icon: Phone, color: 'text-blue-500', desc: 'Real voice call via Telnyx' },
  { id: 'ai_task', label: 'AI Task', icon: Bot, color: 'text-purple-500', desc: 'LLM task via Vercel AI Gateway' },
  { id: 'web_scrape', label: 'Web Scrape', icon: Globe, color: 'text-orange-500', desc: 'Fetch & extract page content' },
  { id: 'web_interact', label: 'AI Web Interact', icon: Globe, color: 'text-cyan-500', desc: 'AI-powered form analysis & action plan' },
  { id: 'browser_agent', label: 'Browser Agent', icon: Monitor, color: 'text-indigo-500', desc: 'Full browser automation via Browserbase' },
  { id: 'browser_fill_form', label: 'Fill Form', icon: Monitor, color: 'text-teal-500', desc: 'AI plans + Browserbase fills & submits' },
  { id: 'create_lead', label: 'Create Lead', icon: UserPlus, color: 'text-pink-500', desc: 'Add contact to CRM' },
  { id: 'autonomous_sequence', label: 'Full Sequence', icon: ListChecks, color: 'text-yellow-500', desc: 'Trigger → Task → Action chain' },
];

export default function AutonomousActionTest() {
  const [apiKey, setApiKey] = useState('');
  const [capabilities, setCapabilities] = useState(null);
  const [selectedAction, setSelectedAction] = useState('send_sms');
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  // Form state
  const [smsTo, setSmsTo] = useState('');
  const [smsFrom, setSmsFrom] = useState('+18334843799');
  const [smsMessage, setSmsMessage] = useState('Hello from XTREME AI! This is an autonomous action test.');
  const [callTo, setCallTo] = useState('');
  const [aiPrompt, setAiPrompt] = useState('Analyze the construction industry and identify 3 opportunities for AI automation.');
  const [scrapeUrl, setScrapeUrl] = useState('https://httpbin.org/get');
  const [interactUrl, setInteractUrl] = useState('https://example.com');
  const [interactGoal, setInteractGoal] = useState('Find contact form and prepare to fill it');
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadCompany, setLeadCompany] = useState('');
  const [seqTrigger, setSeqTrigger] = useState('New lead from website form submission');
  const [seqNumber, setSeqNumber] = useState('');
  const [browserTask, setBrowserTask] = useState('Go to https://example.com and describe what you see on the page.');
  const [browserWait, setBrowserWait] = useState(true);
  const [formFillUrl, setFormFillUrl] = useState('https://httpbin.org/forms/post');
  const [formFillGoal, setFormFillGoal] = useState('Fill the form with test data: name "John Doe", email "john@test.com", phone "555-1234"');
  const [formFillData, setFormFillData] = useState('');

  const fetchApiKey = useCallback(async () => {
    try {
      const keys = await base44.entities.ApiKey.filter({ status: 'active' }, '-created_date', 1);
      if (keys.length) setApiKey(keys[0].key_value);
    } catch (e) {}
  }, []);

  const loadCapabilities = useCallback(async () => {
    if (!apiKey) return;
    try {
      const res = await base44.functions.invoke('executeAutonomousAction', { action: 'capability_status', api_key: apiKey });
      setCapabilities(res.data?.capabilities);
    } catch (e) {}
  }, [apiKey]);

  useEffect(() => { fetchApiKey(); }, [fetchApiKey]);
  useEffect(() => { if (apiKey) loadCapabilities(); }, [apiKey, loadCapabilities]);

  const handleExecute = async () => {
    if (!apiKey) { alert('No API key found. Generate one in Portal > API Keys.'); return; }
    setExecuting(true); setResult(null);
    try {
      let payload = { api_key: apiKey };
      const action = selectedAction;
      if (action === 'send_sms') payload = { ...payload, action, to_number: smsTo, from_number: smsFrom, message: smsMessage };
      else if (action === 'send_whatsapp') payload = { ...payload, action, to_number: smsTo, from_number: smsFrom, message: smsMessage };
      else if (action === 'make_call') payload = { ...payload, action, to_number: callTo, from_number: smsFrom };
      else if (action === 'ai_task') payload = { ...payload, action, prompt: aiPrompt };
      else if (action === 'web_scrape') payload = { ...payload, action, url: scrapeUrl };
      else if (action === 'web_interact') payload = { ...payload, action, url: interactUrl, goal: interactGoal };
      else if (action === 'create_lead') payload = { ...payload, action, name: leadName, phone: leadPhone, company: leadCompany };
      else if (action === 'browser_agent') payload = { ...payload, action, task: browserTask, wait_for_completion: browserWait };
      else if (action === 'browser_fill_form') payload = { ...payload, action, url: formFillUrl, goal: formFillGoal, form_data: formFillData ? JSON.parse(formFillData) : undefined };
      else if (action === 'autonomous_sequence') payload = { ...payload, action, trigger: seqTrigger, test_number: seqNumber, test_message: 'Autonomous sequence test from XTREME AI' };

      const res = await base44.functions.invoke('executeAutonomousAction', payload);
      const data = res.data || res;
      setResult(data);
      setHistory(prev => [{ action, timestamp: new Date().toISOString(), result: data }, ...prev].slice(0, 20));
    } catch (e) {
      setResult({ error: e.message });
    }
    setExecuting(false);
  };

  const renderForm = () => {
    switch (selectedAction) {
      case 'send_sms':
      case 'send_whatsapp':
        return (
          <div className="space-y-3">
            <div><Label>To Number</Label><Input value={smsTo} onChange={e => setSmsTo(e.target.value)} placeholder="+1XXXXXXXXXX" /></div>
            <div><Label>From Number</Label><Input value={smsFrom} onChange={e => setSmsFrom(e.target.value)} /></div>
            <div><Label>Message</Label><Textarea rows={3} value={smsMessage} onChange={e => setSmsMessage(e.target.value)} /></div>
          </div>
        );
      case 'make_call':
        return (
          <div className="space-y-3">
            <div><Label>To Number</Label><Input value={callTo} onChange={e => setCallTo(e.target.value)} placeholder="+1XXXXXXXXXX" /></div>
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-muted-foreground">
              <AlertTriangle className="w-4 h-4 inline mr-1 text-blue-500" />
              Voice calls require a Telnyx Call Control Connection ID. The call will be initiated via Telnyx Call Control API.
            </div>
          </div>
        );
      case 'ai_task':
        return (
          <div className="space-y-3">
            <div><Label>AI Task Prompt</Label><Textarea rows={5} value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} /></div>
            <p className="text-xs text-muted-foreground">Routes through Vercel AI Gateway — bypasses Base44 credit limits.</p>
          </div>
        );
      case 'web_scrape':
        return (
          <div className="space-y-3">
            <div><Label>URL to Scrape</Label><Input value={scrapeUrl} onChange={e => setScrapeUrl(e.target.value)} placeholder="https://..." /></div>
            <p className="text-xs text-muted-foreground">Fetches the page, extracts text content, title, and links.</p>
          </div>
        );
      case 'web_interact':
        return (
          <div className="space-y-3">
            <div><Label>URL to Analyze</Label><Input value={interactUrl} onChange={e => setInteractUrl(e.target.value)} placeholder="https://..." /></div>
            <div><Label>Goal</Label><Input value={interactGoal} onChange={e => setInteractGoal(e.target.value)} /></div>
            <p className="text-xs text-muted-foreground">AI fetches the page, identifies forms, analyzes fields, and recommends actions + form data to fill.</p>
          </div>
        );
      case 'create_lead':
        return (
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={leadName} onChange={e => setLeadName(e.target.value)} placeholder="John Smith" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Phone</Label><Input value={leadPhone} onChange={e => setLeadPhone(e.target.value)} placeholder="+1..." /></div>
              <div><Label>Company</Label><Input value={leadCompany} onChange={e => setLeadCompany(e.target.value)} /></div>
            </div>
          </div>
        );
      case 'browser_agent':
        return (
          <div className="space-y-3">
            <div><Label>Natural Language Task</Label><Textarea rows={4} value={browserTask} onChange={e => setBrowserTask(e.target.value)} placeholder="Go to https://example.com, fill out the contact form with name 'John', email 'john@test.com', and submit" /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="browserWait" checked={browserWait} onChange={e => setBrowserWait(e.target.checked)} className="rounded" />
              <label htmlFor="browserWait" className="text-sm">Wait for completion (polls up to 120s)</label>
            </div>
            <p className="text-xs text-muted-foreground">Browserbase opens a real cloud browser, navigates to the page, fills forms, clicks buttons, and returns the result — all from your natural language prompt.</p>
          </div>
        );
      case 'browser_fill_form':
        return (
          <div className="space-y-3">
            <div><Label>Form URL</Label><Input value={formFillUrl} onChange={e => setFormFillUrl(e.target.value)} placeholder="https://..." /></div>
            <div><Label>Goal / Instructions</Label><Textarea rows={3} value={formFillGoal} onChange={e => setFormFillGoal(e.target.value)} /></div>
            <div><Label>Form Data (JSON, optional — leave blank for AI to decide)</Label><Textarea rows={3} value={formFillData} onChange={e => setFormFillData(e.target.value)} placeholder='{"name": "John Doe", "email": "john@test.com"}' /></div>
            <p className="text-xs text-muted-foreground">AI analyzes the form, determines what data to fill, then Browserbase navigates and submits it. If you provide JSON form_data, it skips AI analysis and fills directly.</p>
          </div>
        );
      case 'autonomous_sequence':
        return (
          <div className="space-y-3">
            <div><Label>Trigger Event</Label><Input value={seqTrigger} onChange={e => setSeqTrigger(e.target.value)} /></div>
            <div><Label>Test SMS Number (optional)</Label><Input value={seqNumber} onChange={e => setSeqNumber(e.target.value)} placeholder="+1..." /></div>
            <p className="text-xs text-muted-foreground">Executes a 4-step chain: AI analysis → web scrape → lead creation → SMS notification.</p>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Zap className="w-7 h-7 text-primary" /> Autonomous Action Test Console
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Real triggers → real tasks → real actions. Test SMS, voice, AI, web scraping, and full autonomous sequences.</p>
      </div>

      {/* Capability Status */}
      {capabilities && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {Object.entries(capabilities).map(([key, cap]) => (
            <div key={key} className={`p-3 rounded-lg border flex items-center gap-2 ${cap.live ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
              {cap.live ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{cap.label}</p>
                <p className="text-xs text-muted-foreground truncate">{cap.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Type Selector */}
      <div>
        <Label className="mb-2 block">Select Action Type</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {ACTION_TYPES.map(a => (
            <button key={a.id} onClick={() => { setSelectedAction(a.id); setResult(null); }}
              className={`p-3 rounded-xl border-2 text-center transition-all ${selectedAction === a.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
              <a.icon className={`w-6 h-6 mx-auto mb-1 ${a.color}`} />
              <p className="text-xs font-medium">{a.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Configuration Form */}
      <Card>
        <CardHeader><CardTitle className="text-base">Configure & Execute</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {renderForm()}
          <Button onClick={handleExecute} disabled={executing || !apiKey} className="w-full">
            {executing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Executing...</> : <><Play className="w-4 h-4 mr-2" />Execute Action</>}
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className={result.error ? 'border-red-500' : 'border-green-500'}>
          <CardContent className="p-4 space-y-2">
            {result.error ? (
              <p className="text-red-500 text-sm flex items-center gap-2"><XCircle className="w-4 h-4" /> Error: {result.error}</p>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <p className="font-semibold">{result.action} — {result.status}</p>
                  {result.ok !== undefined && <Badge variant={result.ok ? 'default' : 'destructive'}>{result.ok ? 'OK' : 'FAILED'}</Badge>}
                </div>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto max-h-64 scrollbar-thin">{JSON.stringify(result, null, 2)}</pre>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Action History ({history.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {history.map((h, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded border border-border text-xs">
                <Badge variant="outline">{h.action}</Badge>
                <span className="text-muted-foreground">{new Date(h.timestamp).toLocaleTimeString()}</span>
                <Badge variant={h.result.error || h.result.status === 'failed' ? 'destructive' : 'default'} className="ml-auto">
                  {h.result.error ? 'ERROR' : h.result.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Cloud Browser Info */}
      <Card className="border-indigo-500/30 bg-indigo-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Monitor className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Cloud Browser (Browserbase) — LIVE</p>
              <p className="text-muted-foreground mt-1">
                Browser Agent and Fill Form actions use Browserbase's managed cloud browser — a real headless Chrome that navigates, fills forms, clicks buttons, and submits. The AI team can now operate any website autonomously from a natural language prompt. Web Scrape and AI Web Interact remain as lightweight fetch-based alternatives for read-only analysis.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}