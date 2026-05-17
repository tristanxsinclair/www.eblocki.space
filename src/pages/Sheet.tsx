import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/eblocki/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import type { BehaviouralState } from "@/lib/eblocki/states";
import { STATE_LABELS } from "@/lib/eblocki/states";
import { Seo } from "@/components/Seo";
import { Link } from "react-router-dom";
import { MissionCard } from "@/components/eblocki/MissionCard";
import { useMomentum } from "@/hooks/useMomentum";
import { useDailyObjectives } from "@/hooks/useDailyObjectives";
import { STATE_COPY, nextBestAction } from "@/lib/eblocki/momentum";
import { MODE_LABELS, type Mode } from "@/lib/eblocki/modes";
import { cn } from "@/lib/utils";
import { Flame, Snowflake, ChevronDown, ShieldCheck, Sparkles } from "lucide-react";

const FIELDS: { key: string; label: string; section: "core" | "audit"; placeholder: string }[] = [
  { key: "prime_objective", label: "Prime Objective", section: "core",
    placeholder: "What is the one objective that would make today count?" },
  { key: "law_proof", label: "Law Proof", section: "core",
    placeholder: "What concrete law artifact will you produce today (e.g. one IRAC answer)?" },
  { key: "psychology_proof", label: "Psychology Proof", section: "core",
    placeholder: "What CAEE paragraph or applied artifact will you produce?" },
  { key: "eblocki_proof", label: "Eblocki Proof", section: "core",
    placeholder: "What proof shows the Eblocki standard held today?" },
  { key: "friction_task", label: "Friction Task", section: "core",
    placeholder: "What is the highest-friction task you would normally avoid?" },
  { key: "avoidance_signal", label: "Avoidance Signal", section: "core",
    placeholder: "What behaviour would prove you are dodging the real task?" },
  { key: "next_best_action", label: "Next Best Action", section: "core",
    placeholder: "What is the smallest action that creates evidence right now?" },
  { key: "end_output", label: "End Output", section: "audit",
    placeholder: "What did you actually produce today?" },
  { key: "end_proof", label: "End Proof", section: "audit",
    placeholder: "What artifact would survive the Court of Evidence?" },
  { key: "end_avoidance", label: "End Avoidance", section: "audit",
    placeholder: "Where did avoidance show up today?" },
  { key: "end_pattern", label: "End Pattern", section: "audit",
    placeholder: "What pattern repeats and needs an upgrade?" },
  { key: "tomorrow_first_move", label: "Tomorrow's First Move", section: "audit",
    placeholder: "First controllable action for tomorrow morning." },
];

const STATES: BehaviouralState[] = ["locked_in","momentum","strategic_build","scattered","avoidant","overloaded","low_energy","hype_drift","academic_displacement","recovery"];

export default function Sheet() {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<any>({ sheet_date: today, state: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("daily_control_sheets").select("*").eq("user_id", user.id).eq("sheet_date", today).maybeSingle()
      .then(({ data }) => { if (data) setForm(data); });
  }, [user, today]);

  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = { ...form, user_id: user.id, sheet_date: today };
      delete payload.id; delete payload.created_at; delete payload.updated_at;
      const { error } = await supabase.from("daily_control_sheets").upsert(payload, { onConflict: "user_id,sheet_date" });
      if (error) throw error;
      toast.success("Sheet saved.");
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const createContract = async () => {
    if (!user || !form.prime_objective) return toast.error("Set a Prime Objective first.");
    const { error } = await supabase.from("proof_commitments").insert({
      user_id: user.id,
      domain: "discipline", mode: "EBLOCKI",
      title: form.prime_objective,
      required_artifact: "Concrete output proving the prime objective shipped.",
      evidence_standard: "State / Bottleneck / Artifact / Reflection / Next upgrade",
      status: "pending",
    });
    if (error) toast.error(error.message);
    else toast.success("Proof Contract created from prime objective.");
  };

  return (
    <AppShell>
      <Seo
        title="Daily Control Sheet | EBLOCKI"
        description="Plan the day's prime objective and audit the receipts at end of day. The sheet feeds the proof loop."
        path="/sheet"
      />
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Daily Control Sheet</span>
            <h1 className="text-2xl md:text-3xl font-semibold mt-1">{today}</h1>
          </div>
          <div className="flex gap-2">
            <Link to="/start"><Button variant="outline">Start Today</Button></Link>
            <Button variant="outline" onClick={createContract}>Contract from Objective</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Sheet"}</Button>
          </div>
        </header>

        <Card className="panel p-5 space-y-4">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-primary">Day plan</h2>
          {FIELDS.filter(f => f.section === "core").map(f => (
            <div key={f.key}>
              <Label htmlFor={`sheet-${f.key}`}>{f.label}</Label>
              <Textarea
                id={`sheet-${f.key}`}
                value={form[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="mt-1" rows={2}
              />
            </div>
          ))}
        </Card>

        <Card className="panel p-5 space-y-4">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-primary">End-of-day audit</h2>
          {FIELDS.filter(f => f.section === "audit").map(f => (
            <div key={f.key}>
              <Label htmlFor={`sheet-${f.key}`}>{f.label}</Label>
              <Textarea
                id={`sheet-${f.key}`}
                value={form[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="mt-1" rows={2}
              />
            </div>
          ))}
          <div>
            <Label htmlFor="sheet-state">State</Label>
            <select id="sheet-state" value={form.state ?? ""} onChange={(e) => set("state", e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">—</option>
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
