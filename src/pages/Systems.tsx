import { AppShell } from "@/components/eblocki/AppShell";
import { Card } from "@/components/ui/card";
import { Seo } from "@/components/Seo";

export default function Systems() {
  return (
    <AppShell>
      <Seo title="Systems | EBLOCKI" description="Custom systems module." path="/systems" />
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <Card className="panel p-6 border-border/80 bg-card/50">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Systems</div>
          <h1 className="mt-2 text-xl font-semibold">System Forge is being rebuilt</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Custom systems are temporarily offline while the schema is being updated. Continue submitting proof from the Proof page.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
