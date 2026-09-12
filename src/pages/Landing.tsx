import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  FileCheck2,
  Gavel,
  ScrollText,
  ShieldCheck,
  Swords,
  Target,
  Trophy,
} from "lucide-react";
import { EblockiLogo } from "@/components/eblocki/EblockiLogo";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { logEvent } from "@/lib/eblocki/analytics";

const GAME_LOOP = [
  {
    icon: Target,
    label: "01",
    title: "Do one real thing",
    body: "Eblocki gives you one task for today. It happens in real life: write, build, train, sell, practise, or decide.",
  },
  {
    icon: FileCheck2,
    label: "02",
    title: "Show what you made",
    body: "Paste the actual thing you produced — the notes, the answer, the commit, the numbers. Ticking a box does not count.",
  },
  {
    icon: Gavel,
    label: "03",
    title: "Get an honest verdict",
    body: "Eblocki judges the evidence against a clear standard and tells you what counted, what didn't, and how to make it stronger.",
  },
  {
    icon: Trophy,
    label: "04",
    title: "Earn progress you can trust",
    body: "Levels and XP only move after real evidence is filed and judged. Nothing is handed out for good intentions.",
  },
  {
    icon: Bot,
    label: "05",
    title: "Get tomorrow's move",
    body: "Eblocki reads your record, names what is actually holding you back, and gives you one next move — not a to-do list.",
  },
] as const;

export default function Landing() {
  return (
    <div className="operator-surface life-game-shell">
      <Seo
        title="eblocki — Stop Fake Productivity. Turn Effort Into Proof."
        description="Free and open source. Do one real task, show the evidence, get an honest verdict and your next move. Progress only counts when proof exists."
        path="/"
      />

      <header className="operator-chrome sticky top-0 z-40 border-b safe-top safe-x">
        <div className="container flex min-h-16 items-center justify-between gap-3">
          <Link to="/" className="operator-interactive operator-hit inline-flex items-center">
            <EblockiLogo variant="compact" size="md" />
          </Link>
          <nav className="flex items-center gap-3">
            <a
              href="#how-xp-works"
              className="operator-interactive operator-hit hidden items-center px-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:inline-flex"
            >
              What counts as proof
            </a>
            <Link
              to="/demo"
              className="operator-interactive operator-hit inline-flex items-center px-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
            >
              Demo
            </Link>
            <Link
              to="/auth"
              className="operator-interactive operator-hit inline-flex items-center px-2 font-mono text-[10px] uppercase tracking-widest text-primary"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="grid-bg border-b border-border">
          <div className="container grid gap-8 py-12 md:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)] md:items-center md:py-20 lg:py-24">
            <div className="max-w-3xl">
              <div className="operator-label-signal">
                &gt; Free // open source // no subscriptions
              </div>
              <h1 className="operator-heading-1 mt-5 md:text-6xl lg:text-7xl">
                Stop fake productivity.
                <br />
                <span className="text-primary">Turn effort into proof.</span>
              </h1>
              <p className="operator-body mt-6 max-w-xl md:text-lg">
                Most trackers reward ticking boxes. Eblocki asks for the actual thing you made,
                judges it honestly, and gives you one next move. Your levels are built from real
                evidence, so the progress you see is progress you genuinely earned.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link
                    to="/auth"
                    onClick={() => {
                      void logEvent("activation_landing_primary_cta_clicked", {
                        route: "/",
                        destination: "/auth",
                        ctaName: "start_your_run",
                      });
                    }}
                  >
                    Start your run <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                  <Link
                    to="/demo"
                    onClick={() => {
                      void logEvent("life_game_demo_started", {
                        route: "/",
                        source: "landing",
                      });
                    }}
                  >
                    Play the demo
                  </Link>
                </Button>
                <Button asChild size="lg" variant="ghost" className="w-full sm:w-auto">
                  <a href="#how-xp-works">
                    See what counts as proof
                  </a>
                </Button>
              </div>

              <div className="operator-label-signal mt-8 flex min-h-11 items-center gap-2 rounded-md border border-primary/30 bg-primary/[0.05] px-3 py-2 sm:inline-flex">
                <ShieldCheck className="h-4 w-4" />
No proof, no progress — that is the whole rule
              </div>
            </div>

            <CharacterPreview />
          </div>
        </section>

        <section className="operator-section">
          <div className="container">
            <div className="max-w-2xl">
              <div className="operator-label-signal">
                How it works
              </div>
              <h2 className="operator-heading-2 mt-2 md:text-4xl">
                Five steps. Two minutes a day.
              </h2>
              <p className="operator-body mt-3">
                Your first goal is not to become perfect. Your first goal is to submit one honest
                piece of proof. Everything else follows from that.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {GAME_LOOP.map(({ icon: Icon, label, title, body }) => (
                <Card key={title} className="operator-panel p-5">
                  <div className="flex items-center justify-between">
                    <span className="operator-label">
                      {label}
                    </span>
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="operator-heading-3 mt-4">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="how-xp-works" className="operator-section">
          <div className="container grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:items-start">
            <div>
              <div className="operator-label-signal">
                What counts as proof
              </div>
              <h2 className="operator-heading-2 mt-2 md:text-4xl">
                You cannot award yourself progress.
              </h2>
              <p className="operator-body mt-4">
                Proof is anything someone else could look at: a written answer, a page of worked
                problems, a commit, a recording, a session log, a number that moved. Reading,
                planning, organising and &quot;feeling productive&quot; do not count on their own.
                Planning is useful. Hiding inside planning is not.
              </p>
            </div>

            <div className="space-y-3">
              <EvidenceRule
                title="Evidence before completion"
                body="There is no &quot;mark as done&quot; shortcut. Tasks that need proof send you to log the real artifact instead."
              />
              <EvidenceRule
                title="Honest states, always"
                body="If something has not been judged yet, Eblocki says so. It never shows you a success you have not earned."
              />
              <EvidenceRule
                title="Practice is free, progress is earned"
                body="You can drill and play as much as you like. Your levels only move once a result is filed as evidence and judged."
              />
            </div>
          </div>
        </section>

        <section className="operator-section">
          <div className="container grid gap-4 md:grid-cols-2">
            <Card className="operator-panel p-6 sm:p-8">
              <Bot className="h-5 w-5 text-primary" />
              <div className="operator-label-signal mt-5">
                Your next move
              </div>
              <h2 className="mt-2 text-2xl font-semibold">One clear instruction.</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                Eblocki spots what you have been avoiding, gives you a single task, tells you exactly
                what evidence to bring back, and keeps working even when AI is offline.
              </p>
            </Card>
            <Card className="operator-panel p-6 sm:p-8">
              <Swords className="h-5 w-5 text-primary" />
              <div className="operator-label-signal mt-5">
                Arena
              </div>
              <h2 className="mt-2 text-2xl font-semibold">Practice under pressure.</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                Drill timed reps for your subject or skill, review how you did, then file the result
                as proof when it is good enough for a real verdict.
              </p>
            </Card>
          </div>
        </section>

        <section className="operator-section">
          <div className="container text-center">
            <div className="mx-auto max-w-2xl">
              <div className="operator-label-signal">
                Start with one piece of proof
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
                See what you have actually done.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Try the demo with no account and no sign-up, or start for free and log your first
                proof in under two minutes. Free forever, open source, no ads.
              </p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link to="/auth">
                    Start your run <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                  <Link to="/demo">
                    Play the demo
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="safe-bottom safe-x">
        <div className="container flex flex-col gap-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <EblockiLogo variant="compact" size="sm" />
          <div className="flex flex-wrap gap-4 font-mono text-[10px] uppercase tracking-widest">
            <Link to="/legal/privacy" className="operator-interactive inline-flex min-h-11 items-center">Privacy</Link>
            <Link to="/legal/terms" className="operator-interactive inline-flex min-h-11 items-center">Terms</Link>
            <Link to="/legal/ai-disclosure" className="operator-interactive inline-flex min-h-11 items-center">AI disclosure</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
function CharacterPreview() {
  return (
    <Card className="operator-panel-accent overflow-hidden">
      <div className="border-b border-border bg-primary/[0.04] px-4 py-3">
        <div className="flex items-center justify-between gap-3 font-mono text-[9px] uppercase tracking-[0.2em]">
          <span className="text-primary">Character preview</span>
          <span className="text-muted-foreground">Sample data</span>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="operator-label-signal">
              Operator Level 12
            </div>
            <h2 className="mt-1 text-xl font-semibold">Compound Operator</h2>
          </div>
          <div className="text-right">
            <div className="operator-number text-lg font-semibold">4,280</div>
            <div className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">
              Total XP
            </div>
          </div>
        </div>
        <Progress value={59.5} className="mt-4 h-2" />

        <div className="mt-5 rounded-sm border border-primary/30 bg-primary/[0.04] p-4">
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary">
            Active quest
          </div>
          <div className="mt-2 font-semibold">Ship one verified product improvement</div>
          <div className="mt-3 rounded-sm border border-border bg-background/50 p-3">
            <div className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">
              Evidence required
            </div>
            <p className="mt-1 text-xs text-foreground">Commit + relevant command output</p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <PreviewPanel
            icon={Bot}
            label="Your next move"
            value="Polishing is protecting you from a verdict."
          />
          <PreviewPanel
            icon={ScrollText}
            label="Run Log"
            value="MIND LEVEL 13 → 14 // +96 XP"
          />
        </div>
      </div>
    </Card>
  );
}

function PreviewPanel({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Bot;
  label: string;
  value: string;
}) {
  return (
    <div className="operator-panel p-3">
      <div className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3 w-3 text-primary" />
        {label}
      </div>
      <p className="mt-2 text-xs leading-5">{value}</p>
    </div>
  );
}

function EvidenceRule({ title, body }: { title: string; body: string }) {
  return (
    <div className="operator-panel flex gap-3 p-4">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
