import React from 'react';
import { Building2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Step1Business({ data, update }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Business Type</h2>
        <p className="text-sm text-muted-foreground mt-1">Are you setting up for an existing business or starting fresh?</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => update({ business_type: 'existing' })}
          className={cn(
            "p-6 rounded-xl border-2 text-left transition-all hover:scale-[1.02]",
            data.business_type === 'existing' ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          )}
        >
          <Building2 className="w-8 h-8 text-primary mb-3" />
          <h3 className="font-semibold text-lg">Existing Business</h3>
          <p className="text-sm text-muted-foreground mt-1">I have an established business and want to add an AI team</p>
        </button>
        <button
          onClick={() => update({ business_type: 'new' })}
          className={cn(
            "p-6 rounded-xl border-2 text-left transition-all hover:scale-[1.02]",
            data.business_type === 'new' ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          )}
        >
          <Sparkles className="w-8 h-8 text-primary mb-3" />
          <h3 className="font-semibold text-lg">New Business</h3>
          <p className="text-sm text-muted-foreground mt-1">I'm starting fresh and want to build my AI team from scratch</p>
        </button>
      </div>
    </div>
  );
}