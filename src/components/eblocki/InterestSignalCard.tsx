import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, DollarSign, Sparkles } from "lucide-react";
import { logEvent } from "@/lib/eblocki/analytics";
import {
  getInterestSignalDecision,
  type InterestSignalRecord,
} from "@/lib/eblocki/interest-signals";

type SignalType = "pro_waitlist" | "founder_waitlist" | "would_pay";

const HYPOTHESES: Record<SignalType, { label: string; hint: string; priceCents: number | null }> = {
  pro_waitlist:     { label: "Pro waitlist",      hint: "Hypothesis: AUD $9 / month", priceCents: 900 },
  founder_waitlist: { label: "Founder Access",    hint: "Hypothesis: AUD $99 one-time", priceCents: 9900 },
  would_pay:        { label: "I'd pay for this",  hint: "Tell us your price",            priceCents: null },
};

const LOCAL_SIGNAL_GUARD_KEY = "eblocki_interest_signal_guard_v1";
const DUPLICATE_MESSAGE = "Already captured. Change the price/note or try again later if your intent has changed.";

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readLocalInterestSignals(): InterestSignalRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(LOCAL_SIGNAL_GUARD_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === "object") : [];
  } catch {
    return [];
  }
}

function writeLocalInterestSignal(signal: InterestSignalRecord) {
  if (typeof window === "undefined") return;

  try {
    const recent = readLocalInterestSignals();
    window.localStorage.setItem(
      LOCAL_SIGNAL_GUARD_KEY,
      JSON.stringify([signal, ...recent].slice(0, 20)),
    );
  } catch {
    // localStorage is a best-effort anonymous guard only.
  }
}

/**
 * Payment-intent + waitlist signal capture.
 * Writes to interest_signals. RLS enforces user ownership for authenticated reads.
 * Honest copy: this collects interest, it does not charge.
 */
export function InterestSignalCard() {
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState<Set<SignalType>>(new Set());
  const [openForm, setOpenForm] = useState<SignalType | null>(null);
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastDecisionMessage, setLastDecisionMessage] = useState<string | null>(null);

  const busy = isChecking || isSubmitting;

  useEffect(() => {
    if (!user) {
      setSubmitted(new Set());
      return;
    }

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("interest_signals")
        .select("signal_type")
        .eq("user_id", user.id)
        .in("signal_type", ["pro_waitlist", "founder_waitlist", "would_pay"])
        .order("created_at", { ascending: false })
        .limit(20);
      if (cancelled || !data) return;
      setSubmitted(new Set(data.map((r) => r.signal_type as SignalType)));
    })();
    return () => { cancelled = true; };
  }, [user]);

  const submit = async (type: SignalType) => {
    if (busy) return;

    const anonymousEmail = user ? null : normaliseEmail(email);
    if (!user && !anonymousEmail) {
      setLastDecisionMessage("Enter an email so we can record this intent signal.");
      return;
    }

    const parsedPrice = type === "would_pay" && price.trim()
      ? Math.round(Number.parseFloat(price) * 100)
      : HYPOTHESES[type].priceCents;
    const priceCents = Number.isFinite(parsedPrice as number) ? parsedPrice : null;
    const trimmedNote = note.slice(0, 500).trim() || null;
    const createdAt = new Date().toISOString();
    const candidate: InterestSignalRecord = {
      signal_type: type,
      user_id: user?.id ?? null,
      email: anonymousEmail,
      preferred_price_cents: priceCents,
      note: trimmedNote,
      created_at: createdAt,
    };

    setLastDecisionMessage(null);
    setIsChecking(true);

    try {
      let recentSignals: InterestSignalRecord[] = [];

      if (user) {
        const { data } = await supabase
          .from("interest_signals")
          .select("signal_type,user_id,email,preferred_price_cents,note,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);

        recentSignals = data ?? [];
      } else {
        recentSignals = readLocalInterestSignals();
      }

      const decision = getInterestSignalDecision({
        candidate,
        recentSignals,
        now: createdAt,
      });

      if (!decision.allowed) {
        setLastDecisionMessage(decision.message ?? DUPLICATE_MESSAGE);
        return;
      }
    } finally {
      setIsChecking(false);
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("interest_signals").insert({
        user_id: user?.id ?? null,
        email: anonymousEmail,
        signal_type: type,
        preferred_price_cents: priceCents,
        currency: "AUD",
        note: trimmedNote,
        source: "dashboard_interest_card",
      });

      if (error) {
        setLastDecisionMessage("Could not record this signal. Try again in a moment.");
        return;
      }

      if (!user) writeLocalInterestSignal(candidate);

      setSubmitted((s) => new Set(s).add(type));
      setOpenForm(null);
      setPrice("");
      setNote("");
      setLastDecisionMessage(null);
      logEvent("upgrade_clicked", { outcome: type });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="panel p-4 md:p-5 border-border/80 bg-card/50">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Beta - signal interest, no charge yet
        </span>
      </div>
      <h3 className="mt-2 text-base font-semibold">Help us price Eblocki.</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Free beta is real. Pro and Founder Access are hypotheses. Tap what you'd actually pay for.
      </p>

      <div className="mt-3 grid sm:grid-cols-3 gap-2">
        {(Object.keys(HYPOTHESES) as SignalType[]).map((type) => {
          const done = submitted.has(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => {
                if (busy) return;
                setLastDecisionMessage(null);
                setOpenForm(openForm === type ? null : type);
              }}
              className={`text-left rounded-sm border p-3 transition-colors ${
                done ? "border-primary/60 bg-primary/10"
                     : openForm === type ? "border-primary bg-primary/5"
                     : "border-border hover:border-primary/40"
              }`}
              disabled={busy}
            >
              <div className="flex items-center gap-1.5 text-sm font-medium">
                {done && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                {HYPOTHESES[type].label}
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {done ? "Recorded - can update intent" : HYPOTHESES[type].hint}
              </div>
            </button>
          );
        })}
      </div>

      {openForm && (
        <div className="mt-3 space-y-2 rounded-sm border border-border bg-background/40 p-3">
          {!user && (
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Email
              </label>
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setLastDecisionMessage(null);
                }}
                placeholder="you@example.com"
                className="mt-1 h-8"
              />
            </div>
          )}
          {openForm === "would_pay" && (
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Preferred price (AUD)
              </label>
              <div className="mt-1 flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 7"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setLastDecisionMessage(null);
                  }}
                  className="h-8"
                />
              </div>
            </div>
          )}
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              What would make it worth paying? (optional)
            </label>
            <Textarea
              rows={2}
              maxLength={500}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setLastDecisionMessage(null);
              }}
              placeholder="One sentence is enough."
              className="mt-1"
            />
          </div>
          {lastDecisionMessage && (
            <p className="text-xs text-muted-foreground" role="status">
              {lastDecisionMessage}
            </p>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => submit(openForm)} disabled={busy}>
              {isChecking ? "Checking..." : isSubmitting ? "Recording..." : "Record signal"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpenForm(null)} disabled={busy}>Cancel</Button>
          </div>
        </div>
      )}

      <p className="mt-3 text-[11px] text-muted-foreground border-t border-border pt-2">
        Signals shape the roadmap. No card, no charge. You can ignore this.
      </p>
    </Card>
  );
}
