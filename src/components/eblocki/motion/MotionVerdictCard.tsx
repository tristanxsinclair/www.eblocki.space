import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { forwardRef, type HTMLAttributes } from "react";

interface MotionVerdictCardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Verdict card with deliberate entrance + emphasis motion.
 * Use when showing proof results.
 */
export const MotionVerdictCard = forwardRef<HTMLDivElement, MotionVerdictCardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn(
          "motion-emphasis motion-entrance border-primary/40",
          className
        )}
        {...props}
      >
        {children}
      </Card>
    );
  }
);

MotionVerdictCard.displayName = "MotionVerdictCard";
