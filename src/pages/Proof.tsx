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
import { Gavel } from "lucide-react";

const DOMAINS = ["all", "law", "psychology", "sales", "eblocki", "sport", "brand", "career_money"] as const;
type DomainFilter = typeof DOMAINS[number];

export default function Proof() {
  const { user } = useAuth();
  const [pending, setPending] = useState<any[]>([]);
  const [completed, setCompleted] = useState<any[]>([]);
  const [missed, setMissed] = useState<any[]>([]);
  const [submitFor, setSubmitFor] = useState<any | null>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [reflection, setReflection] = useState("");
  const [nextUpgrade, setNextUpgrade] = useState("");
  const [domain, setDomain] = useState<DomainFilter>("all");

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
    const composedFeedback = [score.feedback, reflection.trim() && `Reflection: ${reflection.trim()}`]
      .filter(Boolean).join(" ");
    const composedNextUpgrade = nextUpgrade.trim() || score.nextUpgrade;
    const { data: artifact, error } = await supabase.from("proof_artifacts").insert({
      user_id: user.id, domain: submitFor.domain, title: title || submitFor.title,
      artifact_type: submitFor.required_artifact, content,
      quality_score: score.score, evidence_strength: score.strength,
      feedback: composedFeedback, next_upgrade: composedNextUpgrade,
    }).select().single();
    if (error) return toast.error(error.message);
    await supabase.from("proof_commitments").update({
      status: "completed", proof_artifact_id: artifact!.id, completed_at: new Date().toISOString(),
      completion_reflection: reflection.trim() || null,
    }).eq("id", submitFor.id);
    toast.success(`Scored ${score.score}/10 — ${score.strength}`);
    setSubmitFor(null); setContent(""); setTitle(""); setReflection(""); setNextUpgrade("");
    reload();
  };

  const filterByDomain = <T extends { domain: string }>(items: T[]) =>
    domain === "all" ? items : items.filter((i) => i.domain === domain);

  const filteredPending = filterByDomain(pending);
  const filteredCompleted = filterByDomain(completed);
  const filteredMissed = filterByDomain(missed);

  const strengthCount = (k: string) =>
    filteredCompleted.filter((c) => c.evidence_strength === k).length;

  return (
    <AppShell>
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        <header>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Court of Evidence</span>
          <h1 className="text-2xl md:text-3xl font-semibold mt-1">Receipts, scored.</h1>
        </header>

        <Card className="panel p-4 border-primary/20">
          <div className="flex items-start gap-3">
            <Gavel className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                The Court of Evidence
              </span>
              <p className="text-sm text-muted-foreground mt-1">
                Every identity claim needs evidence. This dashboard shows what has actually been
                produced, not what was intended. A Proof Contract is a promise of evidence. A Proof
                Artifact is completed evidence.
              </p>
            </div>
          </div>
        </Card>

        <Card className="panel p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="grid grid-cols-4 gap-2 flex-1 min-w-[260px]">
              {(["weak", "moderate", "strong", "elite"] as const).map((s) => (
                <div key={s} className="rounded-sm border border-border p-2 text-center">
                  <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{s}</div>
                  <div className={"mt-1 text-lg font-semibold font-mono " + (s === "elite" ? "text-primary" : "")}>
                    {strengthCount(s)}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Domain</Label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value as DomainFilter)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              >
                {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({filteredPending.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({filteredCompleted.length})</TabsTrigger>
            <TabsTrigger value="missed">Missed ({filteredMissed.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="space-y-2">
            {filteredPending.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No pending contracts in this domain. Open the AI Coach and define one.
              </p>
            )}
            {filteredPending.map(p => (
              <Card key={p.id} className="panel p-4 flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
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
            {filteredCompleted.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No proof logged yet. The Court of Evidence is empty. Create today's first artifact.
              </p>
            )}
            {filteredCompleted.map(a => (
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
            {filteredMissed.length === 0 ? <p className="text-sm text-muted-foreground">No missed contracts.</p> :
              filteredMissed.map(p => <Card key={p.id} className="panel p-3 mb-2"><div className="text-sm">{p.title}</div></Card>)}
          </TabsContent>
        </Tabs>

        {submitFor && (
          <Card className="panel p-5 border-primary/30">
            <h2 className="font-mono text-[10px] uppercase tracking-widest text-primary">Submit proof artifact</h2>
            <p className="text-xs text-muted-foreground mt-1">For: {submitFor.title}</p>
            <div className="mt-3 space-y-3">
              <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div>
                <Label>Content</Label>
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={10}
                  placeholder="Paste the artifact — IRAC answer, CAEE paragraph, sales reflection, training log, script, etc." />
              </div>
              <div>
                <Label>Reflection</Label>
                <Textarea value={reflection} onChange={(e) => setReflection(e.target.value)} rows={2}
                  placeholder="What did this expose? Where did the artifact fall short of elite?" />
              </div>
              <div>
                <Label>Next Upgrade</Label>
                <Input value={nextUpgrade} onChange={(e) => setNextUpgrade(e.target.value)}
                  placeholder="One concrete upgrade for the next attempt." />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setSubmitFor(null); setContent(""); setReflection(""); setNextUpgrade(""); }}>Cancel</Button>
                <Button onClick={submit}>Score &amp; File</Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
