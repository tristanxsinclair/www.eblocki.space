import { Link } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Seo } from "@/components/Seo";
import { logEvent } from "@/lib/eblocki/analytics";

/**
 * Public philosophy page. Strategic and minimal — not marketing.
 */
export default function Why() {
  useEffect(() => {
    void logEvent("why_viewed");
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title="Why Eblocki | Behavioural operating system"
        description="A behavioural operating system that rewards proof, depth, and consistency over activity."
        path="/why"
      />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-16 space-y-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back
        </Link>

        <header className="space-y-3">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
            <ShieldCheck className="h-3 w-3" /> Why Eblocki
          </span>
          <h1 className="text-3xl sm:text-4xl font-semibold leading-tight">
            A behavioural operating system, not a productivity app.
          </h1>
          <p className="text-base text-muted-foreground">
            Eblocki exists for a narrow user: someone who already knows what to do,
            and is tired of apps that reward looking busy instead of being precise.
          </p>
        </header>

        <Section title="Philosophy">
          We optimise for the only variable that compounds: real artifacts produced
          under resistance. Everything else — streaks, points, notifications — is
          subordinate to that.
        </Section>

        <Section title="The behavioural model">
          Three forces are continuously measured: proof quality, consistency under
          friction, and resistance overcome. Momentum is their weighted product.
          Activity volume is intentionally excluded.
        </Section>

        <Section title="The proof system">
          Every mission must close with a specific artifact and a short reflection:
          what was produced, what made it harder than expected, and the upgrade for
          next time. "Done" is rejected. Reflection is gated, not optional.
        </Section>

        <Section title="Why momentum matters">
          Identity is built by what you defend on hard days. Momentum tracks how
          well you protect the standard when motivation is absent — that is the
          variable that predicts compounding outcomes.
        </Section>

        <Section title="Why reflection exists">
          A completed task without reflection is unprocessed work. Reflection
          forces you to name the friction, isolate the upgrade, and lock in
          evidence — turning execution into learning.
        </Section>

        <Section title="Why shallow productivity is penalised">
          Inflated streaks built on low-quality artifacts are flagged internally and
          surfaced in the weekly retrospective. The system would rather you ship one
          honest IRAC paragraph than ten reorganised note pages.
        </Section>

        <div className="border-t border-border pt-6 flex flex-wrap gap-3">
          <Link
            to="/auth"
            className="inline-flex items-center justify-center h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            Start the loop
          </Link>
          <Link
            to="/legal/privacy"
            className="inline-flex items-center justify-center h-10 px-4 rounded-md border border-border text-sm hover:bg-muted/40"
          >
            How we handle your data
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">{title}</h2>
      <p className="text-sm sm:text-[15px] leading-relaxed text-muted-foreground">{children}</p>
    </section>
  );
}