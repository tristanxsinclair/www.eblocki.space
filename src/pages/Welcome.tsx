import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2 } from "lucide-react";
import { EblockiLogo } from "@/components/eblocki/EblockiLogo";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const AREAS = [
  { id: "LAW_MAX", name: "Law" },
  { id: "PSYCH_HD", name: "Psychology" },
  { id: "EBLOCKI_BUILD", name: "Projects & coding" },
  { id: "ATHLETE_MODE", name: "Sport & wellbeing" },
  { id: "GENERAL_EXECUTION", name: "General study" },
];

export default function Welcome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [areas, setAreas] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async (skip = false) => {
    if (!user || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (!skip && name.trim()) {
        const result = await supabase
          .from("profiles")
          .update({ full_name: name.trim() })
          .eq("id", user.id);
        if (result.error) throw result.error;
      }
      if (!skip && areas.length) {
        const result = await supabase.from("user_modes").upsert(
          areas.map((id) => ({
            user_id: user.id,
            mode_id: id,
            display_name: AREAS.find((area) => area.id === id)!.name,
            is_active: true,
          })),
          { onConflict: "user_id,mode_id" },
        );
        if (result.error) throw result.error;
      }
      const result = await supabase.from("user_onboarding_profiles").upsert(
        {
          user_id: user.id,
          seen_welcome: true,
          ...(!skip && goal.trim() ? { goals: [goal.trim()] } : {}),
        },
        { onConflict: "user_id" },
      );
      if (result.error) throw result.error;
      await queryClient.invalidateQueries({
        queryKey: ["student-overview", user.id],
      });
      navigate("/dashboard", { replace: true });
    } catch {
      setError("We couldn't save your preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="student-app min-h-screen-safe px-5 py-8 safe-y">
      <Seo
        title="Welcome | Eblocki"
        description="Make Eblocki your own."
        path="/welcome"
      />
      <div className="mx-auto max-w-xl">
        <header className="flex items-center justify-between gap-4">
          <EblockiLogo variant="compact" size="lg" />
          <Button
            variant="ghost"
            disabled={saving}
            onClick={() => void finish(true)}
          >
            Skip for now
          </Button>
        </header>
        <div className="pb-7 pt-10">
          <h1 className="text-3xl font-semibold">Make yourself at home.</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Start with what matters to you today.
          </p>
        </div>
        <form
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            void finish();
          }}
        >
          <fieldset disabled={saving} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="welcome-name">Your name</Label>
              <Input
                id="welcome-name"
                autoComplete="name"
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="What should we call you?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="welcome-goal">
                A goal you're working towards
              </Label>
              <Input
                id="welcome-goal"
                maxLength={300}
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                placeholder="Feel prepared for my next exam"
              />
            </div>
            <fieldset>
              <legend className="mb-3 text-sm font-medium">
                Your study areas
              </legend>
              <div className="divide-y divide-border border-y border-border">
                {AREAS.map((area) => (
                  <label
                    key={area.id}
                    className="flex min-h-12 cursor-pointer items-center justify-between gap-3 py-3 text-sm"
                  >
                    <span>{area.name}</span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-primary"
                      checked={areas.includes(area.id)}
                      onChange={(event) =>
                        setAreas(
                          event.target.checked
                            ? [...areas, area.id]
                            : areas.filter((id) => id !== area.id),
                        )
                      }
                    />
                  </label>
                ))}
              </div>
            </fieldset>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Saving..." : "Start my day"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
