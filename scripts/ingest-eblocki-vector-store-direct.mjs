import "dotenv/config";
import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";

const openai = new OpenAI();

const ROOT = process.cwd();
const VECTOR_STORE_ID = process.env.EBLOCKI_VECTOR_STORE_ID;

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY.");
}

if (!VECTOR_STORE_ID) {
  throw new Error("Missing EBLOCKI_VECTOR_STORE_ID.");
}

const DRY_RUN = process.argv.includes("--dry-run");

const INGEST_TARGETS = [
  "docs",
  "src/lib/eblocki",
  "src/components/eblocki",
  "src/pages/Dashboard.tsx",
  "src/pages/Proof.tsx",
  "src/pages/Coach.tsx",
  "src/pages/Onboarding.tsx",
  "supabase/functions",
  "supabase/migrations",
  "package.json",
  "README.md",
  "AGENTS.md",
];

const ALLOWED_EXTENSIONS = new Set([
  ".md",
  ".mdx",
  ".txt",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".sql",
]);

const BLOCKED_PARTS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".vercel",
  ".lovable",
  ".supabase",
]);

const BLOCKED_FILENAMES = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  "package-lock.json",
]);

function isBlocked(filePath) {
  const parts = filePath.split(path.sep);
  const filename = path.basename(filePath);
  const lower = filename.toLowerCase();

  if (parts.some((part) => BLOCKED_PARTS.has(part))) return true;
  if (BLOCKED_FILENAMES.has(filename)) return true;
  if (filename.includes(".env")) return true;
  if (lower.includes("secret")) return true;
  if (lower.includes("key")) return true;

  return false;
}

function collectFiles(targetPath) {
  const absolutePath = path.resolve(ROOT, targetPath);

  if (!fs.existsSync(absolutePath)) return [];

  const stat = fs.statSync(absolutePath);

  if (stat.isFile()) {
    const ext = path.extname(absolutePath).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) return [];
    if (isBlocked(absolutePath)) return [];
    if (stat.size > 5 * 1024 * 1024) return [];
    return [absolutePath];
  }

  const files = [];

  for (const entry of fs.readdirSync(absolutePath)) {
    const nextPath = path.join(absolutePath, entry);
    if (isBlocked(nextPath)) continue;

    const nextStat = fs.statSync(nextPath);

    if (nextStat.isDirectory()) {
      files.push(...collectFiles(path.relative(ROOT, nextPath)));
      continue;
    }

    const ext = path.extname(nextPath).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) continue;
    if (nextStat.size > 5 * 1024 * 1024) continue;

    files.push(nextPath);
  }

  return files;
}

const files = [...new Set(INGEST_TARGETS.flatMap(collectFiles))];

console.log(`\nDirect Eblocki vector-store ingestion`);
console.log(`Vector store: ${VECTOR_STORE_ID.slice(0, 10)}...`);
console.log(`Files found: ${files.length}\n`);

for (const file of files) {
  console.log(`- ${path.relative(ROOT, file)}`);
}

if (DRY_RUN) {
  console.log("\nDry run only. No files uploaded.");
  process.exit(0);
}

const results = [];

for (const file of files) {
  const relativePath = path.relative(ROOT, file);

  try {
    console.log(`\nUploading: ${relativePath}`);

    const uploadedFile = await openai.files.create({
      file: fs.createReadStream(file),
      purpose: "assistants",
    });

    const vectorStoreFile = await openai.vectorStores.files.createAndPoll(
      VECTOR_STORE_ID,
      { file_id: uploadedFile.id },
      { pollIntervalMs: 2000 }
    );

    const result = {
      path: relativePath,
      uploadedFileId: uploadedFile.id,
      vectorStoreFileId: vectorStoreFile.id,
      status: vectorStoreFile.status,
      lastError: vectorStoreFile.last_error ?? null,
    };

    results.push(result);

    console.log(result);
  } catch (error) {
    const result = {
      path: relativePath,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    };

    results.push(result);
    console.error(result);
  }
}

const completed = results.filter((item) => item.status === "completed").length;
const failed = results.filter((item) => item.status !== "completed").length;

const reportPath = path.join(
  ROOT,
  "docs",
  "release",
  "vector-store-direct-ingestion-report.md"
);

fs.mkdirSync(path.dirname(reportPath), { recursive: true });

const report = `# Eblocki Vector Store Direct Ingestion Report

Date: ${new Date().toISOString()}

Vector store: configured through EBLOCKI_VECTOR_STORE_ID

Total attempted: ${results.length}

Completed: ${completed}

Failed: ${failed}

Results:

\`\`\`json
${JSON.stringify(results, null, 2)}
\`\`\`

Security note:

No .env files, node_modules, build output, dist output, .git files, obvious secret/key files, or package-lock.json were intentionally uploaded.
`;

fs.writeFileSync(reportPath, report, "utf8");

console.log("\nDirect ingestion complete.");
console.log({ completed, failed });
console.log(`Report written to: ${path.relative(ROOT, reportPath)}`);

if (failed > 0) {
  process.exitCode = 1;
}
