import { ShieldCheck } from "lucide-react";
import type { ProofStandardPreview } from "@/lib/eblocki/proof-standard-preview";

export function ProofStandardPreviewPanel({ preview }: { preview: ProofStandardPreview }) {
  return (
    <div className="rounded-sm border border-primary/25 bg-primary/5 p-3 text-xs">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Selected Court Standard</span>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <PreviewCell label="Selected domain" value={preview.selectedDomain} />
        <PreviewCell label="Artifact type" value={preview.artifactType} />
        <PreviewCell label="Selected standard" value={preview.standardLabel} />
        <PreviewCell label="Alignment" value={preview.alignmentMessage} />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-sm border border-border/80 bg-background/40 p-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Required evidence</div>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {preview.requiredEvidence.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-primary">-</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-sm border border-border/80 bg-background/40 p-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Elite version</div>
          <p className="mt-2 text-muted-foreground">{preview.eliteVersion}</p>
          <div className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Identity rule</div>
          <p className="mt-2 text-muted-foreground">{preview.identityRule}</p>
        </div>
      </div>
    </div>
  );
}

function PreviewCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border/80 bg-background/40 p-3 min-w-0">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm text-foreground leading-snug">{value}</div>
    </div>
  );
}
