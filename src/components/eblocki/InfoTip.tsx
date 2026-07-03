import { ReactNode } from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Tiny inline "why am I seeing this?" affordance. Keep copy short and
 * declarative — explain the rule, not the philosophy.
 */
export function InfoTip({
  children, label = "Why am I seeing this?", className,
}: { children: ReactNode; label?: string; className?: string }) {
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "inline-flex items-center justify-center h-4 w-4 rounded-full text-muted-foreground/70 hover:text-foreground transition-colors align-middle",
            className,
          )}
        >
          <Info className="h-3 w-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-xs leading-snug">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}