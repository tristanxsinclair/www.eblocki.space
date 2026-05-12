import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Crosshair, FileSignature, Gavel, Layers, Repeat, Target } from "lucide-react";

const MODES = [
  { code: "LAW_MAX", title: "Law Max", desc: "IRAC, statutory interpretation, AGLC4 precision." },
  { code: "PSYCH_HD", title: "Psych HD", desc: "Concept · Application · Evidence · Evaluation." },
  { code: "SALES_CLOSE", title: "Sales Close", desc: "GSE attachment, AOV, consequence control." },
  { code: "EBLOCKI", title: "Eblocki", desc: "Value → Standard → Behaviour → Proof → Upgrade." },
  { code: "SPORT", title: "Sport", desc: "Striker / false 9 review and training transfer." },
  { code: "BRAND", title: "Brand", desc: "Proof-based identity. Quiet compounding." },
  { code: "CAREER_MONEY", title: "Career / Money", desc: "Decision rule: utility, downside, upside, opp cost." },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="container flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-sm bg-primary flex items-center justify-center text-primary-foreground">
              <Crosshair className="h-4 w-4" />
            </div>
            <span className="font-mono text-sm tracking-[0.25em]">EBLOCKI</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link to="/auth" className="text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground">Sign in</Link>
            <Link to="/auth"><Button size="sm">Start today</Button></Link>
          </nav>
        </div>
      </header>

      <section className="grid-bg border-b border-border">
        <div className="container py-20 md:py-28 max-w-4xl">
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
            Behavioural performance OS
          </span>
          <h1 className="mt-4 text-4xl md:text-6xl font-semibold tracking-tight">
            Convert ambition into <span className="text-primary">measurable proof</span>.
          </h1>
          <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-2xl">
            Eblocki is a behavioural performance OS for study, sales, sport, building, and identity.
            Not another motivation app. A court of evidence for who you say you are becoming.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth"><Button size="lg">Start today's Control Sheet</Button></Link>
            <a href="#loop"><Button size="lg" variant="outline">See the loop</Button></a>
          </div>
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
            {[
              "Proof beats intention",
              "Systems beat motivation",
              "Depth beats aesthetic productivity",
              "Feedback beats ego protection",
            ].map((t) => (
              <div key={t} className="panel p-3 uppercase tracking-wider text-muted-foreground">
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="loop" className="border-b border-border">
        <div className="container py-16 max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-semibold">How the loop works</h2>
          <p className="mt-2 text-muted-foreground">A closed feedback loop. No step is optional.</p>
          <ol className="mt-8 grid md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { i: Target, t: "Check-in" },
              { i: Layers, t: "Mode + state" },
              { i: Crosshair, t: "Next action" },
              { i: FileSignature, t: "Proof Contract" },
              { i: Gavel, t: "Evidence scored" },
              { i: Repeat, t: "Upgrade" },
            ].map(({ i: Icon, t }, idx) => (
              <li key={t} className="panel p-4">
                <div className="font-mono text-[10px] text-muted-foreground">STEP {idx + 1}</div>
                <Icon className="mt-2 h-5 w-5 text-primary" />
                <div className="mt-2 text-sm font-medium">{t}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="container py-16 max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-semibold">Active modes</h2>
          <p className="mt-2 text-muted-foreground">The system routes to the right operating frame automatically.</p>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MODES.map((m) => (
              <Card key={m.code} className="panel p-4">
                <div className="font-mono text-[10px] uppercase tracking-widest text-primary">{m.code}</div>
                <div className="mt-2 text-sm font-medium">{m.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{m.desc}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="container py-16 max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-semibold">The Proof Contract</h2>
          <p className="mt-3 text-muted-foreground">
            Every serious next action triggers a single question:
            <br />
            <span className="text-foreground font-medium">"What proof artifact will confirm completion?"</span>
          </p>
          <p className="mt-4 text-muted-foreground">
            No artifact, no claim. The Court of Evidence keeps the receipts — pending, completed, missed —
            and scores each artifact 1–10 against domain-specific rubrics.
          </p>
          <Link to="/auth" className="inline-block mt-8">
            <Button size="lg">Open the operator dashboard</Button>
          </Link>
        </div>
      </section>

      <footer className="container py-8 text-xs font-mono text-muted-foreground">
        Confidence is the receipt, not the starting point.
      </footer>
    </div>
  );
}
