import { useEffect, useState } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

type AuthDetails = {
  client?: { name?: string; client_name?: string; redirect_uri?: string };
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};

// Beta namespace — cast to a minimal typed shape.
const oauth = (supabase.auth as unknown as {
  oauth: {
    getAuthorizationDetails: (id: string) => Promise<{ data: AuthDetails | null; error: { message: string } | null }>;
    approveAuthorization: (id: string) => Promise<{ data: AuthDetails | null; error: { message: string } | null }>;
    denyAuthorization: (id: string) => Promise<{ data: AuthDetails | null; error: { message: string } | null }>;
  };
}).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const { user, loading } = useAuth();
  const [details, setDetails] = useState<AuthDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !user || !authorizationId) return;
    let active = true;
    (async () => {
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [loading, user, authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  if (!authorizationId) {
    return (
      <main className="min-h-screen grid-bg flex items-center justify-center p-6">
        <Card className="panel p-6 max-w-sm w-full text-sm">Missing authorization_id.</Card>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-muted-foreground font-mono text-xs">
        Loading…
      </main>
    );
  }

  if (!user) {
    const next = window.location.pathname + window.location.search;
    return <Navigate to="/auth" replace state={{ from: next }} />;
  }

  if (error) {
    return (
      <main className="min-h-screen grid-bg flex items-center justify-center p-6">
        <Card className="panel p-6 max-w-sm w-full text-sm">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Authorization error</p>
          <p>{error}</p>
        </Card>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center text-muted-foreground font-mono text-xs">
        Loading authorization…
      </main>
    );
  }

  const clientName = details.client?.name ?? details.client?.client_name ?? "an app";

  return (
    <main className="min-h-screen grid-bg flex items-center justify-center p-6">
      <Card className="panel p-6 max-w-sm w-full space-y-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Connect</p>
          <h1 className="text-lg mt-1">Connect {clientName} to Eblocki</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {clientName} will be able to call Eblocki's enabled tools while you are signed in.
        </p>
        <p className="text-xs text-muted-foreground font-mono">
          Signed in as {user.email ?? user.id}
        </p>
        <p className="text-xs text-muted-foreground">
          This does not bypass Eblocki's permissions or backend policies.
        </p>
        <div className="flex gap-2">
          <Button type="button" disabled={busy} onClick={() => decide(true)} className="flex-1">
            {busy ? "…" : "Approve"}
          </Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => decide(false)} className="flex-1">
            Cancel
          </Button>
        </div>
      </Card>
    </main>
  );
}