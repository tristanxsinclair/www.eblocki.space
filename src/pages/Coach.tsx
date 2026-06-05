import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/eblocki/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModeBadge, StateBadge } from "@/components/eblocki/Badges";
import { ProofContractCard } from "@/components/eblocki/ProofContractCard";
import { normaliseCoachResponse, type NormalisedCoachResponse } from "@/lib/eblocki/coach-response";
import type { Mode } from "@/lib/eblocki/modes";
import { STATE_LABELS, STATE_PRESCRIPTION, type BehaviouralState } from "@/lib/eblocki/states";
import { toast } from "sonner";
import { AlertCircle, ArrowRight, Crosshair, Info, Loader2, Send, Sparkles } from "lucide-react";
import { Seo } from "@/components/Seo";

function prettyMode(m: string): string {
  return m.replace(/_/g, " ");
}

const QUICK_PROMPTS = [
  "Give me the next proof action.",
  "Diagnose my avoidance.",
  "Create a Proof Contract for this.",
  "Review my latest proof.",
  "Turn this into something I can submit.",
];

const SECTION_TITLES = [
  "Bottom Line Up Front",
  "Analysis",
  "Actionable System",
  "HD/Elite Upgrade",
];

function splitResponseSections(text: string): { title: string; body: string }[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const sections: { title: string; body: string[] }[] = [];
  let current: { title: string; body: string[] } | null = null;

  const isHeading = (line: string): string | null => {
    const stripped = line.replace(/^#+\s*/, "").replace(/^\d+\.\s*/, "").replace(/[:*]+$/, "").trim();
    const match = SECTION_TITLES.find(
      (t) => stripped.toLowerCase() === t.toLowerCase()
    );
    return match ?? null;
  };

  for (const line of lines) {
    const heading = isHeading(line);
    if (heading) {
      if (current) sections.push(current);
      current = { title: heading, body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) sections.push(current);

  if (sections.length === 0) {
    return [{ title: "Coach Response", body: text }];
  }
  return sections.map((s) => ({ title: s.title, body: s.body.join("\n").trim() }));
}

export default function Coach() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [input, setInput] = useState(params.get("prompt") ?? "");
  const requestedMode = params.get("mode") ?? null;
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NormalisedCoachResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [localCommitmentId, setLocalCommitmentId] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [userModeIds, setUserModeIds] = useState<Set<string>>(new Set());

  const committedId = result?.commitmentId ?? localCommitmentId;

  useEffect(() => {
    if (!user) return;
    supabase
      .from("coach_interactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setHistory(data ?? []));
  }, [user, result]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_modes")
      .select("mode_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .then(({ data }) => setUserModeIds(new Set((data ?? []).map((m: any) => String(m.mode_id)))));
  }, [user]);

  const send = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setLocalCommitmentId(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("coach", {
        body: {
          message: input.trim(),
          mode: requestedMode || undefined,
        },
      });
      if (invokeError) {
        setError(invokeError.message || "Coach request failed.");
        return;
      }
      if (!data) {
        setError("Coach returned no response. Try again.");
        return;
      }
      const normalised = normaliseCoachResponse(data);
      if (!normalised.success && (data as any)?.error) {
        setError(String((data as any).error));
        return;
      }
      setResult(normalised);
    } catch (e: any) {
      setError(e?.message || "Unexpected coach error.");
    } finally {
      setLoading(false);
    }
  };

  const commit = async () => {
    if (!result || !user || committedId) return;
    setCommitting(true);
    try {
      const { data, error: insertError } = await supabase
        .from("proof_commitments")
        .insert({
          user_id: user.id,
          coach_interaction_id: result.interactionId ?? null,
          domain: result.proofContract.domain,
          mode: result.proofContract.mode,
          title: result.proofContract.title,
          required_artifact: result.proofContract.requiredArtifact,
          evidence_standard: result.proofContract.evidenceStandard,
          status: "pending",
        })
        .select()
        .single();
      if (insertError) throw insertError;
      setLocalCommitmentId(data!.id);
      toast.success("Committed to the Court of Evidence.");
    } catch (e: any) {
      toast.error(e.message || "Failed to commit.");
    } finally {
      setCommitting(false);
    }
  };

  const sections = useMemo(
    () => (result ? splitResponseSections(result.response) : []),
    [result]
  );

  const nextControllable = useMemo(() => {
    if (!result) return null;
    const actionable = sections.find((s) => s.title === "Actionable System");
    const source = actionable?.body || result.response;
    const m = source.match(/(?:^|\n)\s*(?:[-*]|\d+\.)\s+(.+)/);
    return m ? m[1].trim().replace(/\.$/, "") : null;
  }, [result, sections]);

  const isPersonalisedMode = result ? userModeIds.has(result.mode) : false;

  return (
    <AppShell>
      <Seo
        title="Proof Coach | EBLOCKI"
        description="Get evidence-backed correction, a next proof action, and a Proof Contract tied to your current bottleneck."
        path="/coach"
      />
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        <header>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Proof Coach
          </span>
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-semibold mt-1">
              Get correction you can prove.
            </h1>
            <Link to="/start-today">
              <Button size="sm" variant="outline">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Start Today
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            The coach uses your proof, risk, and forecast context where available. It turns bottlenecks into evidence-backed actions and Proof Contracts.
          </p>
          {requestedMode && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                Coaching inside
              </span>
              <ModeBadge mode={requestedMode as Mode} />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {prettyMode(requestedMode)}
              </span>
            </div>
          )}
        </header>

        <Card className="panel p-4">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            What needs correction?
          </label>
          <Textarea
            placeholder="Name the bottleneck, the work, and what proof would count. Example: I keep reorganising notes instead of writing answers. Give me the next proof action."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="mt-2 min-h-[140px]"
          />
          <div className="mt-3 flex justify-between items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              {input.length}/5000
            </span>
            <Button onClick={send} disabled={loading || !input.trim()}>
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Checking</>
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Get Correction</>
              )}
            </Button>
          </div>
        </Card>

        {error && (
          <Card className="panel p-4 border-destructive/40">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="font-mono text-[10px] uppercase tracking-widest">Coach error</span>
            </div>
            <p className="text-sm mt-1">{error}</p>
          </Card>
        )}

        {result && (
          <div className="space-y-4">
            <Card className="panel p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <ModeBadge
                  mode={result.mode as Mode}
                  hybrid={(result.hybrid ?? undefined) as Mode | undefined}
                />
                {isPersonalisedMode && (
                  <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm border border-primary/40 text-primary">
                    Personalised Mode
                  </span>
                )}
                {result.state && <StateBadge state={result.state as BehaviouralState} />}
              </div>
              {result.state && (
                <p className="mt-2 text-xs text-muted-foreground">
                  <span className="text-foreground font-mono uppercase tracking-wider text-[10px]">{STATE_LABELS[result.state as BehaviouralState] ?? result.state}:</span>{" "}
                  {STATE_PRESCRIPTION[result.state as BehaviouralState] ?? "Behavioural state detected."}
                </p>
              )}
              {result.usedFallback && (
                <div className="mt-3 flex items-start gap-2 text-[11px] text-muted-foreground border-t border-border pt-2">
                  <Info className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>Fallback coach response used. Core proof logic still active.</span>
                </div>
              )}
            </Card>

            {nextControllable && (
              <Card className="panel p-4 border-primary/30">
                <div className="flex items-center gap-2">
                  <Crosshair className="h-4 w-4 text-primary" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Next Controllable Action</span>
                </div>
                <p className="mt-2 text-sm">{nextControllable}</p>
              </Card>
            )}

            <div className="grid gap-3">
              {sections.map((s) => (
                <Card key={s.title} className="panel p-4">
                  <h2 className="font-mono text-[10px] uppercase tracking-widest text-primary m-0">
                    {s.title}
                  </h2>
                  <div className="mt-2 text-sm whitespace-pre-wrap leading-relaxed">
                    {s.body || <span className="text-muted-foreground italic">No detail returned.</span>}
                  </div>
                </Card>
              ))}
            </div>

            {result.proofContract.shouldCreate && (
              <ProofContractCard
                contract={{
                  ...result.proofContract,
                  mode: result.proofContract.mode as Mode,
                } as any}
                onCommit={commit}
                committing={committing}
                committed={!!committedId}
              />
            )}

            {committedId && (
              <Card className="panel p-4 border-primary/30 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                    Next step
                  </span>
                  <p className="text-sm mt-1">
                    Contract saved. Submit the proof artifact in the Court of Evidence.
                  </p>
                </div>
                <Link to="/proof">
                  <Button size="sm">
                    Submit Proof <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </Card>
            )}
          </div>
        )}

        <Card className="panel p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Quick prompts</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((p) => (
              <Button
                key={p}
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => setInput((prev) => (prev.trim() ? `${prev.trim()}\n\n${p}` : p))}
              >
                {p}
              </Button>
            ))}
          </div>
        </Card>

        <Card className="panel p-4">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground m-0">
            Recent interactions
          </h2>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">
              No coach interactions yet. Name a real bottleneck above to start the loop.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {history.map((h) => (
                <li key={h.id} className="py-2 text-xs">
                  <span className="font-mono uppercase tracking-wider text-muted-foreground">
                    {h.mode ?? "none"}
                  </span>
                  <span className="ml-2 text-foreground">
                    {h.user_input.slice(0, 110)}
                    {h.user_input.length > 110 ? "..." : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
