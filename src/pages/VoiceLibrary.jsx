import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, Play, Save, Phone, Sparkles, Zap, DollarSign, Clock, Languages, Copy } from 'lucide-react';

// Benchmark data from research (2026)
const PROVIDER_BENCHMARKS = [
  { id: 'elevenlabs', name: 'ElevenLabs', tier: 'premium', latency: '~75ms', price: '$50/1M', cloning: true, languages: 70, voices: 'Rachel, Domi, Bella, Sarah', best: 'Voice marketplace, cloning, broadest coverage' },
  { id: 'inworld', name: 'Inworld TTS-2', tier: 'premium', latency: '<100ms', price: '$25/1M', cloning: true, languages: 200, voices: 'Custom + stock', best: 'Realtime at volume, lowest enterprise price' },
  { id: 'cartesia', name: 'Cartesia Sonic', tier: 'premium', latency: '<90ms', price: '$40/1M', cloning: true, languages: 40, voices: 'Lily, Hannah, Sarah, Mia', best: 'Lowest published TTFA, instant cloning' },
  { id: 'openai', name: 'OpenAI TTS', tier: 'premium', latency: '~500ms', price: '$19/1M', cloning: false, languages: 50, voices: 'nova, shimmer, alloy (F), echo, onyx (M)', best: 'OpenAI stack integration, low cost' },
  { id: 'deepgram', name: 'Deepgram Aura-2', tier: 'standard', latency: '~200ms', price: '$30/1M', cloning: false, languages: 30, voices: 'Asteria, Luna (F), Orion, Atlas (M)', best: 'STT+TTS one vendor, phone quality' },
  { id: 'hume', name: 'Hume Octave', tier: 'premium', latency: 'N/A', price: '$70/mo', cloning: true, languages: 20, voices: 'Emotion-controlled', best: 'Emotion-forward, expressive voice' },
  { id: 'google', name: 'Google Gemini TTS', tier: 'standard', latency: 'preview', price: '~$19/1M', cloning: false, languages: 40, voices: 'Preset voices', best: 'GCP/Gemini stack, batch generation' },
  { id: 'polly', name: 'Amazon Polly', tier: 'standard', latency: '~150ms', price: '$16/1M', cloning: false, languages: 60, voices: 'Kendra, Joanna (F), Matthew (M)', best: 'Twilio-native, always available, no API key' },
];

const POLLY_FEMALE_VOICES = [
  { id: 'Kendra', desc: 'Professional, authoritative' },
  { id: 'Joanna', desc: 'Warm, conversational (US)' },
  { id: 'Salli', desc: 'Friendly, approachable' },
  { id: 'Kimberly', desc: 'Mature, confident' },
  { id: 'Amy', desc: 'British, refined' },
  { id: 'Emma', desc: 'British, warm' },
  { id: 'Nicole', desc: 'Australian, natural' },
  { id: 'Olivia', desc: 'Australian, warm' },
  { id: 'Ivy', desc: 'Young, energetic' },
  { id: 'Ruth', desc: 'Deep, authoritative' },
];

const POLLY_MALE_VOICES = [
  { id: 'Matthew', desc: 'Professional, clear' },
  { id: 'Brian', desc: 'British, authoritative' },
  { id: 'Justin', desc: 'Young, energetic' },
  { id: 'Joey', desc: 'Warm, friendly' },
  { id: 'Arthur', desc: 'Mature, distinguished' },
  { id: 'Daniel', desc: 'British, warm' },
];

export default function VoiceLibrary() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testText, setTestText] = useState('Hi, you\'ve reached Strategic Minds AI. How can I help you today?');
  const [selectedVoice, setSelectedVoice] = useState('Kendra');
  const [selectedGender, setSelectedGender] = useState('female');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    try {
      const res = await base44.functions.invoke('previewVoice', {
        text: 'Voice library initialized',
        voice: 'river',
      });
      // Load voice profiles
      const { items } = await base44.entities.VoiceProfile.filter({}, { sort: '-created_date', limit: 50 });
      setProfiles(items);
    } catch (err) {
      // Entity might not exist yet — that's ok
    }
    setLoading(false);
  }

  async function previewVoice() {
    setGenerating(true);
    setPreviewUrl(null);
    try {
      const res = await base44.functions.invoke('previewVoice', {
        text: testText,
        voice: 'sunny',
      });
      // previewVoice returns { url } in the function data
      const data = res?.data || res;
      if (data?.url) setPreviewUrl(data.url);
    } catch (err) {
      // Fallback: use browser TTS
      if ('speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance(testText);
        utter.voice = speechSynthesis.getVoices().find(v => 
          selectedGender === 'female' ? v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('zira') : v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david')
        ) || speechSynthesis.getVoices()[0];
        speechSynthesis.speak(utter);
      }
    }
    setGenerating(false);
  }

  async function saveProfile() {
    try {
      await base44.entities.VoiceProfile.create({
        profile_name: `Eden Skye — ${selectedVoice}`,
        provider: 'polly',
        voice_id: selectedVoice,
        gender: selectedGender,
        tone: 'professional',
        language_code: 'en-US',
        speed: 1.0,
        is_default: true,
        assigned_number: '+18665711174',
        persona_name: 'Eden Skye',
        system_prompt: 'You are Eden Skye, the AI voice receptionist for Strategic Minds AI. You are professional, confident, and concise. Keep responses under 3 sentences. Speak in plain conversational English.',
        greeting: `Hi, you've reached Eden Skye with Strategic Minds AI. How can I help you today?`,
        active: true,
      });
      loadProfiles();
    } catch (err) {
      console.error(err);
    }
  }

  const voices = selectedGender === 'female' ? POLLY_FEMALE_VOICES : POLLY_MALE_VOICES;

  return (
    <div className="portal-gold-scope min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold flex items-center gap-3">
              <Mic className="w-8 h-8 text-accent-orange" />
              AI Voice Library
            </h1>
            <p className="text-muted-foreground mt-1">
              Multi-provider TTS system benchmarked against top AI voice platforms
            </p>
          </div>
          <Badge variant="outline" className="border-accent-orange/40 text-accent-orange">
            <Sparkles className="w-3 h-3 mr-1" /> 8 Providers Indexed
          </Badge>
        </div>

        <Tabs defaultValue="benchmarks" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
            <TabsTrigger value="studio">Voice Studio</TabsTrigger>
            <TabsTrigger value="profiles">Profiles</TabsTrigger>
          </TabsList>

          {/* ── BENCHMARKS TAB ── */}
          <TabsContent value="benchmarks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top AI Voice Systems — 2026 Benchmark</CardTitle>
                <CardDescription>
                  Researched and ranked by latency, price, cloning, and language coverage.
                  Patterns reverse-engineered from DeepClone Factory + FaultLine architectures.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 pr-4">Provider</th>
                        <th className="py-2 pr-4">Tier</th>
                        <th className="py-2 pr-4"><Clock className="w-4 h-4 inline" /> Latency</th>
                        <th className="py-2 pr-4"><DollarSign className="w-4 h-4 inline" /> Price/1M</th>
                        <th className="py-2 pr-4">Cloning</th>
                        <th className="py-2 pr-4"><Languages className="w-4 h-4 inline" /> Langs</th>
                        <th className="py-2 pr-4">Best For</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PROVIDER_BENCHMARKS.map(p => (
                        <tr key={p.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-3 pr-4 font-medium">{p.name}</td>
                          <td className="py-3 pr-4">
                            <Badge variant={p.tier === 'premium' ? 'default' : 'secondary'} className={p.tier === 'premium' ? 'bg-accent-orange text-black' : ''}>
                              {p.tier}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">{p.latency}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{p.price}</td>
                          <td className="py-3 pr-4">{p.cloning ? '✅' : '❌'}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{p.languages}+</td>
                          <td className="py-3 pr-4 text-xs text-muted-foreground max-w-xs">{p.best}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Zap className="w-5 h-5 text-accent-orange" /> Architecture</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2 text-muted-foreground">
                  <p><strong className="text-foreground">Provider Abstraction:</strong> Shared module routes TTS to any provider with automatic fallback (Polly → ElevenLabs → Cartesia → OpenAI → Deepgram).</p>
                  <p><strong className="text-foreground">VoiceProfile Registry:</strong> Per-number voice assignment — each phone number can have its own persona, voice, and system prompt.</p>
                  <p><strong className="text-foreground">Twilio-Native Fallback:</strong> Polly voices work inline via &lt;Say&gt; with zero API keys — always available as baseline.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Phone className="w-5 h-5 text-accent-orange" /> Current Setup</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2 text-muted-foreground">
                  <p><strong className="text-foreground">Active Number:</strong> +1 (866) 571-1174</p>
                  <p><strong className="text-foreground">Persona:</strong> Eden Skye</p>
                  <p><strong className="text-foreground">Company:</strong> Strategic Minds AI</p>
                  <p><strong className="text-foreground">Voice:</strong> Polly.Kendra (professional female)</p>
                  <p><strong className="text-foreground">Webhook:</strong> twilioVoiceWebhook (signature-verified)</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── VOICE STUDIO TAB ── */}
          <TabsContent value="studio" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Voice Studio — Preview & Configure</CardTitle>
                <CardDescription>Test different voices and save profiles for your phone numbers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select value={selectedGender} onValueChange={(v) => { setSelectedGender(v); setSelectedVoice(v === 'female' ? 'Kendra' : 'Matthew'); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Voice</Label>
                    <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {voices.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.id} — {v.desc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Test Text</Label>
                  <Textarea
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button onClick={previewVoice} disabled={generating} className="bg-accent-orange text-black hover:bg-accent-orange/90">
                    {generating ? 'Generating...' : <><Play className="w-4 h-4 mr-2" /> Preview Voice</>}
                  </Button>
                  <Button onClick={saveProfile} variant="outline">
                    <Save className="w-4 h-4 mr-2" /> Save as Profile
                  </Button>
                </div>

                {previewUrl && (
                  <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
                    <p className="text-sm text-muted-foreground mb-2">Audio preview:</p>
                    <audio controls src={previewUrl} className="w-full" />
                  </div>
                )}

                <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                  <strong>Note:</strong> Browser TTS preview uses your device's built-in voices. In live calls, Twilio uses Amazon Polly voices via &lt;Say&gt; — the selected voice ID is passed directly to Twilio.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PROFILES TAB ── */}
          <TabsContent value="profiles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Voice Profiles</CardTitle>
                <CardDescription>Saved voice configurations assigned to phone numbers</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground text-sm">Loading...</p>
                ) : profiles.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Mic className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No voice profiles yet. Create one in the Voice Studio tab.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {profiles.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="font-medium">{p.profile_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {p.provider} · {p.voice_id} · {p.gender} · {p.assigned_number || 'unassigned'}
                          </p>
                          {p.persona_name && <p className="text-xs text-muted-foreground mt-1">Persona: {p.persona_name}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          {p.is_default && <Badge className="bg-accent-orange text-black">Default</Badge>}
                          {p.active && <Badge variant="outline">Active</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}