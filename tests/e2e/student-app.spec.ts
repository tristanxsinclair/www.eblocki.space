import { test, expect, type Page } from "@playwright/test";

const userId = "11111111-1111-4111-8111-111111111111";
const backend = new URL(process.env.VITE_SUPABASE_URL!);
const today = "2026-09-14";
type Row = Record<string, unknown>;

async function studentSession(
  page: Page,
  options: {
    empty?: boolean;
    failSave?: boolean;
    strength?: string;
    failReads?: boolean;
  } = {},
) {
  const user = {
    id: userId,
    email: "alex@example.test",
    aud: "authenticated",
    role: "authenticated",
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  const token = [
    "e30",
    Buffer.from(JSON.stringify({ sub: userId, exp: 2000000000 })).toString(
      "base64url",
    ),
    "test",
  ].join(".");
  await page.clock.setFixedTime(new Date("2026-09-13T16:10:00Z"));
  await page.addInitScript(
    ({ key, session }) => localStorage.setItem(key, JSON.stringify(session)),
    {
      key: `sb-${backend.hostname.split(".")[0]}-auth-token`,
      session: {
        access_token: token,
        refresh_token: "local-test",
        expires_at: 2000000000,
        token_type: "bearer",
        user,
      },
    },
  );
  const tables: Record<string, Row[]> = {
    profiles: [
      {
        id: userId,
        full_name: "Alex Morgan",
        email: user.email,
        access_level: "free",
      },
    ],
    user_onboarding_profiles: [
      {
        user_id: userId,
        seen_welcome: true,
        completed_onboarding: true,
        roles: ["Student"],
        goals: ["Finish my exam revision", "Build a consistent study routine"],
        identity_summary: "Second-year student working towards exam week.",
        timezone: "Australia/Perth",
        timezone_source: "manual",
      },
    ],
    user_modes: [
      {
        user_id: userId,
        mode_id: "LAW_MAX",
        display_name: "Law",
        is_active: true,
      },
    ],
    daily_control_sheets: options.empty
      ? []
      : [
          {
            user_id: userId,
            sheet_date: today,
            prime_objective: "Finish five practice questions",
            next_best_action: "Start with question one on the practice paper.",
          },
        ],
    proof_commitments: options.empty
      ? []
      : [
          {
            id: "task-1",
            user_id: userId,
            title: "Finish five practice questions",
            required_artifact: "Five worked answers",
            due_date: today,
            domain: "law_max",
            status: "pending",
          },
        ],
    proof_artifacts: options.empty
      ? []
      : [
          {
            id: "proof-1",
            user_id: userId,
            title: "Worked through statutory interpretation",
            domain: "law_max",
            evidence_strength: options.strength ?? "strong",
            quality_score: options.strength === "weak" ? 2 : 8,
            created_at: "2026-09-13T16:05:00Z",
          },
        ],
  };
  const writes: { table: string; body: Row }[] = [];
  let failSave = options.failSave;
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (["localhost", "127.0.0.1"].includes(url.hostname))
      return route.continue();
    if (url.origin !== backend.origin) return route.fulfill({ json: {} });
    if (url.pathname.startsWith("/auth/")) return route.fulfill({ json: user });
    const table = url.pathname.split("/rest/v1/")[1];
    if (!table) return route.fulfill({ json: {} });
    if (request.method() !== "GET" && request.method() !== "HEAD") {
      const body = request.postDataJSON() as Row;
      writes.push({ table, body });
      if (table === "daily_control_sheets" && failSave) {
        failSave = false;
        return route.fulfill({
          status: 503,
          json: { message: "Temporary connection failure" },
        });
      }
      if (table === "proof_commitments") {
        const existing = tables[table].findIndex((row) => row.id === body.id);
        if (existing >= 0) tables[table][existing] = body;
        else tables[table].push(body);
      } else tables[table] = [body];
      return route.fulfill({ status: 201, json: body });
    }
    if (options.failReads && table === "profiles")
      return route.fulfill({ status: 503, json: { message: "Offline" } });
    const rows = tables[table] ?? [];
    const singular = request.headers().accept?.includes("vnd.pgrst.object");
    const total =
      table === "proof_artifacts" &&
      !options.empty &&
      !url.searchParams.has("created_at")
        ? 42
        : rows.length;
    return route.fulfill({
      json: singular ? (rows[0] ?? null) : rows,
      headers: {
        "content-range": `0-${Math.max(0, rows.length - 1)}/${total}`,
        "access-control-expose-headers": "content-range",
      },
    });
  });
  return { tables, writes };
}

test.use({ timezoneId: "Australia/Perth", reducedMotion: "reduce" });

for (const width of [320, 390, 768, 1440]) {
  test(`student overview and navigation fit ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await studentSession(page);
    await page.goto("/dashboard");
    await expect(page.getByText("Good to see you, Alex.")).toBeVisible();
    await expect(page.getByText("Progress made today")).toBeVisible();
    await expect(page.getByLabel("Monday: work logged")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Finish five practice questions" }),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Production checkout");
    const nav = page.getByRole("navigation", {
      name: width < 768 ? "Primary mobile navigation" : "Primary navigation",
      exact: true,
    });
    await expect(nav.getByRole("link")).toHaveCount(5);
    await page.screenshot({
      path: testInfo.outputPath(`today-${width}.png`),
      fullPage: true,
    });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    if (width < 768) {
      const box = await nav.boundingBox();
      expect(box!.y + box!.height).toBeLessThanOrEqual(845);
      expect(box!.y + box!.height).toBeGreaterThanOrEqual(843);
    }
    await nav.getByRole("link", { name: "Profile", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Alex Morgan" }),
    ).toBeVisible();
    await expect(page.getByText("42", { exact: true })).toBeVisible();
    await expect(page.getByText("Finish my exam revision")).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`profile-${width}.png`),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await nav.getByRole("link", { name: "Plan", exact: true }).click();
    await expect(page.getByLabel("What do you want to finish?")).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`plan-${width}.png`),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("a new student can plan before logging work and retry without duplicate tasks", async ({
  page,
}) => {
  const { tables, writes } = await studentSession(page, {
    empty: true,
    failSave: true,
  });
  await page.goto("/start-today");
  await page
    .getByLabel("What do you want to finish?")
    .fill("Complete my chemistry practice");
  await page.getByLabel("Study area", { exact: true }).selectOption("LAW_MAX");
  await page
    .getByLabel("What will show it's done?")
    .fill("Five worked answers with corrections");
  await page.getByRole("button", { name: "Save today's plan" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Your draft is still here",
  );
  await expect(page.getByLabel("What do you want to finish?")).toHaveValue(
    "Complete my chemistry practice",
  );
  await page.getByRole("button", { name: "Save today's plan" }).click();
  await expect(
    page.getByRole("heading", { name: "Your plan is saved." }),
  ).toBeVisible();
  expect(tables.proof_commitments).toHaveLength(1);
  expect(
    writes
      .filter((write) => write.table === "proof_commitments")
      .map((write) => write.body.id),
  ).toEqual([tables.proof_commitments[0].id, tables.proof_commitments[0].id]);
  await page.getByRole("link", { name: "Back to Today" }).click();
  await expect(
    page.getByRole("heading", { name: "Complete my chemistry practice" }),
  ).toBeVisible();
  await expect(page.getByText("Progress made today")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Log your work", exact: true }),
  ).toHaveAttribute(
    "href",
    `/proof?contract=${tables.proof_commitments[0].id}`,
  );
});

test("weak evidence is recorded without claiming counted progress", async ({
  page,
}) => {
  await studentSession(page, { strength: "weak" });
  await page.goto("/today");
  await expect(page.getByText("Your focus", { exact: true })).toBeVisible();
  await expect(page.getByText("Weak proof", { exact: true })).toBeVisible();
  await expect(page.getByText("Progress made today")).toHaveCount(0);
});

test("read failures show recovery instead of invented zero progress", async ({
  page,
}) => {
  await studentSession(page, { failReads: true });
  await page.goto("/profile");
  await expect(page.getByRole("alert")).toContainText("couldn't be loaded", {
    timeout: 20000,
  });
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(page.getByText("Total entries", { exact: true })).toHaveCount(0);
});

test("coach, work log, and welcome stay usable on a small phone", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await studentSession(page);
  for (const [path, heading] of [
    ["/coach", "Coach"],
    ["/proof", "Log your work"],
    ["/welcome", "Make yourself at home."],
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`${path.slice(1)}-390.png`),
      fullPage: true,
    });
  }
  await page.getByLabel("Your name", { exact: true }).fill("Alex Morgan");
  await page
    .getByLabel("A goal you're working towards")
    .fill("Finish my revision");
  await page.getByRole("button", { name: "Start my day" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
