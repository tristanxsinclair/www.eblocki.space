import { FileCheck2 } from "lucide-react";
import { format } from "date-fns";
import type { StudentOverview } from "@/hooks/useStudentOverview";
import {
  plainEvidenceStrength,
  plainVerdictLabel,
} from "@/lib/eblocki/user-facing-copy";
import { cn } from "@/lib/utils";

export function StudentActivity({
  proofs,
}: {
  proofs: StudentOverview["recent"];
}) {
  if (!proofs.length)
    return (
      <p className="py-6 text-sm text-muted-foreground">
        No work logged yet. Your first entry will appear here.
      </p>
    );
  return (
    <ul className="divide-y divide-border">
      {proofs.map((proof) => (
        <li key={proof.id} className="flex min-w-0 items-start gap-3 py-4">
          <span className="student-icon mt-0.5">
            <FileCheck2 className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-medium leading-6">
              {proof.title}
            </p>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              {proof.created_at
                ? format(new Date(proof.created_at), "d MMM, h:mm a")
                : "Date unavailable"}
            </p>
          </div>
          <span
            className={cn(
              "max-w-[6rem] shrink-0 pt-1 text-right text-xs leading-5 text-muted-foreground",
              plainVerdictLabel(
                proof.evidence_strength,
                proof.quality_score,
              ) === "Counted" && "text-primary",
            )}
          >
            {plainEvidenceStrength(proof.evidence_strength)}
          </span>
        </li>
      ))}
    </ul>
  );
}
