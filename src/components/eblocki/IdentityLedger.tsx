import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, ArrowUpRight } from "lucide-react";

interface LedgerRow {
  id: string;
  domain: string;
  kind: string;
  summary: string;
  verdict: string | null;
  created_at: string;
}

export function IdentityLedger({ userId, limit = 25 }: { userId: string; limit?: number }) {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("identity_ledger")
        .select("id, domain, kind, summary, verdict, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!cancelled) {
        setRows(((data as any[]) || []) as LedgerRow[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, limit]);

  if (loading) {
    return <div className="font-mono text-xs text-muted-foreground">Loading ledger…</div>;
  }
  if (rows.length === 0) {
    return (
      <div className="font-mono text-xs text-muted-foreground border border-dashed border-border rounded-sm p-4">
        The court has no recorded evidence. Submit one artifact to begin.
      </div>
    );
  }

  return (
    <ol className="space-y-2">
      {rows.map((r) => {
        const Icon = r.kind === "rejection" ? XCircle : r.kind === "escalation" ? ArrowUpRight : CheckCircle2;
        const tone =
          r.kind === "rejection"
            ? "text-destructive border-destructive/30"
            : r.kind === "escalation"
              ? "text-primary border-primary/30"
              : "text-accent border-accent/30";
        const verdictLabel = (r.verdict ?? "").replace(/_/g, " ");
        const isLong = (r.summary ?? "").length > 180;
        const isOpen = !!expanded[r.id];
        const summaryText = !isLong || isOpen ? r.summary : r.summary.slice(0, 180).trimEnd() + "…";
        return (
          <li
            key={r.id}
            className={cn("border rounded-sm bg-card/40 px-3 py-2 flex items-start gap-2.5", tone)}
          >
            <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              {verdictLabel && (
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary mb-1">
                  Verdict: {verdictLabel} · {r.domain}
                </div>
              )}
              <div className="font-mono text-xs text-foreground break-words">{summaryText}</div>
              {isLong && (
                <button
                  type="button"
                  onClick={() => setExpanded((prev) => ({ ...prev, [r.id]: !isOpen }))}
                  className="mt-1 font-mono text-[10px] uppercase tracking-widest text-primary hover:underline"
                >
                  {isOpen ? "Hide full evidence" : "Show full evidence"}
                </button>
              )}
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">
                {new Date(r.created_at).toLocaleString()} · {r.domain}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}