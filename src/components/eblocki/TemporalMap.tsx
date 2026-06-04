import type { TemporalResult, TrajectoryName } from "@/lib/eblocki/temporal-engine";

const PATH_STYLE: Record<TrajectoryName, { stroke: string; dash?: string; label: string }> = {
  corrected_path: { stroke: "hsl(var(--primary))", label: "Corrected" },
  escalation_path: { stroke: "hsl(var(--success, var(--primary)))", dash: "4 2", label: "Escalation" },
  current_path: { stroke: "hsl(var(--muted-foreground))", dash: "2 3", label: "Current" },
  decay_path: { stroke: "hsl(var(--destructive))", dash: "6 3", label: "Decay" },
};

/**
 * Abstract future-orbit map. Pure SVG, semantic tokens only.
 * Center = current self. Right = forward time. Up = growth. Down = decay.
 */
export function TemporalMap({ result }: { result: TemporalResult }) {
  const W = 640;
  const H = 240;
  const padX = 32;
  const midY = H / 2;

  const horizons = result.visual.horizons;
  const xFor = (i: number) =>
    padX + (i / (horizons.length - 1)) * (W - padX * 2);
  const yFor = (v: number) => midY - (v / 100) * (midY - 16);

  return (
    <div className="rounded-md border border-border bg-card/40 p-3 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
          Temporal Field // Future Orbit Map
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Uncertainty ±{Math.round(result.visual.uncertaintyBand)}%
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {/* Risk field (lower half) */}
        <rect
          x={0}
          y={midY}
          width={W}
          height={midY}
          fill="hsl(var(--destructive))"
          opacity={0.04 + result.visual.riskField / 800}
        />
        {/* Growth field (upper half) */}
        <rect
          x={0}
          y={0}
          width={W}
          height={midY}
          fill="hsl(var(--primary))"
          opacity={0.04 + result.visual.growthField / 800}
        />
        {/* Axis */}
        <line x1={padX} y1={midY} x2={W - padX} y2={midY} stroke="hsl(var(--border))" strokeDasharray="1 4" />
        {horizons.map((h, i) => (
          <g key={h}>
            <line x1={xFor(i)} y1={midY - 4} x2={xFor(i)} y2={midY + 4} stroke="hsl(var(--border))" />
            <text
              x={xFor(i)}
              y={H - 6}
              fontSize={9}
              textAnchor="middle"
              fill="hsl(var(--muted-foreground))"
              fontFamily="ui-monospace, monospace"
            >
              {h}
            </text>
          </g>
        ))}
        {/* Uncertainty band around corrected path */}
        {(() => {
          const t = result.trajectories.corrected_path;
          const band = result.visual.uncertaintyBand / 4;
          const top = t.coords.map((c, i) => `${xFor(i)},${yFor(c.y + band)}`).join(" ");
          const bot = t.coords
            .slice()
            .reverse()
            .map((c, i) => `${xFor(horizons.length - 1 - i)},${yFor(c.y - band)}`)
            .join(" ");
          return (
            <polygon
              points={`${top} ${bot}`}
              fill="hsl(var(--primary))"
              opacity={0.08}
            />
          );
        })()}
        {/* Trajectory paths */}
        {(Object.keys(PATH_STYLE) as TrajectoryName[]).map((name) => {
          const t = result.trajectories[name];
          const style = PATH_STYLE[name];
          const d = t.coords
            .map((c, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(c.y)}`)
            .join(" ");
          return (
            <g key={name}>
              <path d={d} fill="none" stroke={style.stroke} strokeWidth={name === "corrected_path" ? 2.2 : 1.5} strokeDasharray={style.dash} />
              {t.coords.map((c, i) => (
                <circle
                  key={i}
                  cx={xFor(i)}
                  cy={yFor(c.y)}
                  r={name === "corrected_path" ? 2.6 : 1.8}
                  fill={style.stroke}
                />
              ))}
            </g>
          );
        })}
        {/* Current self marker */}
        <circle cx={padX} cy={midY} r={5} fill="hsl(var(--primary))" />
        <circle cx={padX} cy={midY} r={9} fill="none" stroke="hsl(var(--primary))" opacity={0.4} />
        <text x={padX + 8} y={midY - 8} fontSize={9} fill="hsl(var(--foreground))" fontFamily="ui-monospace, monospace">
          NOW
        </text>
      </svg>
      <div className="mt-2 flex flex-wrap gap-3">
        {(Object.keys(PATH_STYLE) as TrajectoryName[]).map((name) => (
          <div key={name} className="flex items-center gap-1.5">
            <span
              className="inline-block h-1 w-4 rounded-sm"
              style={{ background: PATH_STYLE[name].stroke }}
            />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {PATH_STYLE[name].label} {Math.round(result.trajectories[name].probability * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}