import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Seo } from "@/components/Seo";
import {
  ArrowRight,
  CheckCircle2,
  Crosshair,
  Flame,
  Gavel,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";

const STEPS = [
  {
    icon: Target,
    label: "Step 1",
    title: "Submit proof",
    body:
      "Each day, submit one piece of evidence from study, work, gym, football, business, sales, or another serious goal.",
  },
  {
    icon: Gavel,
    label: "Step 2",
    title: "Get a verdict",
    body:
      "Your proof is rated as weak, useful, strong, or elite. No fake productivity. No vague hype.",
  },
  {
    icon: ArrowRight,
    label: "Step 3",
    title: "Correct the next move",
    body: "You get a simple next action so tomorrow is sharper than today.",
  },
];

const SCALE = [
  {
    title: "Weak Proof",
    body: "You said something, but the action is unclear or too soft to count.",
    accent: "text-evidence-weak",
  },
  {
    title: "Useful Proof",
    body: "Action happened, but it needs a clearer result or stronger next step.",
    accent: "text-evidence-moderate",
  },
  {
    title: "Strong Proof",
    body: "Clear effort, clear outcome, and a next move that can compound.",
    accent: "text-evidence-strong",
  },
  {
    title: "Elite Proof",
    body: "Repeatable evidence that shows real progress, not just activity.",
    accent: "text-evidence-elite",
  },
];

const FOR_YOU = [
  "You study but still feel inconsistent.",
  "You make plans but do not always execute.",
  "You want proof instead of motivation.",
  "You want your effort judged honestly.",
  "You are building a better version of yourself but need evidence.",
];

const WHAT_YOU_GET = [
  "7 days of daily proof submission.",
  "Simple proof verdicts.",
  "Correction commands.",
  "A final Proof Week report.",
  "One feedback loop that shows where effort is leaking.",
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title="Eblocki Proof Week Beta"
        description="Build proof for 7 days. Submit one real action each day, get a verdict, and see what your effort actually proves."
        path="/"
      />

      <header className="border-b border-border bg-background/95 backdrop-blur safe-top safe-x">
        <div className="container flex flex-wrap items-center justify-between gap-3 py-4">
          <Link to="/" className="flex items-center gap-2 native-tap">
            <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-primary-foreground">
              <Crosshair className="h-4 w-4" />
            </div>
            <span className="font-mono text-sm tracking-[0.25em]">EBLOCKI</span>
          </Link>
          <nav className="flex items-center gap-3">
            <a
              href="#how-it-works"
              className="hidden text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground sm:inline-flex"
            >
              How it works
            </a>
            <a
              href="#join"
              className="hidden text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground sm:inline-flex"
            >
              Join beta
            </a>
            <Link to="/auth" className="text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="grid-bg border-b border-border">
          <div className="container grid gap-10 py-14 md:grid-cols-[minmax(0,1fr)_minmax(320px,0.82fr)] md:items-center md:py-20 lg:py-24">
            <div className="max-w-3xl">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
                Eblocki Proof Week Beta
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
                Stop calling plans progress.
                <br />
                Build proof for 7 days.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                Eblocki is a proof-based execution system for students and young operators who want evidence, not motivation. Submit one real action each day. Get a verdict. See what your effort actually proves.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#join" className="inline-flex">
                  <Button size="lg">
                    Join the 7-Day Beta
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>
                <a href="#how-it-works" className="inline-flex">
                  <Button size="lg" variant="outline">See How It Works</Button>
                </a>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Free beta. Limited to 5-10 testers. Honest feedback required.
              </p>
              <div className="mt-8 grid gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground sm:grid-cols-3">
                <ProofLaw label="One real action" />
                <ProofLaw label="One honest verdict" />
                <ProofLaw label="One sharper next move" />
              </div>
            </div>
            <HeroPreview />
          </div>
        </section>

        <section id="how-it-works" className="border-b border-border">
          <div className="container py-14 md:py-16">
            <div className="max-w-2xl">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">How it works</div>
              <h2 className="mt-2 text-2xl font-semibold md:text-3xl">A simple loop built around evidence.</h2>
            </div>
            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {STEPS.map(({ icon: Icon, label, title, body }) => (
                <Card key={title} className="panel p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="container py-14 md:py-16">
            <div className="max-w-2xl">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">The Proof Scale</div>
              <h2 className="mt-2 text-2xl font-semibold md:text-3xl">See what your effort actually proves.</h2>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {SCALE.map((item) => (
                <Card key={item.title} className="panel p-5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`h-4 w-4 ${item.accent}`} />
                    <h3 className="font-semibold">{item.title}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.body}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="container grid gap-6 py-14 md:grid-cols-2 md:py-16">
            <Card className="panel p-6 sm:p-8">
              <h2 className="text-2xl font-semibold">This is for you if</h2>
              <ul className="mt-5 space-y-3 text-sm leading-6 text-muted-foreground">
                {FOR_YOU.map((item) => (
                  <li key={item} className="flex gap-3">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="panel p-6 sm:p-8">
              <h2 className="text-2xl font-semibold">What you get</h2>
              <ul className="mt-5 space-y-3 text-sm leading-6 text-muted-foreground">
                {WHAT_YOU_GET.map((item) => (
                  <li key={item} className="flex gap-3">
                    <Sparkles className="mt-1 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </section>

        <section id="join" className="container py-14 md:py-16">
          <Card className="panel overflow-hidden border-primary/30 bg-primary/10">
            <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_320px] md:items-center">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Join the beta</div>
                <h2 className="mt-2 text-3xl font-semibold">Build proof with us for one week.</h2>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-foreground/85">
                  The beta is free. You submit one proof update per day for 7 days. In return, you give honest feedback at the end.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a href="https://www.instagram.com/eblocki" target="_blank" rel="noreferrer" className="inline-flex">
                    <Button size="lg" className="panel-glow">
                      Message Eblocki
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </a>
                  <a href="#how-it-works" className="inline-flex">
                    <Button size="lg" variant="outline">Read the loop first</Button>
                  </a>
                </div>
              </div>

              <div className="rounded-md border border-border bg-background/80 p-5">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <Flame className="h-3.5 w-3.5 text-primary" />
                  Message to join
                </div>
                <p className="mt-4 text-2xl font-semibold">&quot;Proof Week&quot;</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Send this to Eblocki on Instagram or reply to the person who sent you the beta link.
                </p>
              </div>
            </div>
          </Card>
        </section>
      </main>

      <footer className="container border-t border-border py-8 text-xs font-mono uppercase tracking-wider text-muted-foreground">
        Proof beats motivation.
      </footer>
    </div>
  );
}

function HeroPreview() {
  return (
    <Card className="panel relative overflow-hidden border-primary/30 bg-card/70 shadow-2xl shadow-primary/5">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Proof Week</div>
        <span className="rounded-sm border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
          Beta
        </span>
      </div>
      <div className="space-y-4 p-4">
        <div className="rounded-sm border border-primary/30 bg-primary/10 p-4">
          <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Today&apos;s proof</div>
          <p className="mt-2 text-lg font-semibold leading-snug">Past-paper answer corrected and rewritten under time pressure.</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Submitted as evidence instead of a promise to work later.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <PreviewMetric label="Verdict" value="strong" />
          <PreviewMetric label="Leak" value="clarity" />
          <PreviewMetric label="Next step" value="repeat" />
          <PreviewMetric label="Day" value="03/07" />
        </div>
        <div className="rounded-sm border border-border bg-background/35 p-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">System rule</div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            No fake productivity. No vague hype. Show the work and let the evidence speak.
          </p>
        </div>
      </div>
    </Card>
  );
}

function ProofLaw({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-sm border border-border bg-card/45 px-3 py-2">
      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
      <span>{label}</span>
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border bg-background/35 p-3">
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm">{value}</div>
    </div>
  );
}
