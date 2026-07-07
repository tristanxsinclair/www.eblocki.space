import { cn } from "@/lib/utils";

interface EblockiLogoProps {
  variant?: "mark" | "full" | "appIcon" | "wordmark" | "compact";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showTagline?: boolean;
  alt?: string;
  /**
   * Optional custom src for the circular mark.
   * Default: "/brand/eblocki-logo-circular.png" (add the approved asset here).
   */
  src?: string;
}

/**
 * Reusable Eblocki brand logo component.
 * Source of truth: the approved circular neon-green-on-black logo.
 * Doctrine: Proof over Intention. Clean. Disciplined. High-trust. No clutter.
 * 
 * Usage:
 *   <EblockiLogo variant="compact" size="md" />
 *   <EblockiLogo variant="full" showTagline />
 *   <EblockiLogo variant="mark" size="lg" /> // for app icon contexts
 */
export function EblockiLogo({
  variant = "full",
  size = "md",
  className,
  showTagline = false,
  alt = "Eblocki — Proof over Intention",
  src = "/brand/eblocki-logo-circular.png",
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

  const LogoMark = () => {
    // When the real approved circular logo asset exists at /brand/eblocki-logo-circular.png
    // this will render the premium mark. Until then it shows a clean, matching fallback.
    return (
      <div
        className={cn(
          "relative flex items-center justify-center shrink-0 overflow-hidden rounded-full",
          "bg-black border border-white/10",
          "shadow-[0_0_0_1px_hsl(78_95%_56%_/_0.25)]", // subtle green ring to echo logo
          sizeClasses[size]
        )}
        aria-hidden={isIconOnly}
      >
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-contain"
          onError={(e) => {
            // Elegant fallback if image not yet added — keeps brand feel
            const target = e.currentTarget as HTMLImageElement;
            target.style.display = "none";
            const fallback = target.parentElement?.querySelector(".logo-fallback");
            if (fallback) (fallback as HTMLElement).style.display = "flex";
          }}
        />
        {/* Clean fallback (visible only if image fails to load) */}
        <div
          className="logo-fallback absolute inset-0 hidden items-center justify-center bg-black"
          aria-hidden
        >
          <div className="relative flex h-[68%] w-[68%] items-center justify-center">
            <div className="text-[hsl(78_95%_56%)] text-[115%] font-bold leading-none select-none">E</div>
            <div className="absolute inset-0 rounded-full border-[1.5px] border-white/35" />
          </div>
        </div>
      </div>
    );
  };

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

  // full variant
  return (
    <div className={cn("flex flex-col items-start gap-0.5 min-w-0", className)}>
      <div className="flex items-center gap-2.5">
        <LogoMark />
        <div className="flex flex-col">
          <span className={cn("font-mono uppercase text-foreground leading-none", textSizeClasses[size])}>
            EBLOCKI
          </span>
          {showTagline && (
            <span className="text-[10px] font-mono uppercase tracking-[0.35em] text-primary/80 leading-none mt-px">
              PROOF OVER INTENTION
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
