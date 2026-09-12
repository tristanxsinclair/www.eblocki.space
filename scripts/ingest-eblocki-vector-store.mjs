import "dotenv/config";
import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";

const openai = new OpenAI();

const ROOT = process.cwd();
const VECTOR_STORE_ID = process.env.EBLOCKI_VECTOR_STORE_ID;

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY in .env or environment.");
}

if (!VECTOR_STORE_ID) {
  throw new Error("Missing EBLOCKI_VECTOR_STORE_ID in .env or environment.");
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

  if (parts.some((part) => BLOCKED_PARTS.has(part))) return true;

  const filename = path.basename(filePath);

  if (BLOCKED_FILENAMES.has(filename)) return true;
  if (filename.includes(".env")) return true;
  if (filename.toLowerCase().includes("secret")) return true;
  if (filename.toLowerCase().includes("key")) return true;

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

if (files.length === 0) {
  throw new Error("No files found for ingestion.");
}

console.log(`Found ${files.length} files for Eblocki vector-store ingestion:\n`);

for (const file of files) {
  console.log(`- ${path.relative(ROOT, file)}`);
}

if (DRY_RUN) {
  console.log("\nDry run only. No files uploaded.");
  process.exit(0);
}

const streams = files.map((file) => fs.createReadStream(file));

console.log("\nUploading files to OpenAI vector store...");

const batch = await openai.vectorStores.fileBatches.uploadAndPoll(
  VECTOR_STORE_ID,
  { files: streams },
  { pollIntervalMs: 2000 }
);

console.log("\nVector store ingestion complete.");
console.log({
  batchId: batch.id,
  status: batch.status,
  fileCounts: batch.file_counts,
});

const reportPath = path.join(ROOT, "docs", "release", "vector-store-ingestion-report.md");
fs.mkdirSync(path.dirname(reportPath), { recursive: true });

const report = `# Eblocki Vector Store Ingestion Report

Date: ${new Date().toISOString()}

Status: ${batch.status}

Vector store: configured through EBLOCKI_VECTOR_STORE_ID

Batch ID: ${batch.id}

File counts:

\`\`\`json
${JSON.stringify(batch.file_counts, null, 2)}
\`\`\`

Files uploaded:

${files.map((file) => `- ${path.relative(ROOT, file)}`).join("\n")}

Security note:

No .env files, node_modules, build output, dist output, .git files, obvious secret/key files, or package-lock.json were intentionally uploaded.
`;

fs.writeFileSync(reportPath, report, "utf8");

console.log(`\nReport written to: ${path.relative(ROOT, reportPath)}`);
