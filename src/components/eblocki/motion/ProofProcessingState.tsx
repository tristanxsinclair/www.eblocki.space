import { cn } from "@/lib/utils";
import { forwardRef, type HTMLAttributes } from "react";

interface ProofProcessingStateProps extends HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

/**
 * Calm processing state between proof submission and verdict.
 * Use while the system is scoring the artifact.
 */
export const ProofProcessingState = forwardRef<HTMLDivElement, ProofProcessingStateProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "motion-calm flex items-center gap-2 text-muted-foreground",
          className
        )}
        {...props}
      >
        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
        {children ?? "Scoring your proof..."}
      </div>
    );
  }
);

ProofProcessingState.displayName = "ProofProcessingState";
