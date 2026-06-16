import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Seo } from "@/components/Seo";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Crosshair,
  FileSignature,
  Gavel,
  Gauge,
  Radar,
  ShieldCheck,
  Target,
} from "lucide-react";

const USE_CASES = [
  { title: "Student", desc: "Turn study blocks into marked evidence, revision proofs, and weaker-topic corrections." },
  { title: "Athlete", desc: "Connect training intent to measurable transfer, pressure reps, and match review artifacts." },
  { title: "Salesperson", desc: "Convert calls, follow-ups, and objections into proof of pipeline behaviour." },
  { title: "Founder", desc: "Keep building tied to shipped artifacts, customer evidence, and decision quality." },
  { title: "Creator", desc: "Measure output by published proof, iteration quality, and audience learning." },
  { title: "General", desc: "Use daily proof to replace vague improvement with visible behavioural evidence." },
];

const HOW_IT_WORKS = [
  { icon: Target, title: "Input", desc: "Name the work, pressure, or bottleneck in plain language." },
  { icon: BrainCircuit, title: "Diagnosis", desc: "Eblocki reads the mode, state, risk, and proof standard already in the system." },
  { icon: FileSignature, title: "Proof", desc: "The command becomes a required artifact, not a private intention." },
  { icon: Radar, title: "Forecast", desc: "The Temporal loop estimates where current behaviour may be heading, with uncertainty visible." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title="Eblocki — Stop Fake Productivity. Log Proof."
        description="Eblocki helps students turn intention into proof, detect avoidance, and get the next action that actually counts. Join the 7-day Proof Week beta."
        path="/"
      />
      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-2 native-tap">
            <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-primary-foreground">
              <Crosshair className="h-4 w-4" />
            </div>
            <span className="font-mono text-sm tracking-[0.25em]">EBLOCKI</span>
          </Link>
          <nav className="flex items-center gap-3">
            <a href="#how-it-works" className="hidden text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground sm:inline-flex">
              How it works
            </a>
            <Link to="/auth" className="text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground">Sign in</Link>
            <Link to="/proof-week"><Button size="sm">Join Proof Week</Button></Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="grid-bg border-b border-border">
          <div className="container grid gap-10 py-14 md:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.75fr)] md:items-center md:py-20 lg:py-24">
            <div className="max-w-3xl">
              <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
                Proof-based performance app
              </span>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
                Stop fake productivity.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                Eblocki helps students turn intention into proof, detect avoidance, and get the next action that actually counts.
              </p>
              <ol className="mt-5 grid gap-1.5 text-sm text-muted-foreground md:grid-cols-4">
                <li><span className="text-foreground font-medium">1.</span> Check in.</li>
                <li><span className="text-foreground font-medium">2.</span> Log one proof artifact.</li>
                <li><span className="text-foreground font-medium">3.</span> Get your command.</li>
                <li><span className="text-foreground font-medium">4.</span> See if your work counted.</li>
              </ol>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/proof-week"><Button size="lg">Start Proof Week<ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
                <Link to="/proof"><Button size="lg" variant="outline">Submit first proof</Button></Link>
              </div>
              <p className="mt-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Free beta · No card required · Built for university students
              </p>
              <div className="mt-8 grid gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground sm:grid-cols-3">
                <ProofLaw label="No vague intention" />
                <ProofLaw label="No proof, no claim" />
                <ProofLaw label="No fake certainty" />
              </div>
            </div>
            <ProductPreview />
          </div>
        </section>

        <section className="border-b border-border">
          <div className="container grid gap-8 py-14 md:grid-cols-[0.8fr_1fr] md:py-16">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Problem</div>
              <h2 className="mt-2 text-2xl font-semibold md:text-3xl">Most tools reward the wrong thing.</h2>
            </div>
            <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
              {[
                "Planning without an artifact.",
                "Streaks without depth.",
                "Identity claims without evidence.",
                "Confidence without calibration.",
              ].map((item) => (
                <div key={item} className="rounded-sm border border-border bg-card/40 p-4">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-b border-border">
          <div className="container py-14 md:py-16">
            <div className="max-w-2xl">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">How It Works</div>
              <h2 className="mt-2 text-2xl font-semibold md:text-3xl">Input, diagnosis, proof, forecast.</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                The loop is deliberately simple on the surface. Each command has to produce evidence, and each forecast stays tied to the evidence that created it.
              </p>
            </div>
            <div className="mt-8 grid gap-3 md:grid-cols-4">
              {HOW_IT_WORKS.map(({ icon: Icon, title, desc }, index) => (
                <Card key={title} className="panel p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="font-mono text-[10px] text-muted-foreground">0{index + 1}</span>
                  </div>
                  <div className="mt-4 text-sm font-medium">{title}</div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="container grid gap-8 py-14 md:grid-cols-[0.85fr_1fr] md:items-start md:py-16">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Product Preview</div>
              <h2 className="mt-2 text-2xl font-semibold md:text-3xl">One command surface. Three questions.</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                What should I do now? Where is this behaviour heading? What proof would change the path?
              </p>
            </div>
            <Card className="panel overflow-hidden border-primary/25 bg-card/60">
              <div className="border-b border-border px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Command Centre Preview
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                <PreviewCell icon={<Crosshair />} label="Command" value="Submit the strongest proof artifact available today." />
                <PreviewCell icon={<Radar />} label="Future Path" value="Current path improving, confidence moderate." />
                <PreviewCell icon={<Gavel />} label="Evidence" value="Court checks artifact strength before identity updates." />
                <PreviewCell icon={<Gauge />} label="Calibration" value="Forecast accuracy is reviewed after later proof arrives." />
              </div>
            </Card>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="container py-14 md:py-16">
            <div className="max-w-2xl">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Modes</div>
              <h2 className="mt-2 text-2xl font-semibold md:text-3xl">Different work, same proof law.</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Eblocki adapts the standard to the domain while keeping the rule unchanged: progress has to leave evidence.
              </p>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {USE_CASES.map((item) => (
                <Card key={item.title} className="panel p-4">
                  <div className="text-sm font-medium">{item.title}</div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="container grid gap-8 py-14 md:grid-cols-[0.8fr_1fr] md:py-16">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Why Different</div>
              <h2 className="mt-2 text-2xl font-semibold md:text-3xl">It does not flatter the plan.</h2>
            </div>
            <div className="space-y-3">
              <DifferenceLine title="Evidence before identity" body="The ledger updates after proof, not after a self-description." />
              <DifferenceLine title="Forecasts with uncertainty" body="Temporal outputs show risk, path, and confidence without pretending to know the future." />
              <DifferenceLine title="Commands require artifacts" body="The system points to the next action and the proof needed to make it count." />
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="container py-14 md:py-16">
            <div className="max-w-3xl">
              <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Start</div>
              <h2 className="mt-2 text-2xl font-semibold md:text-4xl">Find out in 7 days if your study is real.</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                One command a day. One proof artifact. By day 7, Eblocki shows you whether your work produced real evidence — or just made you feel productive.
              </p>
              <Link to="/proof-week" className="mt-7 inline-flex"><Button size="lg">Start Proof Week<ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="container py-8 text-xs font-mono text-muted-foreground">
        Confidence is the receipt, not the starting point.
      </footer>
    </div>
  );
}

function ProductPreview() {
  return (
    <Card className="panel relative overflow-hidden border-primary/30 bg-card/70 shadow-2xl shadow-primary/5">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Today Command</div>
        <span className="rounded-sm border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">Live</span>
      </div>
      <div className="space-y-4 p-4">
        <div className="rounded-sm border border-primary/30 bg-primary/10 p-4">
          <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Next Proof Action</div>
          <p className="mt-2 text-lg font-semibold leading-snug">Finish the artifact that proves the claim.</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Required proof: public output, scored work, shipped change, or reviewed performance.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <PreviewMetric label="Path" value="corrected" />
          <PreviewMetric label="Risk" value="drift" />
          <PreviewMetric label="Proof" value="required" />
          <PreviewMetric label="Confidence" value="moderate" />
        </div>
        <div className="rounded-sm border border-border bg-background/35 p-3">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Evidence Ledger
          </div>
          <div className="mt-3 space-y-2 text-xs">
            <LedgerRow label="Artifact submitted" status="pending" />
            <LedgerRow label="Court score" status="awaiting proof" />
            <LedgerRow label="Forecast calibration" status="later" />
          </div>
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

function LedgerRow({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-sm border border-border/70 px-2 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-[9px] uppercase tracking-widest text-primary">{status}</span>
    </div>
  );
}

function PreviewCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border bg-background/35 p-3">
      <div className="flex items-center gap-2 text-primary [&_svg]:h-3.5 [&_svg]:w-3.5">
        {icon}
        <span className="font-mono text-[9px] uppercase tracking-widest">{label}</span>
      </div>
      <p className="mt-2 text-sm leading-5 text-muted-foreground">{value}</p>
    </div>
  );
}

function DifferenceLine({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-sm border border-border bg-card/40 p-4">
      <div className="text-sm font-medium">{title}</div>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}
