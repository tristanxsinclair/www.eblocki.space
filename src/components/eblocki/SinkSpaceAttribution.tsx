import { SINK_SPACE_HOME_URL } from "@/lib/eblocki/brand";

export function SinkSpaceAttribution() {
  const label = "A Sink Space product";
  if (!SINK_SPACE_HOME_URL) {
    return <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>;
  }
  return <a href={SINK_SPACE_HOME_URL} className="operator-interactive inline-flex min-h-11 items-center font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground" rel="noreferrer">{label}</a>;
}
