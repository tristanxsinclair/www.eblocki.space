import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Seo } from "@/components/Seo";
import { toast } from "sonner";
import { Crosshair } from "lucide-react";

export default function ResetPassword() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (next.length < 8) { setErr("New password must be at least 8 characters."); return; }
    if (next !== confirm) { setErr("Passwords do not match."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) { setErr("Password update failed. Try again."); return; }
      toast.success("Password updated.");
      setNext(""); setConfirm("");
      nav("/dashboard", { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center p-6">
      <Seo title="Reset password | EBLOCKI" description="Set a new password for your EBLOCKI account." path="/reset-password" />
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 mb-6 justify-center">
          <div className="h-8 w-8 rounded-sm bg-primary flex items-center justify-center text-primary-foreground">
            <Crosshair className="h-5 w-5" />
          </div>
          <span className="font-mono text-base tracking-[0.25em]">EBLOCKI</span>
        </Link>
        <Card className="panel p-6">
          <h1 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Reset password</h1>
          <p className="mt-1 text-sm">Set a new password. Keep your account protected.</p>
          {!ready ? (
            <p className="mt-4 text-xs text-muted-foreground font-mono">
              Open the reset link from your email to continue. If you arrived here directly, request a new reset email from the sign-in page.
            </p>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-3">
              <div>
                <Label htmlFor="rp-new">New password</Label>
                <Input id="rp-new" type="password" minLength={8} autoComplete="new-password"
                  required value={next} onChange={(e) => setNext(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="rp-confirm">Confirm new password</Label>
                <Input id="rp-confirm" type="password" minLength={8} autoComplete="new-password"
                  required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              {err && <p className="text-xs text-destructive font-mono" role="alert">{err}</p>}
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? "Updating…" : "Update password"}
              </Button>
            </form>
          )}
          <Link to="/auth" className="mt-4 block text-xs text-muted-foreground hover:text-foreground font-mono text-center">
            Back to sign in
          </Link>
        </Card>
      </div>
    </div>
  );
}