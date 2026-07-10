import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Bell, BellOff } from "lucide-react";
import { InfoTip } from "@/components/eblocki/InfoTip";

type Prefs = {
  notifications_enabled: boolean;
  streak_rescue: boolean;
  depth_nudge: boolean;
  recovery_reminder: boolean;
  milestone: boolean;
  coach_prompt: boolean;
  quiet_hours_start: number;
  quiet_hours_end: number;
};

const DEFAULTS: Prefs = {
  notifications_enabled: true,
  streak_rescue: true,
  depth_nudge: true,
  recovery_reminder: true,
  milestone: true,
  coach_prompt: true,
  quiet_hours_start: 22,
  quiet_hours_end: 9,
};

const KIND_COPY: Record<keyof Omit<Prefs, "notifications_enabled" | "quiet_hours_start" | "quiet_hours_end">, { label: string; example: string }> = {
  streak_rescue:     { label: "Streak rescue",   example: "Momentum is at risk — one valid proof preserves your 4-day streak." },
  depth_nudge:       { label: "Depth nudge",     example: "Consistency is stable. Convert today into one deeper proof." },
  recovery_reminder: { label: "Recovery reminder", example: "Recovery day. Reduce scope. One real proof preserves continuity." },
  milestone:         { label: "Milestone",       example: "Freeze token earned. Defend the pattern with one early proof tomorrow." },
  coach_prompt:      { label: "Coach insight",   example: "Your coach surfaced a pattern in your reflections — open to review." },
};

export function NotificationPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [tz, setTz] = useState<{ timezone: string; source: string; updated: string | null } | null>(null);
  const [lastNotif, setLastNotif] = useState<{ sent_at: string; kind: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: prof }, { data: lastN }] = await Promise.all([
        supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_onboarding_profiles").select("timezone, timezone_source, timezone_updated_at").eq("user_id", user.id).maybeSingle(),
        supabase.from("notification_log").select("sent_at, kind").eq("user_id", user.id).order("sent_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (p) setPrefs({ ...DEFAULTS, ...p });
      if (prof) setTz({ timezone: prof.timezone ?? "UTC", source: prof.timezone_source ?? "default", updated: prof.timezone_updated_at ?? null });
      if (lastN) setLastNotif({ sent_at: lastN.sent_at, kind: lastN.kind });
      setLoading(false);
    })();
  }, [user]);

  const save = async (next: Prefs) => {
    if (!user) return;
    setPrefs(next);
    setSaving(true);
    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast.error(error.message);
  };

  const overrideTzManual = async () => {
    if (!user) return;
    let browserTz = "UTC";
    try { browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch {}
    const { error } = await supabase.from("user_onboarding_profiles").upsert({
      user_id: user.id,
      timezone: browserTz,
      timezone_source: "manual",
      timezone_updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) return toast.error(error.message);
    setTz({ timezone: browserTz, source: "manual", updated: new Date().toISOString() });
    toast.success(`Timezone locked to ${browserTz}.`);
  };

  if (loading) return null;

  return (
    <Card className="panel p-5 space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {prefs.notifications_enabled
              ? <Bell className="h-4 w-4 text-primary" />
              : <BellOff className="h-4 w-4 text-muted-foreground" />}
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-primary">Notifications</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground max-w-md">
            Strategic and calm by design. Max 3 per day, 4h apart, never during your quiet hours.
            Every notification cites a real behavioural signal — no fake urgency, no guilt framing.
          </p>
        </div>
        <Switch
          checked={prefs.notifications_enabled}
          onCheckedChange={(v) => save({ ...prefs, notifications_enabled: v })}
          disabled={saving}
        />
      </header>

      <div className={prefs.notifications_enabled ? "space-y-3" : "space-y-3 opacity-50 pointer-events-none"}>
        {(Object.keys(KIND_COPY) as (keyof typeof KIND_COPY)[]).map((k) => (
          <div key={k} className="rounded-sm border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm font-medium">{KIND_COPY[k].label}</Label>
              <Switch checked={(prefs as any)[k]} onCheckedChange={(v) => save({ ...prefs, [k]: v } as Prefs)} disabled={saving} />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground italic">
              Example: "{KIND_COPY[k].example}"
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-sm border border-border p-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Quiet hours</span>
          <InfoTip>
            No notifications between these hours, local time. Crosses midnight automatically (e.g. 22 → 9 means 10pm to 9am).
          </InfoTip>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <label className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground text-xs">Start</span>
            <select
              className="bg-background border border-border rounded-sm px-2 py-1 text-sm"
              value={prefs.quiet_hours_start}
              onChange={(e) => save({ ...prefs, quiet_hours_start: parseInt(e.target.value, 10) })}
              disabled={saving}
            >
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{h.toString().padStart(2, "0")}:00</option>)}
            </select>
          </label>
          <label className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground text-xs">End</span>
            <select
              className="bg-background border border-border rounded-sm px-2 py-1 text-sm"
              value={prefs.quiet_hours_end}
              onChange={(e) => save({ ...prefs, quiet_hours_end: parseInt(e.target.value, 10) })}
              disabled={saving}
            >
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{h.toString().padStart(2, "0")}:00</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-sm border border-border p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Timezone</div>
            <div className="text-sm">{tz?.timezone ?? "UTC"} <span className="text-muted-foreground text-[11px]">({tz?.source ?? "default"})</span></div>
          </div>
          <Button size="sm" variant="outline" onClick={overrideTzManual}>Use this device's zone</Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Auto-detected from your browser. Manual override locks it across devices.
        </p>
      </div>

      <div className="text-[11px] text-muted-foreground">
        Last notification:{" "}
        {lastNotif
          ? <><span className="text-foreground">{lastNotif.kind}</span> · {new Date(lastNotif.sent_at).toLocaleString()}</>
          : <span className="italic">none yet</span>}
      </div>
    </Card>
  );
}
