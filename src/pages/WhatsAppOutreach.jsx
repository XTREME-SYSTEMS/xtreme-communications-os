import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Users, MessageCircle, Bot, Rocket, BarChart3, Phone, Mail, Building2, MapPin, Tag } from 'lucide-react';

const WHATSAPP_NUMBERS = [
  { value: '+18334843799', label: '+1 (833) 484-3799 (Telnyx WhatsApp)' },
  { value: '+19548848885', label: '+1 (954) 884-8885 (Telnyx Messaging)' },
  { value: '+18337001239', label: '+1 (833) 700-1239 (Telnyx Messaging)' },
  { value: '+19549102671', label: '+1 (954) 910-2671 (Telnyx Voice/SMS)' },
];

const PLAYBOOK_DAYS = [
  { day: 1, title: 'Welcome + Free AI Tool', situation: 'outreach', msg: "Hey {{first_name}}! 👋 It's been a while since PCU. We've built incredible AI tools for contractors like you. Want a FREE AI tool that generates follow-up messages for your business? No strings attached. Reply 'YES' and I'll send it over. — Team Xtreme" },
  { day: 2, title: 'Website Pitch', situation: 'sales', msg: "Hi {{first_name}}! Quick question — does {{company}} have a website that actually brings you leads? We're building AI-powered contractor websites that book jobs on autopilot. Want to see a demo? Reply 'WEBSITE' 🏗️" },
  { day: 3, title: 'AI Tools Showcase', situation: 'marketing', msg: "Hey {{first_name}}! We just launched AI tools for epoxy/flooring pros: instant quotes, photo editing, customer follow-up bots. All FREE to try. Want access? Reply 'AI' 🤖" },
  { day: 4, title: 'New Products', situation: 'sales', msg: "{{first_name}}, we've got new products dropping this month that'll save you hours on every job. Epoxy kits, polishing pads, training templates. Want the catalog? Reply 'NEW' 📦" },
  { day: 5, title: 'Free Templates', situation: 'nurture', msg: "Hey {{first_name}}! We're giving away FREE business templates — proposals, invoices, contracts. All designed for contractors. Want the pack? Reply 'TEMPLATES' 📋" },
  { day: 6, title: '15% Off Local Store', situation: 'sales', msg: "{{first_name}}! 👉 We're offering 15% OFF everything at our local store for PCU alumni. Epoxy, tools, training — everything. Just show this message. Want the address? Reply 'STORE' 🏪" },
  { day: 7, title: 'Social Proof / Check-in', situation: 'follow_up', msg: "Hey {{first_name}}, just checking in! Have you checked out the free AI tools? Contractors are saving 5+ hours a week. Want me to set you up? Reply 'SETUP' ⚡" },
  { day: 8, title: 'Success Story', situation: 'outreach', msg: "{{first_name}}, quick story: a PCU alum used our AI follow-up bot and booked 3 extra jobs in his first week. Want to try it free? Reply 'STORY' 📖" },
  { day: 9, title: 'Training Video', situation: 'marketing', msg: "Hey {{first_name}}! New training video: 'How to Price Epoxy Jobs for Maximum Profit'. FREE to watch. Want the link? Reply 'VIDEO' 🎥" },
  { day: 10, title: 'Limited Time Offer', situation: 'sales', msg: "{{first_name}}, the 15% off store discount ends soon! Don't miss out on epoxy kits, polishing pads, and more. Want to claim it? Reply 'CLAIM' before it's gone! ⏰" },
  { day: 11, title: 'Business Coaching', situation: 'nurture', msg: "Hey {{first_name}}! We offer 1-on-1 business coaching for contractors. We'll help you scale your epoxy business. First session FREE. Reply 'COACH' to book 📅" },
  { day: 12, title: 'Community Invite', situation: 'outreach', msg: "{{first_name}}, we're building a community of epoxy pros who share tips, jobs, and leads. Want to join? It's FREE. Reply 'COMMUNITY' 🤝" },
  { day: 13, title: 'Last Chance Discount', situation: 'sales', msg: "Last chance, {{first_name}}! ⏰ The 15% off everything at our local store expires in 48 hours. Epoxy, tools, training — all discounted. Reply 'LAST' to get the address 🏪" },
  { day: 14, title: 'Final Follow-up', situation: 'follow_up', msg: "Hey {{first_name}}, I don't want to keep bugging you, but I really think you'd love our free AI tools. Designed specifically for epoxy/flooring contractors. One click to try — reply 'TRY' 🤖" },
  { day: 15, title: 'Keep in Touch', situation: 're_engagement', msg: "{{first_name}}, no pressure at all! 😊 If you ever need anything — websites, AI tools, epoxy supplies, training, or just want to catch up — we're here. Save this number and reach out anytime. — Team Xtreme 💪" },
];

export default function WhatsAppOutreach() {
  const [apiKey, setApiKey] = useState('');
  const [activeTab, setActiveTab] = useState('campaigns');
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState({ totalContacts: 0, withPhone: 0, totalCampaigns: 0, totalAgents: 0 });

  // Campaign form state
  const [campaignName, setCampaignName] = useState('');
  const [channel, setChannel] = useState('whatsapp');
  const [fromNumber, setFromNumber] = useState('+18334843799');
  const [messageTemplate, setMessageTemplate] = useState(PLAYBOOK_DAYS[0].msg);
  const [selectedDay, setSelectedDay] = useState(1);
  const [filterTag, setFilterTag] = useState('pcu_alumni');
  const [batchSize, setBatchSize] = useState(50);
  const [throttle, setThrottle] = useState(5);
  const [launchResult, setLaunchResult] = useState(null);

  const fetchApiKey = useCallback(async () => {
    try {
      const keys = await base44.entities.ApiKey.filter({ status: 'active' }, '-created_date', 1);
      if (keys.length) setApiKey(keys[0].key_value);
    } catch (e) { console.error('Failed to fetch API key', e); }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [contactList, campaignList, templateList, agentList] = await Promise.all([
        base44.entities.XtremeCrmContact.filter({ tags: 'pcu_alumni' }, '-created_date', 5000),
        base44.entities.Campaign.list('-created_date', 50),
        base44.entities.CommunicationTemplate.filter({ channel: 'whatsapp', active: true }, '-created_date', 100),
        base44.entities.AgentPersona.filter({ active: true }, '-created_date', 100),
      ]);
      setContacts(contactList);
      setCampaigns(campaignList);
      setTemplates(templateList);
      setAgents(agentList);
      setStats({
        totalContacts: contactList.length,
        withPhone: contactList.filter(c => c.phone).length,
        totalCampaigns: campaignList.length,
        totalAgents: agentList.length,
      });
    } catch (e) { console.error('Failed to load data', e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchApiKey(); loadData(); }, [fetchApiKey, loadData]);

  const handleLaunchCampaign = async () => {
    if (!apiKey) { alert('No API key found. Generate one in Portal > API Keys.'); return; }
    setLoading(true);
    setLaunchResult(null);
    try {
      const res = await base44.functions.invoke('whatsappBatchOutreach', {
        action: 'start_campaign',
        api_key: apiKey,
        campaign_name: campaignName || `${channel} Campaign ${new Date().toLocaleDateString()}`,
        channel,
        from_number: fromNumber,
        message_template: messageTemplate,
        filter: { tags: filterTag },
        batch_size: batchSize,
        throttle_per_sec: throttle,
      });
      setLaunchResult(res.data || res);
      loadData();
    } catch (e) {
      setLaunchResult({ error: e.message });
    }
    setLoading(false);
  };

  const handleSelectDay = (day) => {
    setSelectedDay(day);
    const entry = PLAYBOOK_DAYS.find(d => d.day === day);
    if (entry) setMessageTemplate(entry.msg);
  };

  const handleEnableFollowUp = async () => {
    if (!confirm('Enable the 15-day automated WhatsApp follow-up sequence for ALL PCU alumni? The daily workflow will send one message per day starting tomorrow at 9am ET.')) return;
    setLoading(true);
    try {
      await base44.entities.XtremeCrmContact.updateMany(
        { tags: 'pcu_alumni', follow_up_enabled: false },
        { $set: { follow_up_enabled: true, next_follow_up_at: new Date().toISOString(), follow_up_method: 'whatsapp', follow_up_automated: true } }
      );
      alert('Automated follow-up enabled! The daily workflow will start sending the 15-day sequence.');
      loadData();
    } catch (e) {
      alert('Error enabling follow-up: ' + e.message);
    }
    setLoading(false);
  };

  const statusColor = (status) => {
    const map = { running: 'bg-green-500', completed: 'bg-blue-500', draft: 'bg-gray-500', paused: 'bg-yellow-500', cancelled: 'bg-red-500', scheduled: 'bg-purple-500' };
    return map[status] || 'bg-gray-400';
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading flex items-center gap-2">
            <MessageCircle className="w-7 h-7 text-primary" />
            WhatsApp Outreach Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Batch messaging, 15-day sales playbook, and digital sales force for PCU alumni</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Users className="w-8 h-8 text-primary" /><div><p className="text-2xl font-bold">{stats.totalContacts}</p><p className="text-xs text-muted-foreground">PCU Alumni</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Phone className="w-8 h-8 text-green-500" /><div><p className="text-2xl font-bold">{stats.withPhone}</p><p className="text-xs text-muted-foreground">With Phone</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Rocket className="w-8 h-8 text-blue-500" /><div><p className="text-2xl font-bold">{stats.totalCampaigns}</p><p className="text-xs text-muted-foreground">Campaigns</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Bot className="w-8 h-8 text-purple-500" /><div><p className="text-2xl font-bold">{stats.totalAgents}</p><p className="text-xs text-muted-foreground">AI Agents</p></div>
        </CardContent></Card>
      </div>

      {/* Enable Automated Follow-Up */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Rocket className="w-6 h-6 text-primary" />
            <div>
              <h3 className="font-semibold">Automated 15-Day Follow-Up Sequence</h3>
              <p className="text-sm text-muted-foreground">Activates the daily workflow — each contact receives one WhatsApp message per day for 15 days (websites, AI tools, 15% off store, and more)</p>
            </div>
          </div>
          <Button onClick={handleEnableFollowUp} disabled={loading}>
            <Send className="w-4 h-4 mr-2" />Enable for All PCU Alumni
          </Button>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="campaigns"><Rocket className="w-4 h-4 mr-1" />Campaigns</TabsTrigger>
          <TabsTrigger value="create"><Send className="w-4 h-4 mr-1" />Launch</TabsTrigger>
          <TabsTrigger value="playbook"><BarChart3 className="w-4 h-4 mr-1" />Playbook</TabsTrigger>
          <TabsTrigger value="salesforce"><Bot className="w-4 h-4 mr-1" />Sales Force</TabsTrigger>
        </TabsList>

        {/* CAMPAIGNS TAB */}
        <TabsContent value="campaigns" className="space-y-3">
          {campaigns.length === 0 && !loading ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              No campaigns yet. Go to the Launch tab to create your first WhatsApp outreach campaign.
            </CardContent></Card>
          ) : (
            campaigns.map(c => (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{c.name}</h3>
                        <Badge variant="outline" className="capitalize">{c.channel}</Badge>
                        <span className={`inline-block w-2 h-2 rounded-full ${statusColor(c.status)}`} />
                        <span className="text-xs text-muted-foreground capitalize">{c.status}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {c.sent_count || 0} sent / {c.total_recipients || 0} total / {c.failed_count || 0} failed
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.started_at ? new Date(c.started_at).toLocaleString() : ''}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* LAUNCH TAB */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Launch New Campaign</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Campaign Name</Label><Input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="PCU Re-Engagement Wave 1" /></div>
                <div>
                  <Label>Channel</Label>
                  <Select value={channel} onValueChange={setChannel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="mms">MMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>From Number</Label>
                  <Select value={fromNumber} onValueChange={setFromNumber}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WHATSAPP_NUMBERS.map(n => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Filter by Tag</Label>
                  <Input value={filterTag} onChange={e => setFilterTag(e.target.value)} placeholder="pcu_alumni" />
                </div>
                <div>
                  <Label>Batch Size</Label>
                  <Input type="number" value={batchSize} onChange={e => setBatchSize(Number(e.target.value))} />
                </div>
                <div>
                  <Label>Throttle (msg/sec)</Label>
                  <Input type="number" value={throttle} onChange={e => setThrottle(Number(e.target.value))} />
                </div>
              </div>

              {/* Playbook Day Selector */}
              <div>
                <Label>Quick Select: 15-Day Playbook Message</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {PLAYBOOK_DAYS.map(d => (
                    <Button key={d.day} size="sm" variant={selectedDay === d.day ? 'default' : 'outline'} onClick={() => handleSelectDay(d.day)}>
                      Day {d.day}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Message Template</Label>
                <Textarea rows={5} value={messageTemplate} onChange={e => setMessageTemplate(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">Use {'{{first_name}}'}, {'{{company}}'}, {'{{city}}'} for personalization</p>
              </div>

              <Button onClick={handleLaunchCampaign} disabled={loading || !apiKey} className="w-full">
                <Send className="w-4 h-4 mr-2" />{loading ? 'Launching...' : 'Launch Campaign'}
              </Button>

              {launchResult && (
                <Card className={launchResult.error ? 'border-red-500' : 'border-green-500'}>
                  <CardContent className="p-4">
                    {launchResult.error ? (
                      <p className="text-red-500 text-sm">Error: {launchResult.error}</p>
                    ) : (
                      <div className="space-y-1 text-sm">
                        <p className="font-semibold text-green-600">Campaign Launched!</p>
                        <p>Campaign ID: {launchResult.campaign_id}</p>
                        <p>Total Eligible: {launchResult.total_eligible}</p>
                        <p>Batch Sent: {launchResult.batch_sent}</p>
                        <p>Sent: {launchResult.sent} | Failed: {launchResult.failed}</p>
                        <p>Remaining: {launchResult.remaining}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PLAYBOOK TAB */}
        <TabsContent value="playbook" className="space-y-3">
          <Card><CardHeader><CardTitle>15-Day WhatsApp Sales Playbook</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Automated sequence: each contact receives one message per day for 15 days. Pitches websites, AI tools, new products, free templates, 15% off local store, and more.
          </CardContent></Card>
          {PLAYBOOK_DAYS.map(d => (
            <Card key={d.day} className={selectedDay === d.day ? 'border-primary' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">{d.day}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{d.title}</h4>
                      <Badge variant="outline" className="capitalize text-xs">{d.situation}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{d.msg}</p>
                    <Button size="sm" variant="ghost" className="mt-2" onClick={() => { handleSelectDay(d.day); setActiveTab('create'); }}>
                      Use This Template →
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* SALES FORCE TAB */}
        <TabsContent value="salesforce" className="space-y-3">
          <Card><CardHeader><CardTitle>Digital Sales Force</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            AI-powered sales agents that handle outreach, follow-ups, objections, and closing. Scale from 10 to hundreds of agents.
          </CardContent></Card>
          {agents.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              No agents yet. Generate sales agents from the Agent Personas page.
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {agents.map(a => (
                <Card key={a.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: a.avatar_color || '#ff6b00' }}>
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{a.name}</h4>
                        <p className="text-xs text-muted-foreground capitalize">{a.persona_type} · {a.tone || 'professional'}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.assigned_context || a.system_prompt?.slice(0, 100) || ''}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}