import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/eblocki/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { BehaviouralState } from "@/lib/eblocki/states";

const FIELDS: { key: string; label: string; section: "core" | "audit" }[] = [
  { key: "prime_objective", label: "Prime Objective", section: "core" },
  { key: "law_proof", label: "Law Proof", section: "core" },
  { key: "psychology_proof", label: "Psychology Proof", section: "core" },
  { key: "eblocki_proof", label: "Eblocki Proof", section: "core" },
  { key: "friction_task", label: "Friction Task", section: "core" },
  { key: "avoidance_signal", label: "Avoidance Signal", section: "core" },
  { key: "next_best_action", label: "Next Best Action", section: "core" },
  { key: "end_output", label: "End Output", section: "audit" },
  { key: "end_proof", label: "End Proof", section: "audit" },
  { key: "end_avoidance", label: "End Avoidance", section: "audit" },
  { key: "end_pattern", label: "End Pattern", section: "audit" },
  { key: "tomorrow_first_move", label: "Tomorrow's First Move", section: "audit" },
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
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Daily Control Sheet</span>
            <h1 className="text-2xl md:text-3xl font-semibold mt-1">{today}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={createContract}>Contract from Objective</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Sheet"}</Button>
          </div>
        </header>

        <Card className="panel p-5 space-y-4">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-primary">Day plan</h2>
          {FIELDS.filter(f => f.section === "core").map(f => (
            <div key={f.key}>
              <Label>{f.label}</Label>
              <Textarea value={form[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} className="mt-1" rows={2} />
            </div>
          ))}
        </Card>

        <Card className="panel p-5 space-y-4">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-primary">End-of-day audit</h2>
          {FIELDS.filter(f => f.section === "audit").map(f => (
            <div key={f.key}>
              <Label>{f.label}</Label>
              <Textarea value={form[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} className="mt-1" rows={2} />
            </div>
          ))}
          <div>
            <Label>State</Label>
            <select value={form.state ?? ""} onChange={(e) => set("state", e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">—</option>
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
