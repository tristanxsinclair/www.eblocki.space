import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/eblocki/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EvidenceStrengthBadge } from "@/components/eblocki/Badges";
import { scoreProof } from "@/lib/eblocki/proof-scoring";
import { toast } from "sonner";

export default function Proof() {
  const { user } = useAuth();
  const [pending, setPending] = useState<any[]>([]);
  const [completed, setCompleted] = useState<any[]>([]);
  const [missed, setMissed] = useState<any[]>([]);
  const [submitFor, setSubmitFor] = useState<any | null>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");

  const reload = async () => {
    if (!user) return;
    const [{ data: pc }, { data: pa }] = await Promise.all([
      supabase.from("proof_commitments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("proof_artifacts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setPending((pc ?? []).filter(p => p.status === "pending"));
    setMissed((pc ?? []).filter(p => p.status === "missed"));
    setCompleted(pa ?? []);
  };
  useEffect(() => { reload(); }, [user]);

  const submit = async () => {
    if (!user || !submitFor || !content.trim()) return;
    const score = scoreProof(submitFor.domain, content);
    const { data: artifact, error } = await supabase.from("proof_artifacts").insert({
      user_id: user.id, domain: submitFor.domain, title: title || submitFor.title,
      artifact_type: submitFor.required_artifact, content,
      quality_score: score.score, evidence_strength: score.strength,
      feedback: score.feedback, next_upgrade: score.nextUpgrade,
    }).select().single();
    if (error) return toast.error(error.message);
    await supabase.from("proof_commitments").update({
      status: "completed", proof_artifact_id: artifact!.id, completed_at: new Date().toISOString(),
    }).eq("id", submitFor.id);
    toast.success(`Scored ${score.score}/10 — ${score.strength}`);
    setSubmitFor(null); setContent(""); setTitle("");
    reload();
  };

  return (
    <AppShell>
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        <header>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Court of Evidence</span>
          <h1 className="text-2xl md:text-3xl font-semibold mt-1">Receipts, scored.</h1>
        </header>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
            <TabsTrigger value="missed">Missed ({missed.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="space-y-2">
            {pending.length === 0 && <p className="text-sm text-muted-foreground">No pending contracts.</p>}
            {pending.map(p => (
              <Card key={p.id} className="panel p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-[10px] uppercase text-muted-foreground">{p.domain} · {p.mode}</div>
                  <div className="text-sm font-medium">{p.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{p.required_artifact}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Standard: {p.evidence_standard}</div>
                </div>
                <Button size="sm" onClick={() => { setSubmitFor(p); setTitle(p.title); }}>Submit Proof</Button>
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="completed" className="space-y-2">
            {completed.length === 0 && <p className="text-sm text-muted-foreground">No artifacts yet.</p>}
            {completed.map(a => (
              <Card key={a.id} className="panel p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-[10px] uppercase text-muted-foreground">{a.domain}</div>
                  {a.evidence_strength && <EvidenceStrengthBadge strength={a.evidence_strength} score={a.quality_score} />}
                </div>
                <div className="text-sm font-medium mt-1">{a.title}</div>
                {a.feedback && <p className="text-xs text-muted-foreground mt-2">{a.feedback}</p>}
                {a.next_upgrade && <p className="text-xs text-primary mt-1">Next upgrade: {a.next_upgrade}</p>}
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="missed">
            {missed.length === 0 ? <p className="text-sm text-muted-foreground">No missed contracts.</p> :
              missed.map(p => <Card key={p.id} className="panel p-3 mb-2"><div className="text-sm">{p.title}</div></Card>)}
          </TabsContent>
        </Tabs>

        {submitFor && (
          <Card className="panel p-5 border-primary/30">
            <h2 className="font-mono text-[10px] uppercase tracking-widest text-primary">Submit proof artifact</h2>
            <p className="text-xs text-muted-foreground mt-1">For: {submitFor.title}</p>
            <div className="mt-3 space-y-3">
              <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div><Label>Content</Label><Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={10} placeholder="Paste the artifact text — your IRAC, paragraph, reflection, log, script, etc." /></div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setSubmitFor(null)}>Cancel</Button>
                <Button onClick={submit}>Score &amp; File</Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
