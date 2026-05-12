import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ModeBadge } from "./Badges";
import type { ProofContract } from "@/lib/eblocki/proof-contract";
import { FileSignature } from "lucide-react";

export function ProofContractCard({
  contract,
  onCommit,
  committing,
  committed,
}: {
  contract: ProofContract;
  onCommit?: () => void;
  committing?: boolean;
  committed?: boolean;
}) {
  const buttonDisabled = committing || committed;
  const buttonText = committed ? "✓ Proof Contract Saved" : committing ? "Committing…" : "Commit to Court of Evidence";

  return (
    <Card className="panel p-4 border-primary/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileSignature className="h-4 w-4 text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
            Proof Contract
          </span>
        </div>
        <ModeBadge mode={contract.mode} />
      </div>
      <h3 className="mt-2 text-sm font-medium">{contract.title}</h3>
      <dl className="mt-3 grid grid-cols-1 gap-2 text-xs">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Required artifact</dt>
          <dd className="text-foreground">{contract.requiredArtifact}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Evidence standard</dt>
          <dd className="text-foreground">{contract.evidenceStandard}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Seriousness</dt>
          <dd className="text-foreground font-mono">{contract.seriousnessScore}/10 — {contract.reason}</dd>
        </div>
      </dl>
      {onCommit && (
        <Button
          onClick={onCommit}
          disabled={buttonDisabled}
          className="mt-4 w-full"
          variant={committed ? "secondary" : "default"}
        >
          {buttonText}
        </Button>
      )}
    </Card>
  );
}
