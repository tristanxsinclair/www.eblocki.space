import { cn } from "@/lib/utils";
import { forwardRef, type HTMLAttributes } from "react";

interface MotionNextStepProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Gentle entrance for next command / action.
 * Use after verdict to guide the user forward.
 */
export const MotionNextStep = forwardRef<HTMLDivElement, MotionNextStepProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("motion-entrance", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

MotionNextStep.displayName = "MotionNextStep";
