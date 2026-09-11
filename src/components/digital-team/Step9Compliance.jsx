import React from 'react';
import { cn } from '@/lib/utils';
import { Shield, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

const CHECKLIST = [
  { id: 'a2p', label: 'A2P 10DLC Campaign Registration', desc: 'Required for SMS/MMS in the US. We handle brand and campaign registration.' },
  { id: 'opt_in', label: 'SMS Opt-In Form', desc: 'Your opt-in page at /sms-optin captures consent for messaging.' },
  { id: 'terms', label: 'Terms of Service', desc: 'Your /terms page defines the agreement with your customers.' },
  { id: 'privacy', label: 'Privacy Policy', desc: 'Your /privacy page explains data handling practices.' },
  { id: 'use', label: 'Acceptable Use Policy', desc: 'Your /acceptable-use page defines permitted messaging content.' },
  { id: 'dnc', label: 'DNC List Management', desc: 'System automatically respects Do-Not-Call registry entries.' },
];

export default function Step9Compliance({ data, update }) {
  const toggle = (id) => {
    const current = data.compliance_docs || [];
    update({ compliance_docs: current.includes(id) ? current.filter(c => c !== id) : [...current, id] });
  };

  const allChecked = CHECKLIST.every(c => (data.compliance_docs || []).includes(c.id));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Compliance & Legal Checklist</h2>
        <p className="text-sm text-muted-foreground mt-1">Acknowledge each compliance item. These protect your business and ensure legal operation.</p>
      </div>
      <div className="space-y-2">
        {CHECKLIST.map(item => {
          const checked = (data.compliance_docs || []).includes(item.id);
          return (
            <button key={item.id} onClick={() => toggle(item.id)}
              className={cn("w-full p-4 rounded-lg border-2 text-left flex items-start gap-3 transition-all",
                checked ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
              <div className={cn("mt-0.5", checked ? "text-primary" : "text-muted-foreground")}>
                {checked ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm flex items-center gap-2"><FileText className="w-3.5 h-3.5" /> {item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
      <div className={cn("p-4 rounded-lg border flex items-center gap-3", allChecked ? "bg-green-500/10 border-green-500/30" : "bg-muted border-border")}>
        <Shield className={cn("w-6 h-6", allChecked ? "text-green-500" : "text-muted-foreground")} />
        <div>
          <p className="font-medium text-sm">{allChecked ? 'All compliance items acknowledged' : 'Acknowledge all items to continue'}</p>
          <p className="text-xs text-muted-foreground">{(data.compliance_docs || []).length} of {CHECKLIST.length} completed</p>
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={data.compliance_signed || false} onChange={e => update({ compliance_signed: e.target.checked })} className="w-4 h-4" />
        <span className="text-sm font-medium">I acknowledge that I have reviewed and accept all compliance requirements</span>
      </label>
    </div>
  );
}