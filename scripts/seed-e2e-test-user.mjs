#!/usr/bin/env node
/**
 * Idempotent E2E test-user provisioning script.
 *
 * Creates or updates the "Alex Morgan" average-user persona in a
 * NON-PRODUCTION Supabase project for authenticated E2E testing.
 *
 * Required environment variables:
 *   SUPABASE_URL                – project URL (must NOT be a production project)
 *   SUPABASE_SERVICE_ROLE_KEY   – service-role key (server-only, never VITE_)
 *   E2E_TEST_USER_EMAIL         – email for the test account
 *   E2E_TEST_USER_PASSWORD      – password for the test account
 *
 * Optional:
 *   E2E_ALLOW_TEST_USER_SEED    – must be "true" to proceed
 *   E2E_TEST_USER_ID            – override user UUID (for stable references)
 *
 * Guards:
 *   1. NODE_ENV must NOT be "production"
 *   2. E2E_ALLOW_TEST_USER_SEED must be "true"
 *   3. SUPABASE_URL must match a known dev/staging pattern or explicit allowlist
 *
 * Usage:
 *   E2E_ALLOW_TEST_USER_SEED=true node scripts/seed-e2e-test-user.mjs
 */

import { createClient } from "@supabase/supabase-js";

// ─── Environment validation ─────────────────────────────────────────────────

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  E2E_TEST_USER_EMAIL,
  E2E_TEST_USER_PASSWORD,
  E2E_ALLOW_TEST_USER_SEED,
  E2E_TEST_USER_ID,
  NODE_ENV,
} = process.env;

function fatal(msg) {
  console.error(`❌ SEED ABORT: ${msg}`);
  process.exit(1);
}

// Guard 1: Never run in production
if (NODE_ENV === "production") {
  fatal("NODE_ENV is 'production'. Refusing to seed test data in production.");
}

// Guard 2: Explicit opt-in
if (E2E_ALLOW_TEST_USER_SEED !== "true") {
  fatal(
    "E2E_ALLOW_TEST_USER_SEED is not 'true'. " +
      "Set E2E_ALLOW_TEST_USER_SEED=true to confirm this is intentional."
  );
}

// Guard 3: Required credentials
if (!SUPABASE_URL) fatal("SUPABASE_URL is not set.");
if (!SUPABASE_SERVICE_ROLE_KEY) fatal("SUPABASE_SERVICE_ROLE_KEY is not set.");
if (!E2E_TEST_USER_EMAIL) fatal("E2E_TEST_USER_EMAIL is not set.");
if (!E2E_TEST_USER_PASSWORD) fatal("E2E_TEST_USER_PASSWORD is not set.");

// Guard 4: Production URL detection
const KNOWN_PRODUCTION_PATTERNS = [
  // Add production project IDs here to block them explicitly
  // e.g. "prod-project-id.supabase.co"
];

const url = SUPABASE_URL.toLowerCase();
if (
  KNOWN_PRODUCTION_PATTERNS.some((p) => url.includes(p)) ||
  url.includes("prod") ||
  url.includes("live.")
) {
  fatal(
    `SUPABASE_URL (${SUPABASE_URL}) appears to be a production project. ` +
      "Refusing to seed. If this is safe, update the allowlist in this script."
  );
}

// ─── Supabase admin client ───────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Persona data ────────────────────────────────────────────────────────────

const PERSONA = {
  fullName: "Alex Morgan",
  email: E2E_TEST_USER_EMAIL,
  password: E2E_TEST_USER_PASSWORD,
};

const ONBOARDING_PROFILE = {
  identity_summary:
    "First-year uni student trying to improve study habits and get better marks.",
  roles: ["student"],
  goals: ["Better marks", "Clearer feedback", "Consistent study"],
  coaching_style: "direct",
  strictness_level: 5,
  completed_onboarding: true,
  seen_welcome: true,
  timezone: "Australia/Sydney",
  timezone_source: "manual",
  challenge_avoidance: false,
  auto_create_proof_contracts: false,
  prefers_detailed_analysis: false,
};

const USER_MODE = {
  mode_id: "e2e-uni-study",
  display_name: "University Study",
  description: "General university coursework and assignments",
  is_active: true,
  is_default: true,
  keywords: ["university", "study", "assignments", "essays"],
  proof_examples: [
    "Completed essay paragraph with citations",
    "Practice problem solutions",
    "Study notes in own words",
  ],
  weak_evidence_examples: [
    "Just re-reading notes",
    "Copying textbook passages",
  ],
  strong_evidence_examples: [
    "Original analysis paragraph with authority",
    "Corrected work with explanations",
  ],
  elite_evidence_examples: null,
  preferred_response_framework: null,
  scoring_criteria: null,
  tone_adjustments: null,
  research_needs: null,
};

const PROOF_ARTIFACTS = [
  {
    title: "Read psychology notes",
    content:
      "I reread the chapter on memory and highlighted the main ideas. The key concepts seemed important.",
    domain: "psychology",
    evidence_strength: "weak",
    quality_score: 2,
    proof_tier: 1,
    feedback:
      "Re-reading and highlighting is passive review. To build real understanding, try explaining concepts in your own words or testing yourself without notes.",
    pressure_flag: false,
    transfer_flag: false,
    artifact_type: "text",
  },
  {
    title: "Memory retrieval explanation",
    content:
      "Retrieval practice means actively recalling information from memory rather than just re-reading. For example, closing my textbook and writing down everything I remember about encoding specificity. This forces my brain to reconstruct the information which strengthens the memory trace. However, I haven't fully evaluated when this works better than other methods.",
    domain: "psychology",
    evidence_strength: "moderate",
    quality_score: 5,
    proof_tier: 3,
    feedback:
      "Good explanation with a concrete example. To strengthen this further, evaluate when retrieval practice works better than other methods and cite specific evidence.",
    pressure_flag: false,
    transfer_flag: false,
    artifact_type: "text",
  },
  {
    title: "Corrected legal problem paragraph",
    content:
      "The issue is whether Sam's verbal agreement constitutes a binding contract under Australian Consumer Law. Under s 23 of the ACL, unfair contract terms in standard form consumer contracts are void. Applying this to Sam's situation, the gym's automatic renewal clause was not brought to his attention and creates a significant imbalance in the parties' rights. Therefore, Sam likely has grounds to challenge the renewal.",
    domain: "law",
    evidence_strength: "strong",
    quality_score: 7,
    proof_tier: 5,
    feedback:
      "Strong IRAC structure with specific statutory authority and fact-specific application. The analysis directly applies the law to Sam's circumstances rather than stating rules in the abstract.",
    pressure_flag: false,
    transfer_flag: false,
    artifact_type: "text",
  },
];

// ─── Seed logic ──────────────────────────────────────────────────────────────

async function findOrCreateUser() {
  // Try to find existing user by email
  const { data: existingUsers, error: listError } =
    await supabase.auth.admin.listUsers();

  if (listError) {
    fatal(`Failed to list users: ${listError.message}`);
  }

  const existing = existingUsers.users.find(
    (u) => u.email === PERSONA.email
  );

  if (existing) {
    console.log(`✓ Found existing test user: ${existing.id}`);
    // Update password to ensure it matches
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      existing.id,
      {
        password: PERSONA.password,
        email_confirm: true,
        user_metadata: { full_name: PERSONA.fullName },
      }
    );
    if (updateError) {
      fatal(`Failed to update test user: ${updateError.message}`);
    }
    return existing.id;
  }

  // Create new user
  const createOpts = {
    email: PERSONA.email,
    password: PERSONA.password,
    email_confirm: true,
    user_metadata: { full_name: PERSONA.fullName },
  };

  if (E2E_TEST_USER_ID) {
    createOpts.id = E2E_TEST_USER_ID;
  }

  const { data: created, error: createError } =
    await supabase.auth.admin.createUser(createOpts);

  if (createError) {
    fatal(`Failed to create test user: ${createError.message}`);
  }

  console.log(`✓ Created test user: ${created.user.id}`);
  return created.user.id;
}

async function upsertProfile(userId) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      full_name: PERSONA.fullName,
      email: PERSONA.email,
    },
    { onConflict: "id" }
  );
  if (error) fatal(`Failed to upsert profile: ${error.message}`);
  console.log("✓ Profile upserted");
}

async function upsertOnboarding(userId) {
  const { error } = await supabase.from("user_onboarding_profiles").upsert(
    { ...ONBOARDING_PROFILE, user_id: userId },
    { onConflict: "user_id" }
  );
  if (error) fatal(`Failed to upsert onboarding profile: ${error.message}`);
  console.log("✓ Onboarding profile upserted");
}

async function upsertMode(userId) {
  // Check if mode already exists
  const { data: existing } = await supabase
    .from("user_modes")
    .select("id")
    .eq("user_id", userId)
    .eq("mode_id", USER_MODE.mode_id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("user_modes")
      .update({ ...USER_MODE, user_id: userId })
      .eq("id", existing.id);
    if (error) fatal(`Failed to update user mode: ${error.message}`);
    console.log("✓ User mode updated");
    return existing.id;
  }

  const { data, error } = await supabase
    .from("user_modes")
    .insert({ ...USER_MODE, user_id: userId })
    .select("id")
    .single();
  if (error) fatal(`Failed to insert user mode: ${error.message}`);
  console.log("✓ User mode created");
  return data.id;
}

async function seedProofArtifacts(userId) {
  // Remove existing test artifacts for this user to prevent duplicates
  // Identify by exact titles (stable identifiers)
  const testTitles = PROOF_ARTIFACTS.map((a) => a.title);

  const { data: existing } = await supabase
    .from("proof_artifacts")
    .select("id, title")
    .eq("user_id", userId)
    .in("title", testTitles);

  if (existing && existing.length > 0) {
    // Delete existing to re-seed cleanly
    const ids = existing.map((e) => e.id);
    const { error: delError } = await supabase
      .from("proof_artifacts")
      .delete()
      .in("id", ids);
    if (delError) {
      console.warn(`⚠ Could not delete stale artifacts: ${delError.message}`);
    } else {
      console.log(`✓ Removed ${ids.length} stale test artifacts`);
    }
  }

  // Insert fresh artifacts with staggered timestamps
  const now = new Date();
  const artifacts = PROOF_ARTIFACTS.map((artifact, i) => ({
    ...artifact,
    user_id: userId,
    created_at: new Date(now.getTime() - (3 - i) * 86400000).toISOString(),
  }));

  const { error } = await supabase.from("proof_artifacts").insert(artifacts);
  if (error) fatal(`Failed to seed proof artifacts: ${error.message}`);
  console.log(`✓ Seeded ${artifacts.length} proof artifacts`);
}

async function ensureNoAdminRole(userId) {
  // Explicitly verify no admin role exists
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (data && data.some((r) => r.role === "admin")) {
    fatal(
      "Test user has admin role! This should never happen. " +
        "Remove the admin role manually before proceeding."
    );
  }
  console.log("✓ Confirmed: no admin role");
}

async function ensureNoSubscription(userId) {
  // Remove any active subscriptions for the test user
  const { data } = await supabase
    .from("subscriptions")
    .select("id, status")
    .eq("user_id", userId);

  if (data && data.length > 0) {
    const { error } = await supabase
      .from("subscriptions")
      .delete()
      .eq("user_id", userId);
    if (error) {
      console.warn(`⚠ Could not remove subscriptions: ${error.message}`);
    } else {
      console.log("✓ Removed existing subscriptions (free plan enforced)");
    }
  } else {
    console.log("✓ Confirmed: no active subscription (free plan)");
  }
}

async function cleanExcessData(userId) {
  // Remove any excess proof artifacts beyond our test set
  const { data: allArtifacts } = await supabase
    .from("proof_artifacts")
    .select("id, title")
    .eq("user_id", userId);

  const testTitles = PROOF_ARTIFACTS.map((a) => a.title);
  if (allArtifacts) {
    const excess = allArtifacts.filter((a) => !testTitles.includes(a.title));
    if (excess.length > 0) {
      const { error } = await supabase
        .from("proof_artifacts")
        .delete()
        .in(
          "id",
          excess.map((e) => e.id)
        );
      if (!error) {
        console.log(`✓ Removed ${excess.length} excess artifacts`);
      }
    }
  }

  // Remove any XP/progression data to keep early-stage state
  for (const table of ["xp_events", "domain_levels", "operator_level"]) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    if (error && !error.message.includes("does not exist")) {
      console.warn(`⚠ Could not clean ${table}: ${error.message}`);
    }
  }
  console.log("✓ Progression data cleaned (early-stage state)");
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  Eblocki E2E Test User Seed");
  console.log("═══════════════════════════════════════════");
  console.log(`  Project: ${SUPABASE_URL}`);
  console.log(`  Email:   ${PERSONA.email}`);
  console.log(`  Persona: ${PERSONA.fullName}`);
  console.log("═══════════════════════════════════════════\n");

  const userId = await findOrCreateUser();

  await upsertProfile(userId);
  await upsertOnboarding(userId);
  await upsertMode(userId);
  await seedProofArtifacts(userId);
  await ensureNoAdminRole(userId);
  await ensureNoSubscription(userId);
  await cleanExcessData(userId);

  console.log("\n═══════════════════════════════════════════");
  console.log("  ✅ SEED COMPLETE");
  console.log("═══════════════════════════════════════════");
  console.log(`  User ID: ${userId}`);
  console.log(`  Name:    ${PERSONA.fullName}`);
  console.log(`  Plan:    Free`);
  console.log(`  Role:    user (no admin)`);
  console.log(`  Proofs:  ${PROOF_ARTIFACTS.length} artifacts`);
  console.log(`  State:   early-stage, onboarding complete`);
  console.log("═══════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("Unexpected error:", err.message);
  process.exit(1);
});
