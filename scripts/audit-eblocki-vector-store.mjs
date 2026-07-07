import "dotenv/config";
import OpenAI from "openai";

const openai = new OpenAI();

const vectorStoreId = process.env.EBLOCKI_VECTOR_STORE_ID;

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY.");
}

if (!vectorStoreId) {
  throw new Error("Missing EBLOCKI_VECTOR_STORE_ID.");
}

console.log("\nVector store audit");
console.log(`Vector store ID loaded: ${vectorStoreId.slice(0, 8)}...`);

const vectorStore = await openai.vectorStores.retrieve(vectorStoreId);

console.log("\nVector store:");
console.log({
  id: vectorStore.id,
  name: vectorStore.name,
  status: vectorStore.status,
  file_counts: vectorStore.file_counts,
  usage_bytes: vectorStore.usage_bytes,
  created_at: vectorStore.created_at,
});

console.log("\nFiles attached:");

let count = 0;

for await (const file of openai.vectorStores.files.list(vectorStoreId, {
  limit: 100,
})) {
  count += 1;
  console.log({
    vector_store_file_id: file.id,
    status: file.status,
    usage_bytes: file.usage_bytes,
    created_at: file.created_at,
    last_error: file.last_error ?? null,
  });
}

console.log(`\nTotal listed vector store files: ${count}`);

if (count === 0) {
  console.error("\nFAIL: No files are attached to this vector store.");
  process.exitCode = 1;
}
