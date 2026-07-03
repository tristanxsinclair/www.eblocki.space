import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const host = "127.0.0.1";
const port = Number(process.env.EBLOCKI_PROOF_CHECK_PORT || 8787);
const baseUrl = `http://${host}:${port}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postJson(path, body, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  return {
    status: response.status,
    headers: response.headers,
    json: text ? JSON.parse(text) : null,
  };
}

async function waitForHealth() {
  for (let i = 0; i < 20; i += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      // Retry until the server starts.
    }
    await wait(250);
  }
  throw new Error("MCP server did not become healthy in time.");
}

const child = spawn("node", ["mcp-dist/mcp/server.js"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    EBLOCKI_PROOF_CHECK_PORT: String(port),
  },
  stdio: ["ignore", "pipe", "pipe"],
});

child.stdout.on("data", (chunk) => process.stdout.write(chunk));
child.stderr.on("data", (chunk) => process.stderr.write(chunk));

try {
  await waitForHealth();

  const initialize = await postJson("/mcp", {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "smoke-test", version: "1.0.0" },
    },
  });

  assert.equal(initialize.status, 200);
  const sessionId = initialize.headers.get("mcp-session-id");
  assert.ok(sessionId, "Expected Mcp-Session-Id header.");

  const initialized = await postJson(
    "/mcp",
    { jsonrpc: "2.0", method: "notifications/initialized" },
    { "Mcp-Session-Id": sessionId },
  );
  assert.equal(initialized.status, 202);

  const tools = await postJson(
    "/mcp",
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
    { "Mcp-Session-Id": sessionId },
  );
  assert.equal(tools.status, 200);
  assert.equal(tools.json.result.tools.length, 4);
  const proofCheckTool = tools.json.result.tools.find((tool) => tool.name === "check_proof_artifact");
  assert.ok(proofCheckTool.description.includes("supplied pasted text"));
  assert.equal(proofCheckTool.annotations.readOnlyHint, true);

  const proofCheck = await postJson(
    "/mcp",
    {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "check_proof_artifact",
        arguments: {
          artifact_text:
            "I wrote one IRAC paragraph with issue, rule, authority, application, conclusion and noted the mistake for next time.",
          goal: "Did I actually complete the work?",
          domain_hint: "law",
        },
      },
    },
    { "Mcp-Session-Id": sessionId },
  );
  assert.equal(proofCheck.status, 200);
  assert.equal(proofCheck.json.result.isError, false);
  assert.ok(proofCheck.json.result.structuredContent.verdict);
  assert.ok(Array.isArray(proofCheck.json.result.structuredContent.limitations));

  const refusal = await postJson(
    "/mcp",
    {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "check_proof_artifact",
        arguments: {
          artifact_text: "password: hunter2",
        },
      },
    },
    { "Mcp-Session-Id": sessionId },
  );
  assert.equal(refusal.status, 200);
  assert.equal(refusal.json.result.isError, true);
  assert.ok(refusal.json.result.structuredContent.reasons.includes("password"));

  const accountWriteRefusal = await postJson(
    "/mcp",
    {
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: {
        name: "suggest_next_command",
        arguments: {
          artifact_text: "Save this verdict to my dashboard and use my stored account data.",
        },
      },
    },
    { "Mcp-Session-Id": sessionId },
  );
  assert.equal(accountWriteRefusal.status, 200);
  assert.equal(accountWriteRefusal.json.result.isError, true);
  assert.ok(accountWriteRefusal.json.result.structuredContent.reasons.includes("saved_account_data_request"));

  console.log("Eblocki Proof Check MCP smoke test passed.");
} finally {
  child.kill("SIGTERM");
}
