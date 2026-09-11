import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProgressBar({ currentStep, totalSteps, steps }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">
          Step {currentStep + 1} of {totalSteps}
        </span>
        <span className="text-sm font-medium text-primary">
          {Math.round(((currentStep + 1) / totalSteps) * 100)}% Complete
        </span>
      </div>
      <div className="flex items-center gap-1">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className={cn(
              "flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-colors",
              i < currentStep ? "bg-primary text-primary-foreground" :
              i === currentStep ? "bg-primary text-primary-foreground ring-2 ring-primary/30" :
              "bg-muted text-muted-foreground"
            )}>
              {i < currentStep ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={cn("h-0.5 flex-1 mx-1 transition-colors", i < currentStep ? "bg-primary" : "bg-border")} />
            )}
          </div>
        ))}
      </div>
      <p className="text-center mt-2 text-sm font-semibold">{steps[currentStep]?.title}</p>
    </div>
  );
}