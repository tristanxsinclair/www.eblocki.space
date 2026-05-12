import { normaliseCoachResponse } from "@/lib/eblocki/coach-response";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/eblocki/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModeBadge, StateBadge } from "@/components/eblocki/Badges";
import { ProofContractCard } from "@/components/eblocki/ProofContractCard";
import type { Mode } from "@/lib/eblocki/modes";
import type { BehaviouralState } from "@/lib/eblocki/states";
import type { ProofContract } from "@/lib/eblocki/proof-contract";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

interface CoachResponse {
  mode: Mode;
  hybrid?: Mode;
  state: BehaviouralState;
  response: string;
  proofContract: ProofContract;
  proofQuestion: string;
  interactionId?: string;
  commitmentId?: string;
}

export default function Coach() {
  const { user, session } = useAuth();
  const [params] = useSearchParams();
  const [input, setInput] = useState(params.get("prompt") ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CoachResponse | null>(null);
  const [committing, setCommitting] = useState(false);
  const [committed, setCommitted] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

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
  if (!message.trim()) return;

  setLoading(true);
  setError(null);

  try {
    const { data, error } = await supabase.functions.invoke("coach", {
      body: { message: message.trim() },
    });

    if (error) {
      console.error("Coach invoke error:", error);
      setError(
        `Coach request failed: ${
          error.message || "Unknown Supabase function error"
        }`
      );
      return;
    }

    if (!data) {
      setError("Coach returned no data. The request succeeded, but the response body was empty.");
      return;
    }

    const normalised = normaliseCoachResponse(data);

    setResponse(normalised);
    setMessage("");
  } catch (err) {
    console.error("Coach unexpected error:", err);
    setError(
      err instanceof Error
        ? err.message
        : "Unexpected coach error. Check console for details."
    );
  } finally {
    setLoading(false);
  }
};
if (response?.commitmentId) {
  setError("Proof Contract already saved.");
  return;
}
{response?.commitmentId ? "Proof Contract Saved" : "Commit to the Court of Evidence"}
disabled={loading || !!response?.commitmentId}
  const commit = async () => {
    if (!result || !user) return;
    setCommitting(true);
    try {
      const { data, error } = await supabase
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
      if (error) throw error;
      setCommitted(true);
      toast.success("Committed to the Court of Evidence.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCommitting(false);
    }
}

  return (
    <AppShell>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        <header>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">AI Coach</span>
          <h1 className="text-2xl md:text-3xl font-semibold mt-1">Diagnose. Prescribe. Prove.</h1>
        </header>

        <Card className="panel p-4">
          <Textarea
            placeholder="Drop the task, the friction, or the check-in. The system will route to the right mode."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-h-[120px]"
          />
          <div className="mt-3 flex justify-end">
            <Button onClick={send} disabled={loading || !input.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2" /> Send</>}
            </Button>
          </div>
        </Card>

        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <ModeBadge mode={result.mode} hybrid={result.hybrid} />
              <StateBadge state={result.state} />
            </div>
            <Card className="panel p-5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Coach response</span>
              <article className="prose prose-invert prose-sm max-w-none mt-3 whitespace-pre-wrap font-sans">
                {result.response}
              </article>
            </Card>
            {result.proofContract.shouldCreate && (
              <ProofContractCard
                contract={result.proofContract}
                onCommit={commit}
                committing={committing}
                committed={committed}
              />
            )}
          </div>
        )}

        {history.length > 0 && (
          <Card className="panel p-4">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Recent interactions</span>
            <ul className="mt-3 divide-y divide-border">
              {history.map((h) => (
                <li key={h.id} className="py-2 text-xs">
                  <span className="font-mono uppercase tracking-wider text-muted-foreground">{h.mode ?? "—"}</span>
                  <span className="ml-2 text-foreground">{h.user_input.slice(0, 110)}{h.user_input.length > 110 ? "…" : ""}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
