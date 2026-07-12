import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deleting: boolean;
  onConfirm: () => void;
}

const CONFIRM_PHRASE = "DELETE";

/**
 * Destructive account-deletion confirmation.
 *
 * Replaces the previous `window.prompt` flow: mobile-safe, uses the app's
 * design system, and keeps the destructive button disabled until the user
 * types the exact confirmation phrase.
 */
export function DeleteAccountDialog({
  open,
  onOpenChange,
  deleting,
  onConfirm,
}: DeleteAccountDialogProps) {
  const [phrase, setPhrase] = useState("");

  useEffect(() => {
    if (!open) setPhrase("");
  }, [open]);

  const matched = phrase.trim() === CONFIRM_PHRASE;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete account permanently?</AlertDialogTitle>
          <AlertDialogDescription>
            This erases every proof artifact, control sheet, mode, attachment,
            and identity ledger entry tied to this account. Any active
            subscription will be cancelled with Stripe. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="delete-account-confirm" className="text-sm">
            Type <span className="font-mono font-semibold">{CONFIRM_PHRASE}</span> to confirm.
          </Label>
          <Input
            id="delete-account-confirm"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            disabled={deleting}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              if (matched && !deleting) onConfirm();
            }}
            disabled={!matched || deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? "Deleting…" : "Delete account"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}