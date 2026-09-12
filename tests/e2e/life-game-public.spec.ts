import { expect, test } from "@playwright/test";

test.describe("public life-game settlement replay", () => {
  test("presents the full life game on mobile without horizontal overflow", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Stop fake productivity. Turn effort into proof." }),
    ).toBeVisible();
    await expect(page.getByText("Five steps. Two minutes a day.")).toBeVisible();
    await expect(page.getByText("You cannot award yourself progress.")).toBeVisible();
    await expect(page.getByText("No proof, no progress")).toBeVisible();

    const overflow = await page.evaluate(
      () =>
        Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });

  test("reveals committed verdict and XP, stays contained, and dismisses cleanly", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.goto("/demo?result=demo-log-action-1");

    const settlement = page.getByRole("region", { name: "Evidence settlement" });
    await expect(settlement).toBeVisible();
    await expect(
      settlement.getByRole("heading", { name: "Verdict committed. Character updated." }),
    ).toBeVisible();
    await expect(settlement.getByText("Submitted a timed issue analysis")).toBeVisible();
    await expect(settlement.getByText("+96", { exact: true })).toBeVisible();
    await expect(settlement.getByText("elite", { exact: true })).toHaveCount(2);
    await expect(page.getByRole("list", { name: "Today run protocol" })).toBeVisible();
    await expect(page.getByText("One evidence cycle is complete.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Start your run" })).toHaveCount(1);
    await expect(page.locator("a button, button a")).toHaveCount(0);

    const overflow = await page.evaluate(
      () =>
        Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);

    await settlement.getByRole("button", { name: "Dismiss evidence settlement" }).click();
    await expect(page).toHaveURL(/\/demo$/);
    await expect(settlement).toHaveCount(0);
    expect(consoleErrors).toEqual([]);
  });

  test("keeps a partial evidence transaction pending without character XP", async ({ page }) => {
    await page.goto("/demo?result=demo-log-action-3");

    const settlement = page.getByRole("region", { name: "Evidence settlement" });
    await expect(settlement).toBeVisible();
    await expect(
      settlement.getByRole("heading", { name: "Artifact committed. Settlement pending." }),
    ).toBeVisible();
    await expect(settlement.getByText("sync pending", { exact: true })).toBeVisible();
    await expect(settlement.getByText("+96", { exact: true })).toHaveCount(0);
  });

  test("ignores an arbitrary result query instead of trusting URL content", async ({ page }) => {
    await page.goto("/demo?result=invented-result");

    await expect(page.getByRole("region", { name: "Evidence settlement" })).toHaveCount(0);
    await expect(page.getByText("Verdict committed. Character updated.")).toHaveCount(0);
  });
});
