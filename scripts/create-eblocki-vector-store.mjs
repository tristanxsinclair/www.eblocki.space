import "dotenv/config";
import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY in your environment.");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const vectorStore = await openai.vectorStores.create({
  name: "Eblocki Personal Vector Store",
  metadata: {
    owner: "tristan_sinclair",
    project: "eblocki",
    purpose: "personal_eblocki_memory_and_retrieval",
    environment: "development",
  },
});

console.log("\nCreated Eblocki vector store:");
console.log(vectorStore);

console.log("\nCopy this into your server-side env only:");
console.log(`EBLOCKI_VECTOR_STORE_ID=${vectorStore.id}`);
