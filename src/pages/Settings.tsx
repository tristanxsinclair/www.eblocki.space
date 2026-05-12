import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/eblocki/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const MODELS = [
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "openai/gpt-5",
  "openai/gpt-5-mini",
];

export default function Settings() {
  const { user } = useAuth();
  const [cfg, setCfg] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("performance_os_config").select("*").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setCfg(data ?? { user_id: user.id, model: MODELS[0] }));
  }, [user]);

  if (!cfg) return <AppShell><div className="p-8">Loading…</div></AppShell>;

  const set = (k: string, v: any) => setCfg((c: any) => ({ ...c, [k]: v }));

  const save = async () => {
    setSaving(true);
    const payload = { ...cfg, user_id: user!.id };
    delete payload.id; delete payload.created_at; delete payload.updated_at;
    const { error } = await supabase.from("performance_os_config").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Settings saved.");
  };

  return (
    <AppShell>
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
        <header>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Settings</span>
          <h1 className="text-2xl md:text-3xl font-semibold mt-1">Operator config.</h1>
        </header>
        <Card className="panel p-5 space-y-5">
          <div>
            <Label>Preferred model</Label>
            <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={cfg.model ?? MODELS[0]} onChange={(e) => set("model", e.target.value)}>
              {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <Label>Vector store ID (optional)</Label>
            <Input value={cfg.vector_store_id ?? ""} onChange={(e) => set("vector_store_id", e.target.value)} placeholder="vs_..." />
            <p className="mt-1 text-[10px] text-muted-foreground font-mono">{/* TODO: wire vector store retrieval when OpenAI key supplied */}Used when OpenAI Responses API is connected.</p>
          </div>
          <Toggle label="Default response structure (BLUF / Analysis / System / Upgrade)" checked={!!cfg.default_response_structure} onChange={(v) => set("default_response_structure", v)} />
          <Toggle label="Strict verification (refuse to fabricate sources)" checked={!!cfg.strict_verification} onChange={(v) => set("strict_verification", v)} />
          <Toggle label="Auto-create Proof Contracts" checked={!!cfg.auto_create_proof_contracts} onChange={(v) => set("auto_create_proof_contracts", v)} />
          <div>
            <Label>Proof contract minimum seriousness ({cfg.proof_contract_minimum_seriousness ?? 5})</Label>
            <input type="range" min={1} max={10} value={cfg.proof_contract_minimum_seriousness ?? 5} onChange={(e) => set("proof_contract_minimum_seriousness", Number(e.target.value))} className="w-full mt-2" />
          </div>
          <Button onClick={save} disabled={saving} className="w-full">{saving ? "Saving…" : "Save"}</Button>
        </Card>
      </div>
    </AppShell>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
