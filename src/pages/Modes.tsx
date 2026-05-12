import { AppShell } from "@/components/eblocki/AppShell";
import { Card } from "@/components/ui/card";

const MODES = [
  { code: "LAW_MAX", purpose: "Law, statutory interpretation, IRAC, AGLC4.", proof: "Written IRAC answer, statutory interpretation breakdown, case note.", types: "IRAC, case note, problem question.", sample: "Apply s 109 Constitution to inconsistency between state and federal Acts." },
  { code: "PSYCH_HD", purpose: "Psychology, applied evidence-based paragraphs.", proof: "Concept/Application/Evidence/Evaluation paragraph.", types: "CAEE paragraph, study design, mechanism explanation.", sample: "Explain dual-process theory applied to social-media attention loss." },
  { code: "SALES_CLOSE", purpose: "TGG floor performance, GSE attachment, AOV.", proof: "Customer reflection with GSE outcome.", types: "Shift reflection, objection drill log.", sample: "Customer wants a 65\" TV under $1500 — diagnose, premium pain, GSE attach." },
  { code: "EBLOCKI", purpose: "Discipline, identity, system upgrades.", proof: "Daily Control Sheet line + completed task.", types: "Sheet entry, weekly audit, system patch note.", sample: "I keep reorganising notes instead of writing." },
  { code: "SPORT", purpose: "Striker / false 9 development, scooter training.", proof: "Match/training log with movement detail.", types: "Match review, drill log, conditioning block.", sample: "Match review: 70 mins, 1 assist, lost duels in box." },
  { code: "BRAND", purpose: "Eblocki brand, scooter content, LinkedIn.", proof: "One published post / script / reel.", types: "Hook + script, caption, video edit log.", sample: "Write a LinkedIn post on proof-based discipline (no hustle clichés)." },
  { code: "CAREER_MONEY", purpose: "Jobs, money, decision rules.", proof: "Decision doc, resume/cover, budget.", types: "Decision memo, application asset.", sample: "Should I take the paralegal role or stay full-time at TGG?" },
];

export default function Modes() {
  return (
    <AppShell>
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        <header>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Active modes</span>
          <h1 className="text-2xl md:text-3xl font-semibold mt-1">The operating frames.</h1>
        </header>
        <div className="grid sm:grid-cols-2 gap-3">
          {MODES.map(m => (
            <Card key={m.code} className="panel p-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-primary">{m.code}</div>
              <div className="mt-2 text-sm font-medium">{m.purpose}</div>
              <dl className="mt-3 space-y-2 text-xs">
                <div><dt className="font-mono uppercase text-muted-foreground text-[10px]">What proof looks like</dt><dd>{m.proof}</dd></div>
                <div><dt className="font-mono uppercase text-muted-foreground text-[10px]">Common artifact types</dt><dd>{m.types}</dd></div>
                <div><dt className="font-mono uppercase text-muted-foreground text-[10px]">Sample prompt</dt><dd className="italic">"{m.sample}"</dd></div>
              </dl>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
