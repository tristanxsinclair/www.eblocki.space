import { useEffect, useState } from "react";
import { AppShell } from "@/components/eblocki/AppShell";
import { LevelRing } from "@/components/eblocki/LevelRing";
import { IdentityLedger } from "@/components/eblocki/IdentityLedger";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  DOMAINS,
  levelThreshold,
  rankFor,
  operatorTitle,
  type CanonDomain,
} from "@/lib/eblocki/level-engine";

interface OpRow { total_xp: number; level: number; xp_in_level: number; rank: string; title: string }
interface DomRow { domain: string; total_xp: number; level: number; xp_in_level: number; rank: string; current_standard: string | null; next_requirement: string | null }

const DOMAIN_STANDARD: Record<CanonDomain, { current: string; next: string }> = {
  law:        { current: "Structured IRAC with authority integration.", next: "Pressure-tested legal reasoning under time." },
  psychology: { current: "Concept + applied evidence + evaluation.",     next: "Mechanism-level explanation under exam conditions." },
  sales:      { current: "Diagnose pain, attach GSE, handle objection.", next: "Convert under real customer pressure." },
  soccer:     { current: "Movement, decision, transfer to match.",       next: "Repeat output under fatigue." },
  finance:    { current: "Decision rule + downside accounted.",           next: "Compound move with verifiable outcome." },
  eblocki:    { current: "State → proof → upgrade documented.",          next: "Sustained pattern across 14+ days." },
  life:       { current: "Output > intention, daily.",                    next: "Identity transfer witnessed externally." },
};

export default function Operator() {
  const { user } = useAuth();
  const [op, setOp] = useState<OpRow | null>(null);
  const [doms, setDoms] = useState<Record<string, DomRow>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [{ data: o }, { data: d }] = await Promise.all([
        supabase.from("operator_level").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("domain_levels").select("*").eq("user_id", user.id),
      ]);
      if (cancelled) return;
      setOp((o as any) ?? null);
      const map: Record<string, DomRow> = {};
      for (const r of (d as any[]) || []) map[r.domain] = r;
      setDoms(map);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (!user) return null;

  const opLevel = op?.level ?? 1;
  const opXp = op?.xp_in_level ?? 0;
  const opThreshold = levelThreshold(opLevel);
  const opTitle = op?.title ?? operatorTitle(opLevel);
  const opRank = op?.rank ?? rankFor(opLevel);

  return (
    <AppShell>
      <div className="mobile-safe-page max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-8 min-w-0 max-w-full pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-10">
        <header className="space-y-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Operator Identity</div>
          <h1 className="text-2xl md:text-3xl font-mono tracking-tight">Compound Level Engine</h1>
          <p className="text-xs text-muted-foreground max-w-prose">
            Evidence → XP → Level → Standard. The Court accepts only artifacts that an external observer would recognise as real.
          </p>
        </header>

        {/* Operator hero */}
        <section className="border border-border rounded-sm bg-card/40 p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6"
                 style={{ boxShadow: "var(--shadow-panel)" }}>
          <LevelRing level={opLevel} xpInLevel={opXp} threshold={opThreshold} size={160} label="Operator" />
          <div className="flex-1 min-w-0 text-center md:text-left">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">{opRank}</div>
            <div className="mt-1 text-xl text-foreground">{opTitle}</div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-sm mx-auto md:mx-0 w-full">
              <Stat label="Total XP" value={op?.total_xp ?? 0} />
              <Stat label="Level" value={opLevel} />
              <Stat label="To next" value={Math.max(0, opThreshold - opXp)} />
            </div>
          </div>
        </section>

        {/* Domain grid */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">Domain Levels</h2>
            <span className="font-mono text-[10px] text-muted-foreground">7 domains</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {DOMAINS.map((d) => {
              const row = doms[d];
              const lvl = row?.level ?? 1;
              const xp = row?.xp_in_level ?? 0;
              const th = levelThreshold(lvl);
              const std = DOMAIN_STANDARD[d];
              return (
                <div key={d} className="border border-border rounded-sm bg-card/40 p-4 flex gap-4 items-start">
                  <LevelRing level={lvl} xpInLevel={xp} threshold={th} size={88} label={d.slice(0,4)} glow={false} />
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{d}</div>
                    <div className="text-sm text-foreground mt-0.5">{row?.rank ?? rankFor(lvl)}</div>
                    <div className="mt-2 text-[11px] text-muted-foreground leading-snug">
                      <span className="font-mono uppercase tracking-[0.15em] text-foreground/80">Std — </span>
                      {row?.current_standard ?? std.current}
                    </div>
                    <div className="mt-1 text-[11px] text-primary/80 leading-snug">
                      <span className="font-mono uppercase tracking-[0.15em]">Next — </span>
                      {row?.next_requirement ?? std.next}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Ledger */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">Progress Record</h2>
            <span className="font-mono text-[10px] text-muted-foreground">Permanent record</span>
          </div>
          <IdentityLedger userId={user.id} />
        </section>

        {loading && <div className="font-mono text-[10px] text-muted-foreground">Syncing…</div>}
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border rounded-sm px-2.5 py-2 bg-background/40">
      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="font-mono text-lg text-foreground tabular-nums">{value}</div>
    </div>
  );
}