import { cn } from "@/lib/utils";
import { forwardRef, type HTMLAttributes } from "react";

interface MotionLockInProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  active?: boolean;
}

/**
 * Lock-in confirmation wrapper.
 * Use when a proof or contract has been successfully committed.
 */
export const MotionLockIn = forwardRef<HTMLDivElement, MotionLockInProps>(
  ({ className, children, active = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          active && "lock-in-pulse",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

MotionLockIn.displayName = "MotionLockIn";
