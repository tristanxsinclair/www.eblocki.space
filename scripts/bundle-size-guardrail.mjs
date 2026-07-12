#!/usr/bin/env node
// Bundle-size guardrail for desktop UI regressions.
//
// Runs against the built `dist/` output and fails CI when the shipped
// JS/CSS crosses the budget defined below. Budgets are in bytes of the
// raw (non-gzipped) asset — the same number `ls -la dist/assets` shows —
// and are set slightly above the current baseline so honest additions
// pass, while an unnoticed 100–200KB regression trips the guardrail.
//
// Update budgets INTENTIONALLY when a large dependency is added, and
// record the reason in docs/RELEASE_CHECKLIST.md.

import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const DIST = resolve(process.cwd(), "dist/assets");

// Per-chunk budgets keyed by the stable name prefix Vite emits
// (chunk names come from vite.config.ts `manualChunks`).
const CHUNK_BUDGETS_BYTES = {
  "index-": 1_050_000, // main app entry
  "react-": 180_000,
  "supabase-": 230_000,
  "ui-": 165_000,
  "vendor-": 60_000,
};

// Aggregate budgets across all JS and CSS assets.
const TOTAL_JS_BUDGET_BYTES = 1_650_000;
const TOTAL_CSS_BUDGET_BYTES = 120_000;

function listAssets() {
  try {
    return readdirSync(DIST).map((name) => ({
      name,
      size: statSync(join(DIST, name)).size,
    }));
  } catch (err) {
    console.error(`[bundle-size] Missing ${DIST}. Run \`npm run build\` first.`);
    process.exit(2);
  }
}

function fmt(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function main() {
  const assets = listAssets();
  const jsAssets = assets.filter((a) => a.name.endsWith(".js"));
  const cssAssets = assets.filter((a) => a.name.endsWith(".css"));

  const failures = [];
  const rows = [];

  for (const [prefix, budget] of Object.entries(CHUNK_BUDGETS_BYTES)) {
    const match = jsAssets.find((a) => a.name.startsWith(prefix));
    if (!match) {
      failures.push(
        `Missing expected chunk starting with "${prefix}". Did vite.config.ts manualChunks change?`,
      );
      continue;
    }
    const ok = match.size <= budget;
    rows.push({ name: match.name, size: match.size, budget, ok });
    if (!ok) {
      failures.push(
        `Chunk ${match.name} is ${fmt(match.size)}, over budget ${fmt(budget)} (+${fmt(match.size - budget)}).`,
      );
    }
  }

  const totalJs = jsAssets.reduce((n, a) => n + a.size, 0);
  const totalCss = cssAssets.reduce((n, a) => n + a.size, 0);

  if (totalJs > TOTAL_JS_BUDGET_BYTES) {
    failures.push(
      `Total JS is ${fmt(totalJs)}, over budget ${fmt(TOTAL_JS_BUDGET_BYTES)} (+${fmt(totalJs - TOTAL_JS_BUDGET_BYTES)}).`,
    );
  }
  if (totalCss > TOTAL_CSS_BUDGET_BYTES) {
    failures.push(
      `Total CSS is ${fmt(totalCss)}, over budget ${fmt(TOTAL_CSS_BUDGET_BYTES)} (+${fmt(totalCss - TOTAL_CSS_BUDGET_BYTES)}).`,
    );
  }

  console.log("Bundle-size guardrail report");
  console.log("─".repeat(60));
  for (const r of rows) {
    const flag = r.ok ? "✓" : "✗";
    console.log(
      `${flag} ${r.name.padEnd(36)} ${fmt(r.size).padStart(10)} / ${fmt(r.budget)}`,
    );
  }
  console.log("─".repeat(60));
  console.log(`Total JS : ${fmt(totalJs).padStart(10)} / ${fmt(TOTAL_JS_BUDGET_BYTES)}`);
  console.log(`Total CSS: ${fmt(totalCss).padStart(10)} / ${fmt(TOTAL_CSS_BUDGET_BYTES)}`);

  if (failures.length) {
    console.error("\n[bundle-size] FAIL");
    for (const f of failures) console.error(`  • ${f}`);
    console.error(
      "\nIf this regression is intentional, update budgets in scripts/bundle-size-guardrail.mjs and note the reason in docs/RELEASE_CHECKLIST.md.",
    );
    process.exit(1);
  }

  console.log("\n[bundle-size] PASS — every chunk within budget.");
}

main();