import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StudentPageState({
  error,
  retry,
}: {
  error?: boolean;
  retry: () => void;
}) {
  return error ? (
    <div role="alert" className="space-y-3 py-10">
      <p className="font-medium">Your information couldn't be loaded.</p>
      <p className="text-sm text-muted-foreground">
        Check your connection and try again.
      </p>
      <Button variant="outline" onClick={retry}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Try again
      </Button>
    </div>
  ) : (
    <div
      role="status"
      className="flex items-center gap-3 py-12 text-sm text-muted-foreground"
    >
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading your information...
    </div>
  );
}
