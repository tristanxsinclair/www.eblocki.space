import { cn } from "@/lib/utils";

 interface EblockiLogoProps {
  variant?: "mark" | "full" | "appIcon" | "wordmark" | "compact";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showTagline?: boolean;
  alt?: string;
}

/**
 * Reusable Eblocki brand logo component.
 * Uses the approved circular neon-green-on-black logo as source of truth.
 * Follows Proof over Intention doctrine — clean, disciplined, high-trust.
 */
export function EblockiLogo({
  variant = "full",
  size = "md",
  className,
  showTagline = false,
  alt = "Eblocki - Proof over Intention",
}: EblockiLogoProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
    xl: "h-12 w-12",
  };

  const textSizeClasses = {
    sm: "text-xs tracking-[0.15em]",
    md: "text-sm tracking-[0.2em]",
    lg: "text-base tracking-[0.2em]",
    xl: "text-lg tracking-[0.25em]",
  };

  const isIconOnly = variant === "mark" || variant === "appIcon";

  // For now, use a styled placeholder that matches the new circular logo aesthetic.
  // TODO: Replace with actual <img src="/brand/eblocki-logo-circular.png" ... /> once asset is added to public/brand/
  const LogoMark = () => (
    <div
      className={cn(
        "rounded-full bg-black border border-white/10 flex items-center justify-center shrink-0",
        "shadow-[0_0_0_1px_hsl(78_95%_56%_/_0.3)]", // subtle green ring matching logo glow
        sizeClasses[size]
      )}
      aria-hidden={isIconOnly}
    >
      {/* Placeholder for the circular 'e' mark from approved logo */}
      <div className="relative h-[70%] w-[70%] flex items-center justify-center">
        <div className="text-[hsl(78_95%_56%)] font-bold text-[120%] leading-none select-none">E</div>
        {/* Silver accent arc to echo the logo's metallic element */}
        <div className="absolute inset-0 rounded-full border-[1.5px] border-white/40" />
      </div>
    </div>
  );

  if (variant === "mark" || variant === "appIcon") {
    return <LogoMark />;
  }

  if (variant === "wordmark" || variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2 min-w-0", className)}>
        <LogoMark />
        <span className={cn("font-mono uppercase text-foreground", textSizeClasses[size])}>
          EBLOCKI
        </span>
      </div>
    );
  }

  // "full" variant - logo + wordmark + optional tagline
  return (
    <div className={cn("flex flex-col items-start gap-0.5 min-w-0", className)}>
      <div className="flex items-center gap-2.5">
        <LogoMark />
        <div className="flex flex-col">
          <span className={cn("font-mono uppercase text-foreground leading-none", textSizeClasses[size])}>
            EBLOCKI
          </span>
          {showTagline && (
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary/80 leading-none mt-px">
              PROOF OVER INTENTION
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
