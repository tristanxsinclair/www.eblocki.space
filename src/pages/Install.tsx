import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Share, Plus, Download, Smartphone } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function Install() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true);

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-12 font-mono">
      <div className="max-w-md mx-auto space-y-8">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Smartphone className="h-3 w-3" /> Install EBLOCKI
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Put the court of evidence on your home screen.
          </h1>
          <p className="text-sm text-muted-foreground">
            Installs like a native app. No app store. Opens full-screen.
          </p>
        </header>

        {isStandalone || installed ? (
          <div className="rounded-sm border border-border bg-muted/20 p-4 text-sm">
            ✅ Installed. Launch EBLOCKI from your home screen.
          </div>
        ) : (
          <>
            {deferred && (
              <Button onClick={handleInstall} className="w-full" size="lg">
                <Download className="mr-2 h-4 w-4" /> Install now
              </Button>
            )}

            <section className="space-y-3">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
                {isIOS ? "iPhone / iPad (Safari)" : "On iPhone (Safari)"}
              </h2>
              <ol className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <span className="text-muted-foreground">1.</span>
                  <span>
                    Tap the <Share className="inline h-4 w-4 align-text-bottom" /> Share button
                    in Safari's toolbar.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-muted-foreground">2.</span>
                  <span>
                    Scroll and tap <strong>Add to Home Screen</strong>{" "}
                    <Plus className="inline h-4 w-4 align-text-bottom" />.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-muted-foreground">3.</span>
                  <span>Tap <strong>Add</strong>. The EBLOCKI icon appears on your home screen.</span>
                </li>
              </ol>
            </section>

            <section className="space-y-3">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
                On Android (Chrome)
              </h2>
              <ol className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <span className="text-muted-foreground">1.</span>
                  <span>Tap the <strong>⋮</strong> menu in Chrome.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-muted-foreground">2.</span>
                  <span>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-muted-foreground">3.</span>
                  <span>Confirm. Launches full-screen like a native app.</span>
                </li>
              </ol>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
