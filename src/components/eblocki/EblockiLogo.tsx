import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import "./EblockiLogo.css";

interface EblockiLogoProps {
  variant?: "mark" | "full" | "appIcon" | "wordmark" | "compact";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showTagline?: boolean;
  alt?: string;
  /** Force animation on/off. Defaults to once-per-session on first mount. */
  animate?: boolean;
}

const SIZE_PX: Record<NonNullable<EblockiLogoProps["size"]>, number> = {
  sm: 22,
  md: 28,
  lg: 36,
  xl: 44,
};

const TEXT_SIZE: Record<NonNullable<EblockiLogoProps["size"]>, string> = {
  sm: "text-[15px]",
  md: "text-[18px]",
  lg: "text-[22px]",
  xl: "text-[28px]",
};

const SESSION_FLAG = "eblocki_logo_revealed_v1";

function BrandMark({ px }: { px: number }) {
  return (
    <img
      src="/icon-192.png"
      width={px}
      height={px}
      alt="Eblocki"
      className="shrink-0 rounded-sm object-contain"
    />
  );
}

export function EblockiLogo({
  variant = "full",
  size = "md",
  className,
  showTagline = false,
  alt = "Eblocki",
  animate,
}: EblockiLogoProps) {
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (animate === false) return;
    if (typeof window === "undefined") return;
    const prefersReduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) return;
    if (animate === true) {
      setShouldAnimate(true);
      return;
    }
    try {
      if (!sessionStorage.getItem(SESSION_FLAG)) {
        sessionStorage.setItem(SESSION_FLAG, "1");
        setShouldAnimate(true);
      }
    } catch {
      /* private mode etc — silent fallback to static */
    }
  }, [animate]);

  const px = SIZE_PX[size];
  const isIconOnly = variant === "mark" || variant === "appIcon";

  const Mark = (
    <span
      className="inline-flex text-foreground"
      aria-hidden={isIconOnly ? undefined : true}
    >
      <BrandMark px={px} />
      {isIconOnly && <span className="sr-only">{alt}</span>}
    </span>
  );

  if (isIconOnly) return <span className={className}>{Mark}</span>;

  const wordmark = (
    <span
      className={cn(
        "eblocki-wordmark font-sans text-foreground lowercase",
        TEXT_SIZE[size],
        shouldAnimate && "is-animating",
      )}
      style={{ letterSpacing: 0, fontWeight: 500 }}
    >
      eblocki
    </span>
  );

  if (variant === "wordmark" || variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2 min-w-0", className)}>
        {Mark}
        {wordmark}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-start gap-1 min-w-0", className)}>
      <div className="flex items-center gap-2.5">
        {Mark}
        <div className="flex flex-col leading-none">
          {wordmark}
          {showTagline && (
            <span className="mt-1 text-[10px] font-mono uppercase tracking-[0.32em] text-muted-foreground">
              proof over intention
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
