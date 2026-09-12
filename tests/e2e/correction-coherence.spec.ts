import { test, expect, type Page } from "@playwright/test";
import { original, corrected } from "../../src/lib/eblocki/__tests__/fixtures/perception";
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
        mode_id: "PSYCH_HD",
        display_name: "Psychology",
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
            id: "22222222-2222-4222-8222-222222222222",
            user_id: userId,
            title: "Finish five practice questions",
            required_artifact: "Five worked answers",
            due_date: today,
            domain: "psychology",
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
            domain: "psychology",
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
      const existingRows = tables[table] ?? [];
      const singular = request.headers().accept?.includes("vnd.pgrst.object");
      let row: Row;
      if (request.method() === "PATCH") {
        const id = url.searchParams.get("id")?.replace(/^eq\./, "");
        const existing = existingRows.find(r => r.id === id);
        if (!existing) return route.fulfill({json: singular ? null : []});
        Object.assign(existing, body); row = existing;
      } else {
        row = {id: crypto.randomUUID(),created_at: "2026-09-13T16:10:00Z",...body};
        tables[table] = [...existingRows, row];
      }
      return route.fulfill({ status: 201, json: singular ? row : [row] });
    }
    if (options.failReads && table === "profiles")
      return route.fulfill({ status: 503, json: { message: "Offline" } });
    const rows = (tables[table] ?? []).filter(row => {
      for (const key of ["id", "status"]) {
        const value = url.searchParams.get(key);
        if (value?.startsWith("eq.") && row[key] !== value.slice(3)) return false;
      }
      return true;
    });
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


for (const width of [320,390,768,1440]) {
 test(`correction persists and stays coherent at ${width}px`, async ({page}, testInfo) => {
  await page.setViewportSize({width,height:900});
  const {tables,writes} = await studentSession(page);
  tables.proof_artifacts = [];
  await page.goto("/proof?contract=22222222-2222-4222-8222-222222222222");
  await page.locator("#proof-title").fill(original.title);
  await page.locator("#proof-content").fill(original.content);
  await page.getByRole("button",{name:"Submit proof",exact:true}).first().click();
  await expect(page.locator("#proof-result-heading")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("not strong evidence yet");
  expect(tables.proof_artifacts).toHaveLength(1);
  const firstId = tables.proof_artifacts[0].id;
  expect(tables.proof_commitments[0].proof_artifact_id).toBe(firstId);
  await page.getByRole("button",{name:"Submit corrected attempt",exact:true}).click();
  await expect(page).toHaveURL(/corrects=/);
  await page.reload();
  await page.locator("#proof-title").fill(corrected.title);
  await page.locator("#proof-content").fill(corrected.content);
  await page.getByRole("button",{name:"Submit proof",exact:true}).first().click();
  await expect(page.locator("#feedback").first().getByTestId("correction-comparison")).toBeVisible();
  expect(tables.proof_artifacts).toHaveLength(2);
  expect(tables.proof_artifacts[1].parent_artifact_id).toBe(firstId);
  expect(tables.proof_commitments[0].proof_artifact_id).toBe(firstId);
  expect(writes.filter(w=>w.table==="proof_commitments")).toHaveLength(1);
  await expect(page.locator("body")).not.toContainText("not strong evidence yet");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath(`correction-${width}.png`),fullPage:true});
  await page.reload();
  // Historical comparison must remain available after the transient verdict is gone.
  await expect(page.getByTestId("correction-comparison")).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 });
}

test("missing parent fails closed without creating an unrelated artifact", async ({page}) => {
  const {tables} = await studentSession(page);
  tables.proof_artifacts = [];
  await page.goto("/proof?mode=PSYCH_HD&corrects=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  await page.locator("#proof-title").fill(corrected.title);
  await page.locator("#proof-content").fill(corrected.content);
  await page.getByRole("button",{name:"Submit proof",exact:true}).first().click();
  await expect(page.getByText("The original proof could not be verified. Reopen it before submitting a correction.")).toBeVisible();
  expect(tables.proof_artifacts).toHaveLength(0);
});
