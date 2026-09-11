import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Rocket, Loader2, CheckCircle2, Users } from 'lucide-react';
import ProgressBar from '@/components/digital-team/ProgressBar';
import Step1Business from '@/components/digital-team/Step1Business';
import Step2TeamSize from '@/components/digital-team/Step2TeamSize';
import Step3Company from '@/components/digital-team/Step3Company';
import Step4Channels from '@/components/digital-team/Step4Channels';
import Step5Schedule from '@/components/digital-team/Step5Schedule';
import Step6Strategy from '@/components/digital-team/Step6Strategy';
import Step7TeamCreation from '@/components/digital-team/Step7TeamCreation';
import Step8PhoneNumbers from '@/components/digital-team/Step8PhoneNumbers';
import Step9Compliance from '@/components/digital-team/Step9Compliance';
import Step10Social from '@/components/digital-team/Step10Social';
import Step11Review from '@/components/digital-team/Step11Review';
import { Link } from 'react-router-dom';

const STEPS = [
  { title: 'Business Type', component: Step1Business },
  { title: 'Team Size', component: Step2TeamSize },
  { title: 'Company Info', component: Step3Company },
  { title: 'Channels', component: Step4Channels },
  { title: 'Schedule', component: Step5Schedule },
  { title: 'Strategy', component: Step6Strategy },
  { title: 'AI Team', component: Step7TeamCreation },
  { title: 'Phone Numbers', component: Step8PhoneNumbers },
  { title: 'Compliance', component: Step9Compliance },
  { title: 'Social Media', component: Step10Social },
  { title: 'Review & Launch', component: Step11Review },
];

export default function DigitalTeamBuilder() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [teamData, setTeamData] = useState({
    business_type: 'existing', team_size_tier: 'small', team_size_count: 3,
    channels: ['sms'], timezone: 'America/New_York', work_days: ['mon','tue','wed','thu','fri'],
    work_start_hour: 9, work_end_hour: 17, phone_numbers_count: 1,
    team_members: [], project_names: [], compliance_docs: [], social_platforms: [],
  });
  const [teamId, setTeamId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [provisionResult, setProvisionResult] = useState(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const drafts = await base44.entities.DigitalTeam.filter({ user_id: user.id, status: 'draft' }, '-created_date', 1);
        if (drafts.length) {
          setTeamId(drafts[0].id);
          setTeamData(prev => ({ ...prev, ...drafts[0] }));
          setStep(drafts[0].setup_step || 0);
        }
      } catch (e) { console.error('Failed to load draft', e); }
    })();
  }, [user]);

  const update = (fields) => setTeamData(prev => ({ ...prev, ...fields }));

  const canProceed = useCallback(() => {
    if (step === 2) return !!(teamData.team_name && teamData.company_name);
    if (step === 5) return !!teamData.strategy_goal;
    if (step === 8) return teamData.compliance_signed;
    return true;
  }, [step, teamData]);

  const handleNext = async () => {
    setSaving(true);
    try {
      if (teamId) {
        await base44.entities.DigitalTeam.update(teamId, { ...teamData, setup_step: step + 1 });
      } else {
        const created = await base44.entities.DigitalTeam.create({ ...teamData, user_id: user?.id, setup_step: step + 1, status: 'draft' });
        setTeamId(created.id);
      }
    } catch (e) { console.error('Save failed', e); }
    setSaving(false);
    setStep(prev => Math.min(prev + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => { setStep(prev => Math.max(prev - 1, 0)); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const handleLaunch = async () => {
    setLaunching(true);
    try {
      const keys = await base44.entities.ApiKey.filter({ status: 'active' }, '-created_date', 1);
      const apiKey = keys[0]?.key_value;
      if (!apiKey) { alert('No API key found. Generate one in Portal > API Keys.'); setLaunching(false); return; }
      const res = await base44.functions.invoke('provisionDigitalTeam', {
        action: 'provision', api_key: apiKey, team_id: teamId, team_data: teamData,
      });
      setProvisionResult(res.data || res);
      if (teamId) await base44.entities.DigitalTeam.update(teamId, { status: 'active', launched_at: new Date().toISOString() });
    } catch (e) {
      setProvisionResult({ error: e.message });
    }
    setLaunching(false);
  };

  const CurrentStep = STEPS[step]?.component;

  // ── Post-launch success screen ──
  if (provisionResult && !provisionResult.error) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold">Team Launched Successfully!</h1>
            <p className="text-muted-foreground">Your digital AI team is now active and ready to work.</p>
            <div className="grid grid-cols-3 gap-3 py-4">
              <div className="p-3 rounded-lg bg-muted/50"><p className="text-2xl font-bold text-primary">{provisionResult.agents_created || 0}</p><p className="text-xs text-muted-foreground">Agents</p></div>
              <div className="p-3 rounded-lg bg-muted/50"><p className="text-2xl font-bold text-primary">{provisionResult.templates_created || 0}</p><p className="text-xs text-muted-foreground">Templates</p></div>
              <div className="p-3 rounded-lg bg-muted/50"><p className="text-2xl font-bold text-primary">{provisionResult.numbers_assigned || 0}</p><p className="text-xs text-muted-foreground">Numbers</p></div>
            </div>
            <div className="flex gap-3 justify-center">
              <Link to="/portal"><Button variant="outline">Go to Dashboard</Button></Link>
              <Link to="/portal/agents"><Button>View AI Agents</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Users className="w-7 h-7 text-primary" /> Digital AI Team Builder
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Build your autonomous digital sales & marketing team — step by step, like hiring human staff.</p>
      </div>

      <ProgressBar currentStep={step} totalSteps={STEPS.length} steps={STEPS} />

      <Card className="mt-6">
        <CardContent className="p-6">
          {CurrentStep && <CurrentStep data={teamData} update={update} />}
        </CardContent>
      </Card>

      {provisionResult?.error && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-500">
          Launch error: {provisionResult.error}
        </div>
      )}

      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={handleBack} disabled={step === 0 || launching}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={handleNext} disabled={saving || !canProceed()}>
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <>Next <ArrowRight className="w-4 h-4 ml-2" /></>}
          </Button>
        ) : (
          <Button onClick={handleLaunch} disabled={launching || !teamData.compliance_signed}>
            {launching ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Launching...</> : <><Rocket className="w-4 h-4 mr-2" /> Launch Team</>}
          </Button>
        )}
      </div>
    </div>
  );
}