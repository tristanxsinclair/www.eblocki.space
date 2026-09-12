import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

/**
 * Submit button with intentional micro feedback.
 * Use for proof submission actions.
 */
export const ProofSubmitButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn(
          "motion-micro active:scale-[0.985] transition-transform",
          className
        )}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

ProofSubmitButton.displayName = "ProofSubmitButton";
