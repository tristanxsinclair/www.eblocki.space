import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/Seo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Crosshair } from "lucide-react";

export default function Auth() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) nav("/dashboard", { replace: true });
  }, [user, loading, nav]);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;
        toast.success("Account created. Check your email if confirmation is required, or sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message ?? "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError("Enter your email address.");
      return;
    }
    setForgotBusy(true);
    setForgotError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) throw error;
      setForgotSent(true);
    } catch {
      setForgotError("Could not send reset email. Try again.");
    } finally {
      setForgotBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center p-6">
      <Seo
        title={showForgot ? "Reset password | EBLOCKI" : "Sign in | EBLOCKI"}
        description="Sign in to your EBLOCKI behavioural performance OS — coach, control sheet, and Court of Evidence."
        path="/auth"
      />
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 mb-6 justify-center">
          <div className="h-8 w-8 rounded-sm bg-primary flex items-center justify-center text-primary-foreground">
            <Crosshair className="h-5 w-5" />
          </div>
          <span className="font-mono text-base tracking-[0.25em]">EBLOCKI</span>
        </Link>
        <Card className="panel p-6">
          {showForgot ? (
            <>
              <h1 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Reset password</h1>
              <p className="mt-1 text-sm">Enter your email and we’ll send you a reset link.</p>
              {forgotSent ? (
                <div className="mt-5 space-y-3">
                  <p className="text-sm text-muted-foreground font-mono">
                    Password reset email sent if this email exists.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setShowForgot(false);
                      setForgotSent(false);
                      setForgotError(null);
                      setForgotEmail("");
                    }}
                  >
                    Back to login
                  </Button>
                </div>
              ) : (
                <form onSubmit={sendReset} className="mt-5 space-y-3" noValidate>
                  <div>
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>
                  {forgotError && (
                    <p className="text-xs text-destructive font-mono" role="alert">{forgotError}</p>
                  )}
                  <Button type="submit" disabled={forgotBusy} className="w-full">
                    {forgotBusy ? "Sending…" : "Send reset email"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-xs font-mono"
                    onClick={() => {
                      setShowForgot(false);
                      setForgotError(null);
                      setForgotEmail("");
                    }}
                  >
                    Back to login
                  </Button>
                </form>
              )}
            </>
          ) : (
            <>
              <h1 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {mode === "signin" ? "Sign in" : "Create operator account"}
              </h1>
              <p className="mt-1 text-sm">Convert ambition into measurable proof.</p>
              <form onSubmit={handle} className="mt-5 space-y-3">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={busy} className="w-full">
                  {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
                </Button>
              </form>
              <button
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="mt-4 w-full text-xs text-muted-foreground hover:text-foreground font-mono"
              >
                {mode === "signin" ? "No account? Create one." : "Have an account? Sign in."}
              </button>
              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground font-mono"
                >
                  Forgot password?
                </button>
              )}
              <p className="mt-4 text-[10px] text-muted-foreground font-mono">
                Google sign-in available via Cloud auth settings.
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
