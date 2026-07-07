import { cn } from "@/lib/utils";

interface EblockiLogoProps {
  variant?: "mark" | "full" | "appIcon" | "wordmark" | "compact";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showTagline?: boolean;
  alt?: string;
  /**
   * Base path without extension. Component will append sizes for srcset.
   * Recommended: keep the 1024px master at /brand/eblocki-logo-circular.png
   */
  src?: string;
}

/**
 * Reusable Eblocki brand logo with performance optimizations.
 * - Uses srcset for responsive loading
 * - Critical nav logos use eager + high fetchpriority
 * - Clean fallback matching approved aesthetic
 */
export function EblockiLogo({
  variant = "full",
  size = "md",
  className,
  showTagline = false,
  alt = "Eblocki - Proof over Intention",
  src = "/brand/eblocki-logo-circular",
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
  const isCritical = variant === "compact" || variant === "mark"; // nav + headers

  // Responsive srcset (create these sizes in public/brand/)
  const srcSet = [
    `${src}-64.png 64w`,
    `${src}-128.png 128w`,
    `${src}-256.png 256w`,
    `${src}.png 512w`,
  ].join(", ");

  const sizes = "(max-width: 640px) 64px, 128px";

  const LogoMark = () => (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-black border border-white/10",
        "shadow-[0_0_0_1px_hsl(78_95%_56%_/_0.25)]",
        sizeClasses[size]
      )}
      aria-hidden={isIconOnly}
    >
      <img
        src={`${src}.png`}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        className="h-full w-full object-contain"
        loading={isCritical ? "eager" : "lazy"}
        fetchPriority={isCritical ? "high" : "auto"}
        onError={(e) => {
          const img = e.currentTarget;
          img.style.display = "none";
          const fallback = img.parentElement?.querySelector(".logo-fallback") as HTMLElement | null;
          if (fallback) fallback.style.display = "flex";
        }}
      />
      {/* Elegant fallback (only shows if real image fails) */}
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
