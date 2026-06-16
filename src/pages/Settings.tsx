import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/eblocki/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Seo } from "@/components/Seo";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Shield, Download, Trash2, FileText as FileTextIcon, LogOut } from "lucide-react";
import { track, reset as resetAnalytics, EVENTS } from "@/lib/analytics";
import { BetaFeedback } from "@/components/eblocki/BetaFeedback";
import { NotificationPreferences } from "@/components/eblocki/NotificationPreferences";
import { PasswordSecurity } from "@/components/eblocki/PasswordSecurity";

const MODELS = [
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "openai/gpt-5",
  "openai/gpt-5-mini",
];

export default function Settings() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [cfg, setCfg] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [modes, setModes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editingModeId, setEditingModeId] = useState<string | null>(null);
  const [modeDrafts, setModeDrafts] = useState<Record<string, any>>({});
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    Promise.all([
      supabase.from("performance_os_config").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_onboarding_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_modes").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
    ]).then(([cfgResult, profileResult, modesResult]) => {
      setCfg(cfgResult.data ?? { user_id: user.id, model: MODELS[0], default_response_structure: true, strict_verification: true, auto_create_proof_contracts: true, proof_contract_minimum_seriousness: 5 });
      setProfile(profileResult.data ?? { user_id: user.id, identity_summary: "", roles: [], goals: [], coaching_style: "direct", strictness_level: 7, prefers_detailed_analysis: true, challenge_avoidance: true, auto_create_proof_contracts: true, completed_onboarding: false });
      setModes(modesResult.data ?? []);
    }).catch((error) => {
      toast.error(error?.message || "Failed to load settings.");
    }).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <AppShell><div className="p-8">Loading…</div></AppShell>;
  if (!cfg || !profile) return <AppShell><div className="p-8">Loading…</div></AppShell>;
  const setCfgField = (k: string, v: any) => setCfg((c: any) => ({ ...c, [k]: v }));
  const setProfileField = (k: string, v: any) => setProfile((p: any) => ({ ...p, [k]: v }));
  const setModeDraftField = (modeId: string, field: string, value: any) => setModeDrafts((drafts) => ({ ...drafts, [modeId]: { ...drafts[modeId], [field]: value } }));

  const save = async () => {
    setSaving(true);
    const payload = { ...cfg, user_id: user!.id };
    delete payload.id; delete payload.created_at; delete payload.updated_at;
    const { error } = await supabase.from("performance_os_config").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Settings saved.");
  };

  const saveProfile = async () => {
    if (!user || !profile) return;
    setSavingProfile(true);
    const payload: any = {
      user_id: user.id,
      identity_summary: profile.identity_summary,
      roles: profile.roles || [],
      goals: profile.goals || [],
      coaching_style: profile.coaching_style,
      strictness_level: profile.strictness_level,
      prefers_detailed_analysis: profile.prefers_detailed_analysis,
      challenge_avoidance: profile.challenge_avoidance,
      auto_create_proof_contracts: profile.auto_create_proof_contracts,
      completed_onboarding: profile.completed_onboarding ?? true,
    };
    const { error } = await supabase.from("user_onboarding_profiles").upsert(payload, { onConflict: "user_id" });
    setSavingProfile(false);
    if (error) toast.error(error.message); else toast.success("Onboarding profile updated.");
  };

  const toggleModeActive = async (mode: any) => {
    if (!user) return;
    const { error } = await supabase.from("user_modes").update({ is_active: !mode.is_active }).match({ user_id: user.id, mode_id: mode.mode_id });
    if (error) return toast.error(error.message);
    setModes((current) => current.map((item) => item.mode_id === mode.mode_id ? { ...item, is_active: !item.is_active } : item));
    toast.success(`${mode.display_name} ${mode.is_active ? "disabled" : "enabled"}.`);
  };

  const startEditMode = (mode: any) => {
    setEditingModeId(mode.mode_id);
    setModeDrafts((drafts) => ({
      ...drafts,
      [mode.mode_id]: {
        display_name: mode.display_name,
        description: mode.description,
        proof_examples: (mode.proof_examples || []).join(", "),
        keywords: (mode.keywords || []).join(", "),
      },
    }));
  };

  const saveModeEdit = async (modeId: string) => {
    if (!user || !modeDrafts[modeId]) return;
    const draft = modeDrafts[modeId];
    const payload = {
      display_name: draft.display_name,
      description: draft.description,
      proof_examples: draft.proof_examples.split(",").map((item: string) => item.trim()).filter(Boolean),
      keywords: draft.keywords.split(",").map((item: string) => item.trim()).filter(Boolean),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("user_modes").update(payload).match({ user_id: user.id, mode_id: modeId });
    if (error) return toast.error(error.message);
    setModes((current) => current.map((item) => item.mode_id === modeId ? { ...item, ...payload } : item));
    setEditingModeId(null);
    toast.success("Mode updated.");
  };

  const resetOnboarding = async () => {
    if (!user) return;
    const { error } = await supabase.from("user_onboarding_profiles").upsert({ user_id: user.id, completed_onboarding: false }, { onConflict: "user_id" });
    if (error) return toast.error(error.message);
    toast.success("Onboarding reset. You can rerun Setup OS.");
  };

  const exportProfile = () => {
    const payload = { profile, modes };
    const text = JSON.stringify(payload, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Eblocki profile copied to clipboard.");
    });
  };

  const exportAllData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-data`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `eblocki-export-${user.id}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      void track(EVENTS.data_exported);
      toast.success("Export downloaded.");
    } catch (e: any) {
      toast.error(e?.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    const phrase = window.prompt(
      "Deleting your account erases every artifact, control sheet, mode and attachment. This cannot be undone.\n\nType DELETE to confirm.",
    );
    if (phrase !== "DELETE") return;
    setDeleting(true);
    try {
      void track(EVENTS.account_deletion_requested);
      const { error } = await supabase.functions.invoke("delete-account", { method: "POST" });
      if (error) throw error;
      resetAnalytics();
      await supabase.auth.signOut();
      toast.success("Account deleted.");
      nav("/", { replace: true });
    } catch (e: any) {
      toast.error(e?.message || "Delete failed.");
      setDeleting(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      nav("/", { replace: true });
    } catch {
      toast.error("Sign out failed. Please try again.");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <AppShell>
      <Seo title="Settings | EBLOCKI" description="Operator config — model preferences, profile, and identity claims." path="/settings" />
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 min-w-0 max-w-full text-wrap-safe">
        <header className="min-w-0">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Settings</span>
          <h1 className="text-2xl md:text-3xl font-semibold mt-1 break-words">Operator config.</h1>
        </header>

        <Card className="panel p-4 md:p-5 space-y-5 max-w-full overflow-hidden">
          <div>
            <Label>Preferred model</Label>
            <select className="mt-1 w-full max-w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={cfg.model ?? MODELS[0]} onChange={(e) => setCfgField("model", e.target.value)}>
              {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <Label>Vector store ID (optional)</Label>
            <Input value={cfg.vector_store_id ?? ""} onChange={(e) => setCfgField("vector_store_id", e.target.value)} placeholder="vs_..." />
            <p className="mt-1 text-[10px] text-muted-foreground font-mono">Used when OpenAI Responses API is connected.</p>
          </div>
          <Toggle label="Default response structure (BLUF / Analysis / System / Upgrade)" checked={!!cfg.default_response_structure} onChange={(v) => setCfgField("default_response_structure", v)} />
          <Toggle label="Strict verification (refuse to fabricate sources)" checked={!!cfg.strict_verification} onChange={(v) => setCfgField("strict_verification", v)} />
          <Toggle label="Auto-create Proof Contracts" checked={!!cfg.auto_create_proof_contracts} onChange={(v) => setCfgField("auto_create_proof_contracts", v)} />
          <div>
            <Label>Proof contract minimum seriousness ({cfg.proof_contract_minimum_seriousness ?? 5})</Label>
            <input type="range" min={1} max={10} value={cfg.proof_contract_minimum_seriousness ?? 5} onChange={(e) => setCfgField("proof_contract_minimum_seriousness", Number(e.target.value))} className="w-full mt-2" />
          </div>
          <Button onClick={save} disabled={saving} className="w-full">{saving ? "Saving…" : "Save"}</Button>
        </Card>

        <Card className="panel p-4 md:p-5 space-y-5 max-w-full overflow-hidden">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Personalised Eblocki OS</span>
              <h2 className="text-xl font-semibold mt-2 break-words">Onboarding profile</h2>
            </div>
            <Button variant="outline" onClick={resetOnboarding}>Reset onboarding</Button>
          </div>

          <div className="grid gap-4">
            <div>
              <Label>Identity summary</Label>
              <Textarea
                value={profile.identity_summary ?? ""}
                onChange={(e) => setProfileField("identity_summary", e.target.value)}
                rows={4}
                placeholder="Who is this system built for?"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Roles</Label>
                <Input value={(profile.roles || []).join(", ")} onChange={(e) => setProfileField("roles", e.target.value.split(",").map((item: string) => item.trim()).filter(Boolean))} placeholder="student, athlete, creator" />
              </div>
              <div>
                <Label>Goals</Label>
                <Input value={(profile.goals || []).join(", ")} onChange={(e) => setProfileField("goals", e.target.value.split(",").map((item: string) => item.trim()).filter(Boolean))} placeholder="exam prep, sales, health" />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Coaching style</Label>
                <Input value={profile.coaching_style ?? "direct"} onChange={(e) => setProfileField("coaching_style", e.target.value)} />
              </div>
              <div>
                <Label>Strictness level</Label>
                <input type="range" min={1} max={10} value={profile.strictness_level ?? 7} onChange={(e) => setProfileField("strictness_level", Number(e.target.value))} className="w-full mt-2" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Behavioural toggles</label>
                <div className="grid gap-2">
                  <Toggle label="Detailed analysis" checked={!!profile.prefers_detailed_analysis} onChange={(v) => setProfileField("prefers_detailed_analysis", v)} />
                  <Toggle label="Challenge avoidance" checked={!!profile.challenge_avoidance} onChange={(v) => setProfileField("challenge_avoidance", v)} />
                  <Toggle label="Auto-create proof contracts" checked={!!profile.auto_create_proof_contracts} onChange={(v) => setProfileField("auto_create_proof_contracts", v)} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between gap-3 pt-3">
            <Button variant="secondary" onClick={exportProfile} className="w-full sm:w-auto">Export profile JSON</Button>
            <Button onClick={saveProfile} disabled={savingProfile} className="w-full sm:w-auto">{savingProfile ? "Saving…" : "Save onboarding profile"}</Button>
          </div>
        </Card>

        <Card className="panel p-4 md:p-5 space-y-5 max-w-full overflow-hidden">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Mode management</span>
              <h2 className="text-xl font-semibold mt-2 break-words">Active modes</h2>
              <p className="text-sm text-muted-foreground mt-1 break-words">Edit your personalised modes and toggle whether each arena is active.</p>
            </div>
          </div>

          <div className="space-y-4">
            {modes.length === 0 ? (
              <div className="rounded-sm border border-border p-4 text-sm text-muted-foreground">
                No personalised modes yet. Open Setup OS or add a mode in the Modes page.
              </div>
            ) : (
              modes.map((mode) => {
                const draft = modeDrafts[mode.mode_id] ?? {};
                return (
                  <Card key={mode.mode_id} className="panel p-4 max-w-full overflow-hidden">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground break-words">{mode.mode_id}</div>
                        <div className="text-lg font-semibold mt-2 break-words">{mode.display_name}</div>
                        <div className="text-xs text-muted-foreground mt-1 break-words">{mode.description}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button size="sm" variant="ghost" onClick={() => toggleModeActive(mode)}>{mode.is_active ? "Disable" : "Enable"}</Button>
                        <Button size="sm" variant="secondary" onClick={() => startEditMode(mode)}>{editingModeId === mode.mode_id ? "Close" : "Edit"}</Button>
                      </div>
                    </div>

                    {editingModeId === mode.mode_id && (
                      <div className="mt-4 grid gap-3">
                        <div>
                          <Label>Display name</Label>
                          <Input
                            value={draft.display_name ?? mode.display_name}
                            onChange={(e) => setModeDraftField(mode.mode_id, "display_name", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={draft.description ?? mode.description}
                            onChange={(e) => setModeDraftField(mode.mode_id, "description", e.target.value)}
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label>Proof examples</Label>
                          <Textarea
                            value={draft.proof_examples ?? (mode.proof_examples || []).join(", ")}
                            onChange={(e) => setModeDraftField(mode.mode_id, "proof_examples", e.target.value)}
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label>Keywords</Label>
                          <Textarea
                            value={draft.keywords ?? (mode.keywords || []).join(", ")}
                            onChange={(e) => setModeDraftField(mode.mode_id, "keywords", e.target.value)}
                            rows={2}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="secondary" onClick={() => setEditingModeId(null)}>Cancel</Button>
                          <Button size="sm" onClick={() => saveModeEdit(mode.mode_id)}>Save mode</Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        </Card>

        <Card className="panel p-4 md:p-5 space-y-4 max-w-full overflow-hidden">
          <div className="min-w-0">
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Account & data</span>
            <h2 className="text-xl font-semibold mt-2">Account</h2>
          <p className="text-sm text-muted-foreground mt-1 break-all">{user?.email}</p>
          <Button
            variant="outline"
            onClick={handleSignOut}
            disabled={signingOut}
            className="mt-3 w-full md:w-auto"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {signingOut ? "Signing out…" : "Sign out"}
          </Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Button variant="outline" onClick={exportAllData} disabled={exporting} className="justify-start">
              <Download className="h-4 w-4 mr-2" /> {exporting ? "Preparing…" : "Export my data (JSON)"}
            </Button>
            <Button variant="destructive" onClick={deleteAccount} disabled={deleting} className="justify-start">
              <Trash2 className="h-4 w-4 mr-2" /> {deleting ? "Deleting…" : "Delete my account"}
            </Button>
          </div>
          <div className="pt-3 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <Link to="/legal/privacy" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><Shield className="h-3 w-3" /> Privacy</Link>
            <Link to="/legal/terms" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><FileTextIcon className="h-3 w-3" /> Terms</Link>
            <Link to="/legal/data-handling" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><Shield className="h-3 w-3" /> Data handling</Link>
            <Link to="/legal/ai-disclosure" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><Shield className="h-3 w-3" /> AI disclosure</Link>
          </div>
        </Card>

        <NotificationPreferences />
        <PasswordSecurity />
        <BetaFeedback />
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
