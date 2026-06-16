import { ShieldCheck } from "lucide-react";
import type { ProofStandardPreview } from "@/lib/eblocki/proof-standard-preview";

export function ProofStandardPreviewPanel({ preview }: { preview: ProofStandardPreview }) {
  return (
    <div className="rounded-sm border border-primary/25 bg-primary/5 p-3 text-xs max-w-full overflow-hidden">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Selected Standard</span>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <PreviewCell label="Selected Domain" value={preview.selectedDomain} />
        <PreviewCell label="Artifact Type" value={preview.artifactType} />
        <PreviewCell label="Selected Standard" value={preview.standardLabel} />
        <PreviewCell label="Contract Alignment" value={preview.alignmentMessage} />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-sm border border-border/80 bg-background/40 p-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Required Evidence</div>
          <ul className="mt-2 space-y-1 text-muted-foreground break-words">
            {preview.requiredEvidence.map((item) => (
              <li key={item} className="flex gap-2 break-words">
                <span className="text-primary">-</span>
                <span className="min-w-0 break-words">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-sm border border-border/80 bg-background/40 p-3 min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Elite Version</div>
          <p className="mt-2 text-muted-foreground break-words">{preview.eliteVersion}</p>
          <div className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Identity Escalation</div>
          <p className="mt-2 text-muted-foreground break-words">
            <span className={preview.identityEscalationAllowed ? "text-primary" : "text-foreground"}>
              {preview.identityEscalationAllowed ? "Allowed: " : "Blocked: "}
            </span>
            {preview.identityRule}
          </p>
        </div>
      </div>
    </div>
  );
}

function PreviewCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border/80 bg-background/40 p-3 min-w-0">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm text-foreground leading-snug break-words">{value}</div>
    </div>
  );
}
