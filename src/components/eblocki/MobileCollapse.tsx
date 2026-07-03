import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Mobile-only collapse. On screens >= md (768px) the children are always
 * rendered and the toggle button is hidden. Below md the section is
 * collapsed by default and reveals on tap.
 *
 * Use this to keep the desktop dashboard fully expanded while giving
 * mobile users a single-command first-screen experience.
 */
interface MobileCollapseProps {
  /** Short label shown on the toggle button, e.g. "View forecast details". */
  label: string;
  /** Optional small caption rendered above the label (uppercase mono). */
  eyebrow?: string;
  /** Default open state on mobile. Defaults to false. */
  defaultOpen?: boolean;
  /** Optional tracking id for analytics call sites. */
  trackId?: string;
  /** Optional handler fired when the section is opened on mobile. */
  onOpen?: (id: string | undefined) => void;
  children: ReactNode;
}

export function MobileCollapse({
  label,
  eyebrow,
  defaultOpen = false,
  trackId,
  onOpen,
  children,
}: MobileCollapseProps) {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = () => {
    setOpen((current) => {
      const next = !current;
      if (next && onOpen) onOpen(trackId);
      return next;
    });
  };

  return (
    <div className="w-full max-w-full">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="md:hidden w-full min-h-[44px] rounded-sm border border-border bg-card/50 px-3 py-2 text-left transition-colors hover:border-primary/40 flex items-center justify-between gap-3"
      >
        <div className="min-w-0">
          {eyebrow && (
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {eyebrow}
            </div>
          )}
          <div className="text-sm text-foreground truncate">{label}</div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div className={`${open ? "block" : "hidden"} md:block mt-3 md:mt-0`}>
        {children}
      </div>
    </div>
  );
}