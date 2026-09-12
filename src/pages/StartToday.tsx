import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Loader2, Plus, Save } from "lucide-react";
import { AppShell } from "@/components/eblocki/AppShell";
import { StudentPageState } from "@/components/eblocki/StudentPageState";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useStudentOverview } from "@/hooks/useStudentOverview";
import { supabase } from "@/integrations/supabase/client";

const EMPTY_PLAN = {
  objective: "",
  area: "EBLOCKI",
  nextAction: "",
  evidence: "",
};

export default function StartToday() {
  const { user } = useAuth();
  const { data, today, isPending, isError, refetch } = useStudentOverview();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_PLAN);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A stable ID makes retries safe if the connection drops after an insert.
  const [draftId, setDraftId] = useState(() => crypto.randomUUID());
  const [planDate, setPlanDate] = useState(today);

  useEffect(() => {
    if (today !== planDate) {
      setPlanDate(today);
      setSavedId(null);
      setDraftId(crypto.randomUUID());
    }
  }, [today, planDate]);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || saving || !form.objective.trim() || !form.evidence.trim())
      return;
    setSaving(true);
    setError(null);
    try {
      const { error: taskError } = await supabase
        .from("proof_commitments")
        .upsert({
          id: draftId,
          user_id: user.id,
          domain: form.area.toLowerCase(),
          mode: form.area,
          title: form.objective.trim(),
          required_artifact: form.evidence.trim(),
          evidence_standard:
            "Concrete artifact + applied detail + reflection + next upgrade.",
          status: "pending",
          due_date: today,
        });
      if (taskError) throw taskError;
      const { error: sheetError } = await supabase
        .from("daily_control_sheets")
        .upsert(
          {
            user_id: user.id,
            sheet_date: today,
            prime_objective: form.objective.trim(),
            next_best_action: form.nextAction.trim() || form.objective.trim(),
          },
          { onConflict: "user_id,sheet_date" },
        );
      if (sheetError) throw sheetError;
      setSavedId(draftId);
      await queryClient.invalidateQueries({
        queryKey: ["student-overview", user.id],
      });
    } catch {
      setError(
        "We couldn't finish saving your plan. Your draft is still here. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <Seo
        title="Plan | Eblocki"
        description="Choose one task and a clear next step for today."
        path="/start-today"
      />
      <div className="student-page max-w-3xl">
        <header className="student-page-header">
          <div>
            <p className="student-eyebrow">A little direction</p>
            <h1 className="student-title">Plan your day</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              One task you can move forward today.
            </p>
          </div>
        </header>
        {savedId ? (
          <section className="student-focus" role="status">
            <CheckCircle2 className="h-7 w-7 text-primary" />
            <h2 className="mt-4 text-xl font-semibold">Your plan is saved.</h2>
            <p className="mt-3 break-words text-sm leading-6">
              {form.objective}
            </p>
            <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
              {form.nextAction || form.evidence}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/dashboard">
                  Back to Today
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={`/proof?contract=${encodeURIComponent(savedId)}`}>
                  Log this task
                </Link>
              </Button>
            </div>
            <button
              className="student-text-link mt-4"
              onClick={() => {
                setSavedId(null);
                setForm(EMPTY_PLAN);
                setDraftId(crypto.randomUUID());
              }}
            >
              <Plus className="h-4 w-4" />
              Plan another task
            </button>
          </section>
        ) : isPending || isError || !data ? (
          <StudentPageState error={isError} retry={() => void refetch()} />
        ) : (
          <form
            onSubmit={save}
            className="space-y-6 border-t border-border pt-7"
          >
            <fieldset disabled={saving} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="plan-objective">
                  What do you want to finish?
                </Label>
                <Input
                  id="plan-objective"
                  required
                  maxLength={300}
                  value={form.objective}
                  onChange={(event) =>
                    setForm({ ...form, objective: event.target.value })
                  }
                  placeholder="Finish five practice questions"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-area">Study area</Label>
                <select
                  id="plan-area"
                  className="student-select"
                  value={form.area}
                  onChange={(event) =>
                    setForm({ ...form, area: event.target.value })
                  }
                >
                  <option value="EBLOCKI">General</option>
                  {data.areas.map((area) => (
                    <option key={area.mode_id} value={area.mode_id}>
                      {area.display_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-next">
                  First step{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="plan-next"
                  maxLength={500}
                  value={form.nextAction}
                  onChange={(event) =>
                    setForm({ ...form, nextAction: event.target.value })
                  }
                  placeholder="Open the practice paper and start question one"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-evidence">What will show it's done?</Label>
                <Textarea
                  id="plan-evidence"
                  required
                  maxLength={1000}
                  rows={3}
                  value={form.evidence}
                  onChange={(event) =>
                    setForm({ ...form, evidence: event.target.value })
                  }
                  placeholder="My five worked answers with corrections"
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </fieldset>
            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
              <Button
                type="submit"
                disabled={
                  saving || !form.objective.trim() || !form.evidence.trim()
                }
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {saving ? "Saving..." : "Save today's plan"}
              </Button>
              <Button asChild variant="ghost">
                <Link to="/dashboard">Cancel</Link>
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
