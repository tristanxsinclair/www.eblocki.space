import { Link } from "react-router-dom";
import {
  BookOpen,
  ChevronRight,
  LogOut,
  Plus,
  Settings,
  Target,
} from "lucide-react";
import { AppShell } from "@/components/eblocki/AppShell";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { StudentActivity } from "@/components/eblocki/StudentActivity";
import { StudentPageState } from "@/components/eblocki/StudentPageState";
import { useStudentOverview } from "@/hooks/useStudentOverview";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function Profile() {
  const { data, name, isPending, isError, refetch } = useStudentOverview();
  const { user, signOut } = useAuth();
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <AppShell>
      <Seo
        title="Profile | Eblocki"
        description="Your goals, study areas, and progress in one place."
        path="/profile"
      />
      <div className="student-page">
        <header className="student-page-header">
          <h1 className="student-title">Profile</h1>
          <Button asChild variant="outline">
            <Link to="/settings">
              <Settings className="mr-2 h-4 w-4" />
              Edit profile
            </Link>
          </Button>
        </header>
        {isPending || isError || !data ? (
          <StudentPageState error={isError} retry={() => void refetch()} />
        ) : (
          <>
            <section className="flex min-w-0 items-start gap-4 border-b border-border pb-7">
              <div className="student-avatar" aria-hidden="true">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="break-words text-2xl font-semibold leading-snug">
                  {name}
                </h2>
                <p className="mt-1 break-words text-sm text-muted-foreground">
                  {data.profile?.roles?.join(" / ") || "Student"}
                </p>
                {data.profile?.identity_summary && (
                  <p className="mt-3 max-w-2xl break-words text-sm leading-6 text-muted-foreground">
                    {data.profile.identity_summary}
                  </p>
                )}
              </div>
            </section>
            <dl className="grid grid-cols-3 divide-x divide-border border-b border-border pb-6">
              {[
                { label: "Total entries", value: data.totalLogs },
                { label: "This week", value: data.weekLogs },
                { label: "Study areas", value: data.areas.length },
              ].map(({ label, value }) => (
                <div key={label} className="min-w-0 px-3 first:pl-0">
                  <dd className="text-2xl font-semibold tabular-nums">
                    {value}
                  </dd>
                  <dt className="mt-1 text-xs text-muted-foreground">
                    {label}
                  </dt>
                </div>
              ))}
            </dl>
            <div className="student-columns">
              <section className="student-section">
                <div className="student-section-heading">
                  <h2>My goals</h2>
                  <Target className="h-4 w-4 text-primary" />
                </div>
                {data.profile?.goals?.length ? (
                  <ul className="mt-2 divide-y divide-border">
                    {data.profile.goals.map((goal, index) => (
                      <li
                        key={`${goal}-${index}`}
                        className="flex gap-3 py-4 text-sm leading-6"
                      >
                        <span className="text-muted-foreground tabular-nums">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="break-words">{goal}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="py-5">
                    <p className="text-sm text-muted-foreground">
                      What are you working towards?
                    </p>
                    <Link to="/settings" className="student-text-link mt-3">
                      Add a goal
                      <Plus className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </section>
              <section className="student-section">
                <div className="student-section-heading">
                  <h2>Study areas</h2>
                  <Link to="/modes" className="student-text-link">
                    Manage
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
                {data.areas.length ? (
                  <ul className="mt-2 divide-y divide-border">
                    {data.areas.map((area) => (
                      <li key={area.mode_id}>
                        <Link
                          to={`/modes/${encodeURIComponent(area.mode_id)}`}
                          className="flex items-center gap-3 py-4"
                        >
                          <BookOpen className="h-4 w-4 shrink-0 text-primary" />
                          <span className="min-w-0 flex-1 break-words text-sm">
                            {area.display_name}
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="py-5">
                    <p className="text-sm text-muted-foreground">
                      No study areas added yet.
                    </p>
                    <Link to="/modes" className="student-text-link mt-3">
                      Add an area
                      <Plus className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </section>
            </div>
            <section className="student-section">
              <div className="student-section-heading">
                <h2>Recent work</h2>
                <span className="text-xs text-muted-foreground">
                  Latest entries
                </span>
              </div>
              <StudentActivity proofs={data.recent} />
            </section>
            <section className="student-section">
              <div className="student-section-heading">
                <h2>Account</h2>
              </div>
              <p className="mt-4 break-words text-sm text-muted-foreground">
                {data.account?.email || user?.email}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
                <Link to="/settings" className="student-text-link">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                <Link to="/legal/privacy" className="student-text-link">
                  Privacy
                </Link>
                <button
                  className="student-text-link"
                  onClick={() =>
                    void signOut().catch(() =>
                      toast.error("Couldn't sign out. Please try again."),
                    )
                  }
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
