import "dotenv/config";
import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";

const openai = new OpenAI();

const vectorStoreId = process.env.EBLOCKI_VECTOR_STORE_ID;

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY.");
}

if (!vectorStoreId) {
  throw new Error("Missing EBLOCKI_VECTOR_STORE_ID.");
}

const ROOT = process.cwd();
const canaryPath = path.join(ROOT, "docs", "release", "eblocki-vector-canary-direct.txt");

fs.mkdirSync(path.dirname(canaryPath), { recursive: true });

fs.writeFileSync(
  canaryPath,
  `EBLOCKI_DIRECT_VECTOR_CANARY_20260706

Eblocki doctrine: proof over intention, systems over motivation, output over aesthetics, feedback over ego, accuracy over confidence, execution over planning, verification over wording, evidence over fantasy, no artifact no claim.

Sentinel detects shallow proof loops, academic displacement, no-artifact drift, domain neglect, identity inflation, and streak without depth.
`,
  "utf8"
);

console.log("\nDirect vector-store attach test");
console.log(`Vector store: ${vectorStoreId.slice(0, 10)}...`);
console.log(`Canary file: ${path.relative(ROOT, canaryPath)}`);

console.log("\nStep 1: uploading file to OpenAI Files API...");

const uploadedFile = await openai.files.create({
  file: fs.createReadStream(canaryPath),
  purpose: "assistants",
});

console.log({
  uploadedFileId: uploadedFile.id,
  filename: uploadedFile.filename,
  purpose: uploadedFile.purpose,
  bytes: uploadedFile.bytes,
  status: uploadedFile.status,
});

console.log("\nStep 2: attaching uploaded file to vector store and polling...");

const vectorStoreFile = await openai.vectorStores.files.createAndPoll(
  vectorStoreId,
  {
    file_id: uploadedFile.id,
  },
  {
    pollIntervalMs: 2000,
  }
);

console.log("\nVector store file result:");
console.log({
  id: vectorStoreFile.id,
  status: vectorStoreFile.status,
  usage_bytes: vectorStoreFile.usage_bytes,
  last_error: vectorStoreFile.last_error ?? null,
});

if (vectorStoreFile.status !== "completed") {
  console.error("\nFAIL: File attached but did not complete processing.");
  process.exitCode = 1;
}
