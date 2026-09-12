import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/Seo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { logEvent } from "@/lib/eblocki/analytics";
import { EblockiLogo } from "@/components/eblocki/EblockiLogo";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string") return maybeMessage;
  }
  return fallback;
}

export default function Auth() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const redirectTo = useMemo(() => {
    const from = (location.state as { from?: unknown } | null)?.from;
    if (typeof from !== "string" || !from.startsWith("/")) return "/dashboard";
    return from;
  }, [location.state]);

  useEffect(() => {
    if (!loading && user) nav(redirectTo, { replace: true });
  }, [user, loading, nav, redirectTo]);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + redirectTo },
        });
        if (error) throw error;
        await logEvent("activation_auth_completed", { route: redirectTo, source: "signup" });
        toast.success("Account created. Check your email if confirmation is required, or sign in.");
        setMode("signin");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await logEvent(
          "activation_auth_completed",
          { route: redirectTo, source: "signin" },
          data.user?.id ?? data.session?.user?.id ?? null,
          data.session?.access_token ?? null,
        );
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Auth failed"));
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
    <div className="student-app min-h-screen-safe flex items-center justify-center px-6 py-12 safe-y">
      <Seo
        title={showForgot ? "Reset password | EBLOCKI" : "Sign in | EBLOCKI"}
        description="Sign in to your EBLOCKI student proof system — coach, plan, and Proof Check."
        path="/auth"
      />
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 mb-6 justify-center">
          <EblockiLogo variant="compact" size="lg" />
        </Link>
        <div className="py-6">
          {showForgot ? (
            <>
              <h1 className="text-2xl font-semibold">Reset password</h1>
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
              <h1 className="text-2xl font-semibold">
                {mode === "signin" ? "Welcome back" : "Create your account"}
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{mode === "signin" ? "Your day, your goals, your next step." : "A little more focus for your student day."}</p>
              <form onSubmit={handle} className="mt-5 space-y-3">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" autoComplete="email" autoCapitalize="none" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
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
              <div className="mt-6 flex justify-center gap-5 text-xs text-muted-foreground"><Link to="/legal/privacy">Privacy</Link><Link to="/legal/terms">Terms</Link></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
