import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, Crown, Zap, AlertCircle, PhoneCall, Waves, CheckCircle2 } from 'lucide-react';
import {
  SOL_REFERENCE,
  TOP_3_SOL_COMPARABLE,
  OPENAI_RECOMMENDED_DEFAULT,
  BENCHMARKS_2026,
  TELEPHONY_STRATEGY,
  HUMAN_LIKENESS_RULES,
} from '@/lib/voiceRanking';

const STATUS_STYLE = {
  live: { label: 'Live now', cls: 'border-emerald-500/40 text-emerald-600' },
  ready_to_build: { label: 'Ready to build', cls: 'border-accent-orange/50 text-accent-orange' },
};

export default function SolVoiceRanking() {
  return (
    <div className="space-y-4">
      {/* ── Sol reference ── */}
      <Card className="border-accent-orange/30 bg-accent-orange/5">
        <CardContent className="pt-5 flex gap-3">
          <AlertCircle className="w-5 h-5 text-accent-orange shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-semibold">
              Sol is a ChatGPT app voice — “{SOL_REFERENCE.character}” — and is not exposed in the API by name.
            </p>
            <p className="text-muted-foreground">{SOL_REFERENCE.implication}</p>
          </div>
        </CardContent>
      </Card>

      {/* ── Top 3 ── */}
      <div className="grid gap-3 md:grid-cols-3">
        {TOP_3_SOL_COMPARABLE.map((v) => (
          <Card key={v.voice} className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="border-accent-orange/50 text-accent-orange font-mono">
                  #{v.rank}
                </Badge>
                {v.rank === 1 ? (
                  <Crown className="w-4 h-4 text-accent-orange" />
                ) : (
                  <Mic className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <CardTitle className="text-base mt-2">{v.label}</CardTitle>
              <CardDescription className="font-mono text-[11px]">
                {v.provider} · {v.model}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-3 text-xs">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="text-[10px]">{v.presentation}</Badge>
                <Badge variant="secondary" className="text-[10px]">{v.region}</Badge>
                <Badge variant="secondary" className="text-[10px]">{v.source}</Badge>
              </div>
              <div>
                <p className="font-medium mb-1">Why it matches Sol</p>
                <p className="text-muted-foreground leading-relaxed">{v.matchesSolBecause}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2.5 space-y-1">
                <p className="font-medium">Evidence</p>
                <p className="text-muted-foreground">{v.evidence}</p>
              </div>
              <div className="mt-auto pt-2 border-t space-y-1">
                <p className="flex items-center gap-1.5">
                  <PhoneCall className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{v.cost}</span>
                </p>
                <p className="text-muted-foreground">{v.bestFor}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Worth auditioning alongside them: OpenAI <span className="font-mono">{OPENAI_RECOMMENDED_DEFAULT.voice}</span> —{' '}
        {OPENAI_RECOMMENDED_DEFAULT.note}
      </p>

      {/* ── Benchmark table ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent-orange" />
            2026 naturalness benchmarks
          </CardTitle>
          <CardDescription>Independent arena results, not vendor claims.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4">Provider</th>
                  <th className="py-2 pr-4">Model</th>
                  <th className="py-2 pr-4">Arena</th>
                  <th className="py-2 pr-4">Latency</th>
                  <th className="py-2 pr-4">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {BENCHMARKS_2026.map((b) => (
                  <tr key={b.model} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-2.5 pr-4 font-medium">{b.provider}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">{b.model}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{b.arena}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{b.ttfa}</td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground">{b.verdict}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Delivery reality ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Waves className="w-4 h-4 text-accent-orange" />
            Why calls still sound synthetic
          </CardTitle>
          <CardDescription>
            Twilio &lt;Say&gt; can only speak Polly, Google or Azure voices. None of the top 3 are reachable that way —
            this is the real bottleneck, not the prompt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {TELEPHONY_STRATEGY.map((s) => (
            <div key={s.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <p className="font-medium text-sm">{s.name}</p>
                <Badge variant="outline" className={`text-[10px] ${STATUS_STYLE[s.status]?.cls || ''}`}>
                  {STATUS_STYLE[s.status]?.label || s.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="text-foreground/80">Reaches:</span> {s.reachable}
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="text-foreground/80">Quality:</span> {s.quality} · {s.latency}
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="text-foreground/80">Setup:</span> {s.setup}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Human-likeness rules ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sound human, not robotic</CardTitle>
          <CardDescription>Behavioural rules that matter more than the voice you pick.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {HUMAN_LIKENESS_RULES.map((r) => (
              <li key={r} className="flex gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{r}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}