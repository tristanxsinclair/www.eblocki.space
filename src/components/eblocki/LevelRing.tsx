import { cn } from "@/lib/utils";

interface LevelRingProps {
  level: number;
  xpInLevel: number;
  threshold: number;
  size?: number;
  label?: string;
  glow?: boolean;
  className?: string;
}

/**
 * Tactical level ring — animated SVG progress with primary glow.
 * Restrained motion, no decorative noise.
 */
export function LevelRing({
  level,
  xpInLevel,
  threshold,
  size = 140,
  label,
  glow = true,
  className,
}: LevelRingProps) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, threshold > 0 ? xpInLevel / threshold : 0));
  const dash = c * pct;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="hsl(var(--border))"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="hsl(var(--primary))"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{
            transition: "stroke-dasharray 700ms cubic-bezier(0.22,1,0.36,1)",
            filter: glow ? "drop-shadow(0 0 6px hsl(var(--primary) / 0.55))" : undefined,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
          {label ?? "Level"}
        </div>
        <div className="font-mono text-3xl text-foreground leading-none mt-0.5">{level}</div>
        <div className="text-[10px] font-mono text-muted-foreground mt-1">
          {xpInLevel}/{threshold} XP
        </div>
      </div>
    </div>
  );
}