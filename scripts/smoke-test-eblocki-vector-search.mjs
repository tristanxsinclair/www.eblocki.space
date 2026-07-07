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

const query =
  process.argv.slice(2).join(" ") ||
  "What is Eblocki doctrine and what proof standard should the coach enforce?";

console.log("\nEblocki vector search smoke test");
console.log(`Query: ${query}\n`);

const result = await openai.vectorStores.search(vectorStoreId, {
  query,
  max_num_results: 5,
});

const rows = result.data ?? [];

console.log(`Results found: ${rows.length}\n`);

for (const [index, row] of rows.entries()) {
  console.log(`--- Result ${index + 1} ---`);
  console.log(`File: ${row.file_name ?? row.filename ?? row.file_id ?? "unknown"}`);
  console.log(`Score: ${row.score ?? "unknown"}`);

  const text =
    row.content
      ?.map((item) => item.text)
      .filter(Boolean)
      .join("\n")
      .slice(0, 1200) ?? "";

  console.log(text || "[No text content returned]");
  console.log("");
}

if (rows.length === 0) {
  process.exitCode = 1;
  console.error("No retrieval results. Ingestion may have failed or the query did not match uploaded content.");
}
