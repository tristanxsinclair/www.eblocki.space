import { Link, Navigate } from "react-router-dom";
import { addDays, format } from "date-fns";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  FilePlus2,
  MessageSquare,
  Plus,
} from "lucide-react";
import { AppShell } from "@/components/eblocki/AppShell";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { StudentActivity } from "@/components/eblocki/StudentActivity";
import { StudentPageState } from "@/components/eblocki/StudentPageState";
import { useStudentOverview } from "@/hooks/useStudentOverview";
import { useWelcomeGate } from "@/hooks/useWelcomeGate";
import { localDayKey } from "@/lib/eblocki/local-day";
import { plainVerdictLabel } from "@/lib/eblocki/user-facing-copy";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { data, name, today, weekStart, isPending, isError, refetch } =
    useStudentOverview();
  const welcome = useWelcomeGate();
  if (welcome === "needs") return <Navigate to="/welcome" replace />;
  const todayLogs =
    data?.week.filter((proof) => localDayKey(proof.created_at) === today) ?? [];
  const counted = todayLogs.some(
    (proof) =>
      plainVerdictLabel(proof.evidence_strength, proof.quality_score) ===
      "Counted",
  );
  const activeDays = new Set(
    data?.week.map((proof) => localDayKey(proof.created_at)),
  );
  const task = data?.sheet?.prime_objective
    ? data.tasks.find((item) => item.title === data.sheet?.prime_objective)
    : (data?.tasks.find((item) => item.due_date === today) ?? data?.tasks[0]);
  const title = data?.sheet?.prime_objective || task?.title;
  const proofHref = task
    ? `/proof?contract=${encodeURIComponent(task.id)}`
    : "/proof";

  return (
    <AppShell>
      <Seo
        title="Today | Eblocki"
        description="Your daily plan, study progress, and recent work."
        path="/today"
      />
      <div className="student-page">
        <header className="student-page-header">
          <div className="min-w-0">
            <p className="student-eyebrow">
              {format(new Date(`${today}T12:00:00`), "EEEE, d MMMM")}
            </p>
            <h1 className="student-title">Today</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Good to see you, {name.split(" ")[0]}.
            </p>
          </div>
          <Button asChild variant="outline" className="hidden sm:inline-flex">
            <Link to="/start-today">
              <Plus className="mr-2 h-4 w-4" />
              Plan a task
            </Link>
          </Button>
        </header>
        {isPending || isError || !data ? (
          <StudentPageState error={isError} retry={() => void refetch()} />
        ) : (
          <>
            <section className="student-focus" aria-labelledby="daily-focus">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                {counted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <BookOpen className="h-4 w-4" />
                )}
                {counted ? "Progress made today" : "Your focus"}
              </div>
              <h2
                id="daily-focus"
                className="mt-4 max-w-2xl break-words text-2xl font-semibold leading-snug"
              >
                {title ||
                  (counted
                    ? "A good day of work."
                    : "One task. A little progress.")}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                {data.sheet?.next_best_action ||
                  (title
                    ? task?.required_artifact
                    : counted
                      ? "Your work is recorded. Take a moment before your next task."
                      : "Choose something you can finish today.")}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild>
                  <Link
                    to={title || todayLogs.length ? proofHref : "/start-today"}
                  >
                    {title || todayLogs.length ? (
                      <FilePlus2 className="mr-2 h-4 w-4" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    {title || todayLogs.length
                      ? "Log your work"
                      : "Make today's plan"}
                    <ArrowRight className="ml-3 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link to="/coach">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Ask your coach
                  </Link>
                </Button>
              </div>
            </section>
            <div className="student-columns">
              <section
                className="student-section"
                aria-labelledby="week-heading"
              >
                <div className="student-section-heading">
                  <h2 id="week-heading">This week</h2>
                  <span className="text-xs text-muted-foreground">
                    {format(weekStart, "d MMM")} -{" "}
                    {format(addDays(weekStart, 6), "d MMM")}
                  </span>
                </div>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-3xl font-semibold tabular-nums">
                    {data.weekLogs}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {data.weekLogs === 1 ? "entry logged" : "entries logged"}
                  </span>
                </div>
                <ol
                  className="mt-5 grid grid-cols-7 gap-2"
                  aria-label="Work logged this week"
                >
                  {Array.from({ length: 7 }, (_, index) => {
                    const day = addDays(weekStart, index);
                    const key = localDayKey(day);
                    const logged = activeDays.has(key);
                    return (
                      <li
                        key={key}
                        aria-label={`${format(day, "EEEE")}: ${logged ? "work logged" : "no work logged"}`}
                        aria-current={key === today ? "date" : undefined}
                        className="flex min-w-0 flex-col items-center gap-2"
                      >
                        <span className="text-xs text-muted-foreground">
                          {format(day, "EEEEE")}
                        </span>
                        <span
                          className={cn(
                            "week-day",
                            logged && "is-logged",
                            key === today && "is-today",
                          )}
                        >
                          {logged ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <span>{format(day, "d")}</span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ol>
                <p className="mt-5 text-xs text-muted-foreground">
                  {activeDays.size}{" "}
                  {activeDays.size === 1 ? "active day" : "active days"} this
                  week
                </p>
              </section>
              <section className="student-section" aria-labelledby="up-next">
                <div className="student-section-heading">
                  <h2 id="up-next">Up next</h2>
                  <Link to="/start-today" className="student-text-link">
                    Plan
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
                {data.tasks.length ? (
                  <ul className="mt-2 divide-y divide-border">
                    {data.tasks.slice(0, 3).map((item) => (
                      <li key={item.id}>
                        <Link
                          to={`/proof?contract=${encodeURIComponent(item.id)}`}
                          className="group flex min-h-16 items-center gap-3 py-3"
                        >
                          <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 break-words text-sm leading-6 group-hover:text-primary">
                            {item.title}
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="py-6">
                    <p className="text-sm text-muted-foreground">
                      Your next task is up to you.
                    </p>
                    <Link to="/start-today" className="student-text-link mt-3">
                      Add a task
                      <Plus className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </section>
            </div>
            <section className="student-section" aria-labelledby="recent-work">
              <div className="student-section-heading">
                <h2 id="recent-work">Recent work</h2>
                <Link to="/profile" className="student-text-link">
                  Your profile
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <StudentActivity proofs={data.recent.slice(0, 4)} />
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
