import { cn } from "@/lib/utils";
import { forwardRef, type HTMLAttributes } from "react";

interface MotionFormFieldProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hasError?: boolean;
}

/**
 * Wrapper for form fields with subtle micro feedback.
 * Includes shake animation on error state.
 * Use on inputs in the Proof form, Auth, and Onboarding.
 */
export const MotionFormField = forwardRef<HTMLDivElement, MotionFormFieldProps>(
  ({ className, children, hasError, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "motion-micro",
          hasError && "shake motion-emphasis",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

MotionFormField.displayName = "MotionFormField";
