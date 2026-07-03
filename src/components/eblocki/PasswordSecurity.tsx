import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock } from "lucide-react";

export function PasswordSecurity() {
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const email = user?.email ?? "";
  const hasEmailIdentity = useMemo(() => {
    const identities = (user as any)?.identities as Array<{ provider?: string }> | undefined;
    if (identities && identities.length > 0) {
      return identities.some((i) => i.provider === "email");
    }
    // Fallback: if we at least have an email, allow attempt.
    return !!email;
  }, [user, email]);

  const validate = (): string | null => {
    if (!current) return "Enter your current password.";
    if (next.length < 8) return "New password must be at least 8 characters.";
    if (next !== confirm) return "New password and confirmation do not match.";
    if (next === current) return "New password must be different from current password.";
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const v = validate();
    if (v) { setErr(v); return; }
    if (!email) { setErr("No email on this account. Use password reset by email."); return; }
    setBusy(true);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: current });
      if (signInErr) {
        setErr("Current password is incorrect.");
        return;
      }
      const { error: updErr } = await supabase.auth.updateUser({ password: next });
      if (updErr) {
        setErr("Password update failed. Try again.");
        return;
      }
      setCurrent(""); setNext(""); setConfirm("");
      toast.success("Password updated.");
    } catch {
      setErr("Password update failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async () => {
    if (!email) {
      toast.error("No email on this account.");
      return;
    }
    setResetBusy(true);
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      toast.success("Password reset email sent if this email exists.");
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <Card className="panel p-4 md:p-5 space-y-4 max-w-full overflow-hidden">
      <div className="min-w-0">
        <span className="font-mono text-[10px] uppercase tracking-widest text-primary inline-flex items-center gap-1">
          <Lock className="h-3 w-3" /> Password & Security
        </span>
        <h2 className="text-xl font-semibold mt-2 break-words">Password & Security</h2>
        <p className="text-sm text-muted-foreground mt-1 break-words">
          Update your password. Keep your account protected.
        </p>
      </div>

      {!hasEmailIdentity && (
        <p className="text-xs text-muted-foreground border border-border rounded-sm p-3 break-words">
          This account may use a social login. Use password reset by email if you want to set or recover a password.
        </p>
      )}

      <form onSubmit={submit} className="grid gap-3 max-w-full min-w-0">
        <div className="min-w-0">
          <Label htmlFor="pw-current">Current password</Label>
          <Input id="pw-current" type="password" autoComplete="current-password" className="w-full max-w-full"
            value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div className="min-w-0">
          <Label htmlFor="pw-new">New password</Label>
          <Input id="pw-new" type="password" autoComplete="new-password" minLength={8} className="w-full max-w-full"
            value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
        <div className="min-w-0">
          <Label htmlFor="pw-confirm">Confirm new password</Label>
          <Input id="pw-confirm" type="password" autoComplete="new-password" minLength={8} className="w-full max-w-full"
            value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {err && <p className="text-xs text-destructive font-mono break-words" role="alert">{err}</p>}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button type="submit" disabled={busy} className="w-full sm:w-auto">
            {busy ? "Updating…" : "Update password"}
          </Button>
          <Button type="button" variant="outline" onClick={sendReset} disabled={resetBusy || !email} className="w-full sm:w-auto">
            {resetBusy ? "Sending…" : "Send reset email"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default PasswordSecurity;