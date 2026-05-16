import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export interface CompletionPayload {
  proof: string;
  hard: string | null;
  upgrade: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectiveTitle: string;
  onSubmit: (payload: CompletionPayload) => Promise<void> | void;
}

/**
 * Proof reflection dialog — gates completion behind an honest answer to
 * "what proof did you create?". Optional follow-ups capture friction and
 * the upgrade for next time. The hard requirement is a single, non-empty,
 * non-trivial proof string. Two anti-waffle checks:
 *   - minimum 12 characters
 *   - must not be a generic placeholder ("done", "yes", etc.)
 */
const WAFFLE_PATTERNS = /^(done|yes|ok|finished|complete|did it|na|n\/a|nothing)\b/i;

export function CompletionReflection({ open, onOpenChange, objectiveTitle, onSubmit }: Props) {
  const [proof, setProof] = useState("");
  const [hard, setHard] = useState("");
  const [upgrade, setUpgrade] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setProof("");
    setHard("");
    setUpgrade("");
  };

  const handle = async () => {
    const trimmed = proof.trim();
    if (trimmed.length < 12) {
      toast.error("Be specific. What did you actually produce?");
      return;
    }
    if (WAFFLE_PATTERNS.test(trimmed)) {
      toast.error("Anti-waffle check: describe the artifact, not the feeling.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        proof: trimmed,
        hard: hard.trim() || null,
        upgrade: upgrade.trim() || null,
      });
      reset();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!submitting) {
          if (!v) reset();
          onOpenChange(v);
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Proof of completion</DialogTitle>
          <DialogDescription className="text-xs">
            {objectiveTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div>
            <Label htmlFor="proof" className="text-xs font-mono uppercase tracking-widest">
              What proof did you create? *
            </Label>
            <Textarea
              id="proof"
              value={proof}
              onChange={(e) => setProof(e.target.value)}
              rows={3}
              placeholder="e.g. IRAC paragraph on Mabo v Queensland — saved to Notion."
              className="mt-1.5 text-sm"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="hard" className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              What made this hard?
            </Label>
            <Textarea
              id="hard"
              value={hard}
              onChange={(e) => setHard(e.target.value)}
              rows={2}
              placeholder="Optional"
              className="mt-1.5 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="upgrade" className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Upgrade for next time?
            </Label>
            <Textarea
              id="upgrade"
              value={upgrade}
              onChange={(e) => setUpgrade(e.target.value)}
              rows={2}
              placeholder="Optional"
              className="mt-1.5 text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            size="sm"
          >
            Cancel
          </Button>
          <Button onClick={handle} disabled={submitting} size="sm">
            {submitting ? "Logging…" : "Log proof"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}