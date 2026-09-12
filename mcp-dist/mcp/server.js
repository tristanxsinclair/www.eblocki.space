"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = require("node:http");
const node_crypto_1 = require("node:crypto");
const proof_check_1 = require("../src/lib/eblocki/proof-check");
const SERVER_NAME = "eblocki-proof-check";
const SERVER_VERSION = "0.1.0";
const PROTOCOL_VERSION = "2025-03-26";
const MCP_PATH = "/mcp";
const HOST = process.env.EBLOCKI_PROOF_CHECK_HOST || "127.0.0.1";
const PORT = Number(process.env.EBLOCKI_PROOF_CHECK_PORT || process.env.PORT || 8787);
const ALLOWED_ORIGIN_SUFFIXES = ["chatgpt.com", "openai.com"];
const ALLOWED_ORIGINS = new Set((process.env.EBLOCKI_PROOF_CHECK_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean));
const sessions = new Map();
const TOOL_DEFINITIONS = [
    {
        name: "check_proof_artifact",
        title: "Check proof artifact",
        description: "Judge only the supplied pasted text with Eblocki's rubric logic. Returns an evidence verdict, not external truth verification, and never saves data or reads Supabase/user history.",
        inputSchema: {
            type: "object",
            properties: {
                artifact_text: { type: "string", description: "Required pasted artifact text only. No files, links, secrets, or requests to ignore rules." },
                goal: { type: "string", description: "Optional claimed goal or completion statement to judge against the supplied text only." },
                domain_hint: { type: "string", description: "Optional domain hint such as law, product, psychology, or general. Used only to select the rubric." },
            },
            required: ["artifact_text"],
            additionalProperties: false,
        },
        outputSchema: {
            type: "object",
            properties: {
                verdict: { type: "string" },
                score: { type: "number" },
                selected_standard: { type: "string" },
                standard_label: { type: "string" },
                reasoning_summary: { type: "string" },
                self_deception_risk: { type: "string" },
                limitations: { type: "array", items: { type: "string" } },
            },
            required: [
                "verdict",
                "score",
                "selected_standard",
                "standard_label",
                "reasoning_summary",
                "self_deception_risk",
                "limitations",
            ],
            additionalProperties: true,
        },
    },
    {
        name: "get_proof_standard",
        title: "Get proof standard",
        description: "Return the rubric Eblocki would use for the supplied goal/domain text only. Does not read saved data, verify external facts, or persist anything.",
        inputSchema: {
            type: "object",
            properties: {
                goal: { type: "string", description: "Optional task or goal description used only to choose the proof rubric." },
                domain_hint: { type: "string", description: "Optional domain hint such as law, product, psychology, or general." },
            },
            additionalProperties: false,
        },
        outputSchema: {
            type: "object",
            properties: {
                standard_key: { type: "string" },
                standard_label: { type: "string" },
                required_evidence: { type: "array", items: { type: "string" } },
                missing_standard: { type: "string" },
                elite_version: { type: "string" },
                next_upgrade: { type: "string" },
            },
            required: [
                "standard_key",
                "standard_label",
                "required_evidence",
                "missing_standard",
                "elite_version",
                "next_upgrade",
            ],
            additionalProperties: false,
        },
    },
    {
        name: "review_evidence_gaps",
        title: "Review evidence gaps",
        description: "Inspect only the supplied pasted text for missing evidence and unsupported claims. Does not verify truth outside the text and does not save or sync results.",
        inputSchema: {
            type: "object",
            properties: {
                artifact_text: { type: "string", description: "Required pasted artifact text only. No secrets, stored-data requests, or requests to invent evidence." },
                goal: { type: "string", description: "Optional goal or claimed completion statement judged only against the supplied text." },
                selected_standard: { type: "string", description: "Optional explicit proof standard key to use for this text-only review." },
            },
            required: ["artifact_text"],
            additionalProperties: false,
        },
        outputSchema: {
            type: "object",
            properties: {
                selected_standard: { type: "string" },
                missing_evidence: { type: "array", items: { type: "string" } },
                weak_claims: { type: "array", items: { type: "string" } },
                unsupported_claims: { type: "array", items: { type: "string" } },
                minimum_next_artifact: { type: "string" },
            },
            required: [
                "selected_standard",
                "missing_evidence",
                "weak_claims",
                "unsupported_claims",
                "minimum_next_artifact",
            ],
            additionalProperties: false,
        },
    },
    {
        name: "suggest_next_command",
        title: "Suggest next command",
        description: "Return the next Eblocki proof command from the supplied pasted text only. Does not access account history, external systems, or write any result back.",
        inputSchema: {
            type: "object",
            properties: {
                artifact_text: { type: "string", description: "Required pasted artifact text only. No secrets or instructions to bypass the tool limits." },
                goal: { type: "string", description: "Optional goal or claimed completion statement judged only against the supplied text." },
                domain_hint: { type: "string", description: "Optional domain hint such as law, product, psychology, or general." },
            },
            required: ["artifact_text"],
            additionalProperties: false,
        },
        outputSchema: {
            type: "object",
            properties: {
                next_command: { type: "string" },
                recommended_artifact_type: { type: "string" },
                proof_question: { type: "string" },
                mode_warning: { type: "string" },
                read_only_notice: { type: "string" },
            },
            required: [
                "next_command",
                "recommended_artifact_type",
                "proof_question",
                "read_only_notice",
            ],
            additionalProperties: false,
        },
    },
];
function sendJson(res, statusCode, payload, headers) {
    res.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        ...headers,
    });
    if (payload === undefined) {
        res.end();
        return;
    }
    res.end(JSON.stringify(payload));
}
function sendText(res, statusCode, text) {
    res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(text);
}
function jsonRpcResult(id, result) {
    return { jsonrpc: "2.0", id, result };
}
function jsonRpcError(id, code, message) {
    return { jsonrpc: "2.0", id, error: { code, message } };
}
function isNotification(message) {
    return typeof message.id === "undefined";
}
function isLoopbackOrigin(origin) {
    try {
        const url = new URL(origin);
        return ["127.0.0.1", "localhost"].includes(url.hostname);
    }
    catch {
        return false;
    }
}
function isAllowedOrigin(originHeader) {
    if (!originHeader)
        return true;
    if (ALLOWED_ORIGINS.has(originHeader))
        return true;
    if (isLoopbackOrigin(originHeader))
        return true;
    try {
        const hostname = new URL(originHeader).hostname;
        return ALLOWED_ORIGIN_SUFFIXES.some((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`));
    }
    catch {
        return false;
    }
}
function getSessionId(req) {
    const header = req.headers["mcp-session-id"];
    return typeof header === "string" ? header : undefined;
}
async function readJsonBody(req) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    const text = Buffer.concat(chunks).toString("utf8");
    return text ? JSON.parse(text) : null;
}
function toToolResult(structuredContent) {
    return {
        structuredContent,
        content: [
            {
                type: "text",
                text: JSON.stringify(structuredContent),
            },
        ],
        isError: false,
    };
}
function refusalToolResult(input) {
    const payload = (0, proof_check_1.buildRefusalPayload)({
        artifactText: input.artifactText,
        goal: input.goal,
        domainHint: input.domainHint,
    });
    return {
        structuredContent: payload,
        content: [
            {
                type: "text",
                text: JSON.stringify(payload),
            },
        ],
        isError: true,
    };
}
function requireInitializedSession(req) {
    const sessionId = getSessionId(req);
    if (!sessionId)
        return { ok: false, error: "Missing Mcp-Session-Id header." };
    const session = sessions.get(sessionId);
    if (!session?.initialized)
        return { ok: false, error: "Unknown or uninitialized session." };
    return { ok: true, sessionId };
}
function asString(value) {
    return typeof value === "string" ? value : undefined;
}
function asStandardKey(value) {
    return typeof value === "string" ? value : undefined;
}
function buildSafetyInput(args) {
    return {
        artifactText: asString(args.artifact_text) || "",
        goal: asString(args.goal),
        domainHint: asString(args.domain_hint),
    };
}
function handleToolCall(name, args = {}) {
    switch (name) {
        case "check_proof_artifact": {
            const safetyInput = buildSafetyInput(args);
            if ((0, proof_check_1.checkAnalysisSafety)(safetyInput).blocked) {
                return refusalToolResult(safetyInput);
            }
            const result = (0, proof_check_1.runProofCheck)({
                artifactText: safetyInput.artifactText,
                goal: asString(args.goal),
                domainHint: asString(args.domain_hint),
            });
            return toToolResult({
                verdict: result.verdict,
                score: result.score,
                selected_standard: result.selectedStandard,
                standard_label: result.standardLabel,
                reasoning_summary: result.reasoningSummary,
                self_deception_risk: result.selfDeceptionRisk,
                limitations: result.limitations,
                read_only_notice: result.readOnlyNotice,
            });
        }
        case "get_proof_standard": {
            const result = (0, proof_check_1.getProofStandardLookup)({
                goal: asString(args.goal),
                domainHint: asString(args.domain_hint),
            });
            return toToolResult({
                standard_key: result.standardKey,
                standard_label: result.standardLabel,
                required_evidence: result.requiredEvidence,
                missing_standard: result.missingStandard,
                elite_version: result.eliteVersion,
                next_upgrade: result.nextUpgrade,
            });
        }
        case "review_evidence_gaps": {
            const safetyInput = {
                artifactText: asString(args.artifact_text) || "",
                goal: asString(args.goal),
            };
            if ((0, proof_check_1.checkAnalysisSafety)(safetyInput).blocked) {
                return refusalToolResult(safetyInput);
            }
            const result = (0, proof_check_1.runProofCheck)({
                artifactText: safetyInput.artifactText,
                goal: asString(args.goal),
                selectedStandard: asStandardKey(args.selected_standard),
            });
            return toToolResult({
                selected_standard: result.selectedStandard,
                missing_evidence: result.missingEvidence,
                weak_claims: result.weakClaims,
                unsupported_claims: result.unsupportedClaims,
                minimum_next_artifact: result.minimumNextArtifact,
                read_only_notice: result.readOnlyNotice,
            });
        }
        case "suggest_next_command": {
            const safetyInput = buildSafetyInput(args);
            if ((0, proof_check_1.checkAnalysisSafety)(safetyInput).blocked) {
                return refusalToolResult(safetyInput);
            }
            const result = (0, proof_check_1.runProofCheck)({
                artifactText: safetyInput.artifactText,
                goal: asString(args.goal),
                domainHint: asString(args.domain_hint),
            });
            return toToolResult({
                next_command: result.nextCommand,
                recommended_artifact_type: result.recommendedArtifactType,
                proof_question: result.proofQuestion,
                mode_warning: result.modeWarning,
                read_only_notice: result.readOnlyNotice,
            });
        }
        default:
            throw new Error(`Unknown tool: ${name}`);
    }
}
function handleRequestMessage(message, req, sessionIdHeader) {
    switch (message.method) {
        case "initialize": {
            const protocolVersion = typeof message.params?.protocolVersion === "string"
                ? message.params.protocolVersion
                : PROTOCOL_VERSION;
            const sessionId = sessionIdHeader || (0, node_crypto_1.randomUUID)();
            sessions.set(sessionId, { initialized: false });
            return jsonRpcResult(message.id ?? null, {
                protocolVersion: protocolVersion === PROTOCOL_VERSION ? PROTOCOL_VERSION : PROTOCOL_VERSION,
                capabilities: {
                    tools: {
                        listChanged: false,
                    },
                },
                serverInfo: {
                    name: SERVER_NAME,
                    version: SERVER_VERSION,
                },
                instructions: "Eblocki Proof Check is read-only. Judge only pasted artifact text. Never imply external verification, saved account access, Supabase access, or write actions.",
                _meta: {
                    sessionId,
                },
            });
        }
        case "notifications/initialized": {
            const sessionId = getSessionId(req);
            if (sessionId && sessions.has(sessionId)) {
                sessions.set(sessionId, { initialized: true });
            }
            return undefined;
        }
        case "ping":
            return jsonRpcResult(message.id ?? null, {});
        case "tools/list": {
            const sessionCheck = requireInitializedSession(req);
            if (!sessionCheck.ok) {
                return jsonRpcError(message.id ?? null, -32000, sessionCheck.error ?? "Session not initialized.");
            }
            return jsonRpcResult(message.id ?? null, {
                tools: TOOL_DEFINITIONS.map((tool) => ({
                    name: tool.name,
                    title: tool.title,
                    description: tool.description,
                    inputSchema: tool.inputSchema,
                    outputSchema: tool.outputSchema,
                    annotations: {
                        readOnlyHint: true,
                    },
                })),
            });
        }
        case "tools/call": {
            const sessionCheck = requireInitializedSession(req);
            if (!sessionCheck.ok) {
                return jsonRpcError(message.id ?? null, -32000, sessionCheck.error ?? "Session not initialized.");
            }
            const name = asString(message.params?.name);
            if (!name) {
                return jsonRpcError(message.id ?? null, -32602, "Missing tool name.");
            }
            try {
                return jsonRpcResult(message.id ?? null, handleToolCall(name, message.params?.arguments || {}));
            }
            catch (error) {
                return jsonRpcError(message.id ?? null, -32603, error instanceof Error ? error.message : "Tool execution failed.");
            }
        }
        default:
            return jsonRpcError(message.id ?? null, -32601, `Method not found: ${message.method}`);
    }
}
async function handleMcpPost(req, res) {
    if (!isAllowedOrigin(asString(req.headers.origin))) {
        sendJson(res, 403, { error: "Origin not allowed." });
        return;
    }
    let body;
    try {
        body = await readJsonBody(req);
    }
    catch {
        sendJson(res, 400, { error: "Invalid JSON body." });
        return;
    }
    const sessionIdHeader = getSessionId(req);
    const headers = {};
    const messages = Array.isArray(body) ? body : [body];
    const responses = [];
    let acceptedNotificationOnly = true;
    for (const message of messages) {
        if (!message || typeof message !== "object") {
            responses.push(jsonRpcError(null, -32600, "Invalid JSON-RPC message."));
            acceptedNotificationOnly = false;
            continue;
        }
        const rpc = message;
        if (rpc.jsonrpc !== "2.0" || typeof rpc.method !== "string") {
            responses.push(jsonRpcError(rpc.id ?? null, -32600, "Invalid JSON-RPC request."));
            acceptedNotificationOnly = false;
            continue;
        }
        const response = handleRequestMessage(rpc, req, sessionIdHeader);
        if (!isNotification(rpc))
            acceptedNotificationOnly = false;
        if (rpc.method === "initialize" && response?.result && typeof response.result === "object") {
            const sessionId = response.result._meta?.sessionId;
            if (sessionId)
                headers["Mcp-Session-Id"] = sessionId;
        }
        if (response)
            responses.push(response);
    }
    if (acceptedNotificationOnly && responses.length === 0) {
        res.writeHead(202);
        res.end();
        return;
    }
    const payload = Array.isArray(body) ? responses : responses[0];
    sendJson(res, 200, payload, headers);
}
const server = (0, node_http_1.createServer)(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || `${HOST}:${PORT}`}`);
    if (req.method === "GET" && url.pathname === "/health") {
        sendJson(res, 200, {
            ok: true,
            name: SERVER_NAME,
            version: SERVER_VERSION,
            endpoint: MCP_PATH,
        });
        return;
    }
    if (url.pathname !== MCP_PATH) {
        sendText(res, 404, "Not found.");
        return;
    }
    if (req.method === "GET") {
        res.writeHead(405, { Allow: "POST, DELETE" });
        res.end();
        return;
    }
    if (req.method === "DELETE") {
        const sessionId = getSessionId(req);
        if (sessionId)
            sessions.delete(sessionId);
        res.writeHead(204);
        res.end();
        return;
    }
    if (req.method !== "POST") {
        res.writeHead(405, { Allow: "POST, DELETE" });
        res.end();
        return;
    }
    await handleMcpPost(req, res);
});
server.listen(PORT, HOST, () => {
    // eslint-disable-next-line no-console
    console.error(`Eblocki Proof Check MCP listening on http://${HOST}:${PORT}${MCP_PATH}`);
});
