import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Crown, Mail, Check } from "lucide-react";
import { Seo } from "@/components/Seo";
import { useAuth } from "@/hooks/useAuth";

const CRITERIA = [
  "You've submitted at least 7 days of real proof.",
  "You want a direct line to the founder to shape the product.",
  "You're building something that compounds — not chasing hype.",
  "You commit to weekly proof for at least 90 days.",
];

const BENEFITS = [
  "Lifetime Eblocki access — Pro + everything ever built.",
  "Priority feedback channel with the founder.",
  "Early access to experimental intelligence features.",
  "Named credit in the Founder ledger.",
];

export default function Founder() {
  const { user } = useAuth();

  const subject = encodeURIComponent("Founder Access Application");
  const body = encodeURIComponent(
    [
      "Name:",
      `Eblocki account email: ${user?.email ?? ""}`,
      "Current proof streak (days):",
      "Domain you're building proof in:",
      "Why Founder (2–3 sentences):",
      "90-day commitment (yes/no):",
      "",
      "— sent from eblocki.space/founder",
    ].join("\n"),
  );
  const mailto = `mailto:admin@eblocki.space?subject=${subject}&body=${body}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title="Founder Access — Eblocki"
        description="Founder is application-only, limited seats, lifetime access. Apply via admin@eblocki.space."
        path="/founder"
      />
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="font-mono text-sm tracking-tight">Eblocki</Link>
        <Link to="/pricing" className="font-mono text-xs text-muted-foreground hover:text-foreground">
          ← Back to pricing
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <Crown className="h-8 w-8 text-primary mx-auto mb-4" />
          <h1 className="text-3xl md:text-4xl font-mono tracking-tight mb-3">Founder Access</h1>
          <p className="text-muted-foreground">
            Limited seats. Application-only. Lifetime access to every Eblocki system.
          </p>
        </div>

        <section className="rounded-lg border border-border/60 bg-card p-6 mb-6">
          <h2 className="font-mono text-sm uppercase tracking-widest text-primary mb-4">What you get</h2>
          <ul className="space-y-2">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-border/60 bg-card p-6 mb-8">
          <h2 className="font-mono text-sm uppercase tracking-widest text-primary mb-4">Who this is for</h2>
          <ul className="space-y-2">
            {CRITERIA.map((c) => (
              <li key={c} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-3">
          <Button asChild size="lg" className="font-mono">
            <a href={mailto}>
              <Mail className="h-4 w-4 mr-2" />
              Apply via email
            </a>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            We reply within 48 hours. If accepted, Founder access is granted manually to your account —
            no payment link, no fine print. Just proof.
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground/60 mt-12 font-mono">
          admin@eblocki.space
        </p>
      </main>
    </div>
  );
}