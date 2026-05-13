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
import type { BehaviouralState } from "@/lib/eblocki/states";
import { toast } from "sonner";
import { AlertCircle, ArrowRight, Loader2, Send } from "lucide-react";

const SECTION_TITLES = [
  "Bottom Line Up Front",
  "Analysis",
  "Actionable System",
  "HD/Elite Upgrade",
];

function splitResponseSections(text: string): { title: string; body: string }[] {
  if (!text) return [];
  // Match either "## Title", "1. Title", or bare "Title" lines that match SECTION_TITLES.
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
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NormalisedCoachResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [localCommitmentId, setLocalCommitmentId] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);

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

  const send = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setLocalCommitmentId(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("coach", {
        body: { message: input.trim() },
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

  return (
    <AppShell>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        <header>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            AI Coach
          </span>
          <h1 className="text-2xl md:text-3xl font-semibold mt-1">
            Diagnose. Prescribe. Prove.
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Drop the task. The system routes to the right mode, diagnoses the state, and forces a Proof Contract.
          </p>
        </header>

        <Card className="panel p-4">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            What are you trying to execute?
          </label>
          <Textarea
            placeholder="e.g. I have my LAWS1005 statutory interpretation prep but I keep reorganising notes instead of writing answers. Force the next controllable action into a proof artifact."
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
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Diagnosing…</>
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Send to Coach</>
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
            <div className="flex items-center gap-2 flex-wrap">
              <ModeBadge
                mode={result.mode as Mode}
                hybrid={(result.hybrid ?? undefined) as Mode | undefined}
              />
              {result.state && <StateBadge state={result.state as BehaviouralState} />}
            </div>

            <div className="grid gap-3">
              {sections.map((s) => (
                <Card key={s.title} className="panel p-4">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                    {s.title}
                  </span>
                  <div className="mt-2 text-sm whitespace-pre-wrap leading-relaxed">
                    {s.body || <span className="text-muted-foreground italic">—</span>}
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
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Recent interactions
          </span>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">
              No coach interactions yet. Drop a real bottleneck above to start the loop.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {history.map((h) => (
                <li key={h.id} className="py-2 text-xs">
                  <span className="font-mono uppercase tracking-wider text-muted-foreground">
                    {h.mode ?? "—"}
                  </span>
                  <span className="ml-2 text-foreground">
                    {h.user_input.slice(0, 110)}
                    {h.user_input.length > 110 ? "…" : ""}
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