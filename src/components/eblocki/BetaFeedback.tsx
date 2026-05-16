import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";
import { logEvent } from "@/lib/eblocki/analytics";

type Kind = "friction" | "confusing" | "feature_request" | "behaviour_inaccurate";

const KINDS: { id: Kind; label: string }[] = [
  { id: "friction", label: "Report friction" },
  { id: "confusing", label: "Confusing feature" },
  { id: "feature_request", label: "Feature request" },
  { id: "behaviour_inaccurate", label: "Behaviour felt inaccurate" },
];

export function BetaFeedback() {
  const { user } = useAuth();
  const location = useLocation();
  const [kind, setKind] = useState<Kind>("friction");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) return;
    const text = body.trim();
    if (text.length < 10) {
      toast.error("Add a sentence or two so it is useful.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("beta_feedback").insert({
        user_id: user.id,
        kind,
        body: text.slice(0, 4000),
        route: location.pathname,
      });
      if (error) throw error;
      void logEvent("feedback_submitted", { kind, route: location.pathname });
      toast.success("Thanks. Logged for tuning.");
      setBody("");
    } catch (e: any) {
      toast.error(e?.message || "Could not save feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="panel p-5 space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Beta feedback</span>
      </div>
      <h2 className="text-xl font-semibold">Tell us what is off.</h2>
      <p className="text-sm text-muted-foreground">
        Closed beta. Short, specific reports help us tune behavioural accuracy.
      </p>
      <div className="flex flex-wrap gap-1.5 pt-1">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setKind(k.id)}
            className={cn(
              "text-[11px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-sm border transition-all",
              kind === k.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {k.label}
          </button>
        ))}
      </div>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="What happened, where, and what you expected instead."
        className="text-sm"
      />
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          {body.length}/4000
        </span>
        <Button size="sm" onClick={submit} disabled={submitting}>
          {submitting ? "Sending…" : "Send"}
        </Button>
      </div>
    </Card>
  );
}