#!/usr/bin/env node
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const port = Number(process.env.RENDER_GUARD_PORT ?? 4175);
const baseUrl = `http://127.0.0.1:${port}`;
const routes = [
  { path: "/", pattern: /Eblocki|proof|study work/i },
  { path: "/auth", pattern: /Eblocki|sign in|email/i },
  { path: "/welcome", pattern: /Eblocki|proof|start|welcome/i },
];

const preview = spawn(
  "npm",
  ["run", "preview", "--", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { stdio: ["ignore", "pipe", "pipe"] },
);

let previewOutput = "";
preview.stdout.on("data", (chunk) => {
  previewOutput += chunk.toString();
});
preview.stderr.on("data", (chunk) => {
  previewOutput += chunk.toString();
});

const stopPreview = () => {
  if (!preview.killed) {
    preview.kill("SIGTERM");
  }
};

process.on("exit", stopPreview);
process.on("SIGINT", () => {
  stopPreview();
  process.exit(130);
});
process.on("SIGTERM", () => {
  stopPreview();
  process.exit(143);
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForPreview() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (preview.exitCode !== null) {
      throw new Error(`Preview server exited early.\n${previewOutput}`);
    }

    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // Keep polling until the preview server is ready.
    }

    await wait(500);
  }

  throw new Error(`Preview server did not become ready at ${baseUrl}.\n${previewOutput}`);
}

async function main() {
  await waitForPreview();

  const executablePath = process.env.CHROME_PATH || chromium.executablePath();
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  try {
    for (const route of routes) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      const consoleErrors = [];
      page.on("console", (message) => {
        if (message.type() === "error") {
          consoleErrors.push(message.text());
        }
      });

      const url = `${baseUrl}${route.path}`;
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      if (!response?.ok()) {
        throw new Error(`${route.path} returned HTTP ${response?.status() ?? "unknown"}`);
      }

      await page.waitForFunction(
        () => document.body.innerText.trim().length > 40,
        null,
        { timeout: 15_000 },
      );

      const bodyText = (await page.locator("body").innerText()).trim();
      const title = await page.title();

      if (/vite|react|failed to fetch dynamically imported module|uncaught error/i.test(bodyText)) {
        throw new Error(`${route.path} rendered an app error overlay.`);
      }

      if (!route.pattern.test(`${title}\n${bodyText}`)) {
        throw new Error(`${route.path} rendered unexpected content: ${bodyText.slice(0, 160)}`);
      }

      if (consoleErrors.length > 0) {
        throw new Error(`${route.path} logged console errors:\n${consoleErrors.join("\n")}`);
      }

      console.log(`[render-public-routes] PASS ${route.path} title="${title}"`);
      await page.close();
    }
  } finally {
    await browser.close();
    stopPreview();
  }
}

main().catch((error) => {
  stopPreview();
  console.error(`[render-public-routes] FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
