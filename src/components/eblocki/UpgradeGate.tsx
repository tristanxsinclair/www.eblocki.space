import { type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles } from "lucide-react";
import { type AccessLevel, hasFeature } from "@/lib/eblocki/access-level";
import { cn } from "@/lib/utils";

interface UpgradeGateProps {
  feature: string;
  accessLevel: AccessLevel;
  children: ReactNode;
  className?: string;
}

/**
 * Smooth overlay that gates pro features with an "upgrade to unlock" card.
 * Shows a blurred preview of the content behind it rather than hiding it entirely.
 */
export function UpgradeGate({ feature, accessLevel, children, className }: UpgradeGateProps) {
  if (hasFeature(accessLevel, feature)) {
    return <>{children}</>;
  }

  return (
    <div className={cn("relative", className)}>
      {/* Blurred preview of the gated content */}
      <div className="pointer-events-none select-none blur-[3px] opacity-50" aria-hidden>
        {children}
      </div>

      {/* Upgrade overlay */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <Card className="panel border-primary/30 bg-card/95 backdrop-blur-md p-5 max-w-sm w-full text-center motion-entrance">
          <div className="flex justify-center mb-3">
            <div className="rounded-full bg-primary/10 border border-primary/30 p-3">
              <Lock className="h-5 w-5 text-primary" />
            </div>
          </div>
          <h3 className="font-semibold text-sm">Unlock with Pro</h3>
          <p className="mt-1.5 text-xs text-muted-foreground">
            This feature requires a Pro subscription. Upgrade to access advanced tools.
          </p>
          <Button
            size="sm"
            className="mt-4 w-full motion-micro active:scale-[0.98]"
            onClick={() => {
              window.location.href = "/settings#upgrade";
            }}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Upgrade to Pro
          </Button>
        </Card>
      </div>
    </div>
  );
}
