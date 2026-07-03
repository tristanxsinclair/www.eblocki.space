import { cn } from "@/lib/utils";
import type { MomentumStateName } from "@/lib/eblocki/momentum";

const STATE_COLOR: Record<MomentumStateName, string> = {
  cold: "hsl(var(--muted-foreground))",
  warming: "hsl(var(--primary) / 0.7)",
  momentum: "hsl(var(--primary))",
  at_risk: "hsl(var(--destructive))",
  recovery: "hsl(var(--primary) / 0.8)",
  elite: "hsl(var(--success, var(--primary)))",
};

interface Props {
  score: number; // 0..100
  state: MomentumStateName;
  streak: number;
  size?: number;
  className?: string;
}

export function MomentumRing({ score, state, streak, size = 132, className }: Props) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(100, score)) / 100);
  const color = STATE_COLOR[state];

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--muted) / 0.5)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(.2,.8,.2,1), stroke 300ms" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl tabular-nums" style={{ color }}>
          {score}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
          {streak}d streak
        </span>
      </div>
    </div>
  );
}