import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MAX_BYTES = 10 * 1024 * 1024;

const SYSTEM = `You are an OCR + transcription engine. Extract every readable piece of text from the supplied file (image or PDF). 
- Preserve order, headings, lists and table-like structure with simple line breaks.
- Do not summarise, translate, or comment.
- If the file is unreadable or empty, reply with the single word: EMPTY.
Return plain text only.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) throw new Error("AI gateway not configured.");
    const body = await req.json().catch(() => null);
    if (!body || typeof body.dataUrl !== "string" || typeof body.mimeType !== "string") {
      return new Response(JSON.stringify({ error: "Invalid body. Expected { dataUrl, mimeType, fileName? }" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { dataUrl, mimeType, fileName } = body as { dataUrl: string; mimeType: string; fileName?: string };

    // Rough size validation from base64 length
    const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
    const approxBytes = Math.floor((base64.length * 3) / 4);
    if (approxBytes > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "File exceeds 10MB OCR limit." }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isImage = mimeType.startsWith("image/");
    const isPdf = mimeType === "application/pdf";
    if (!isImage && !isPdf) {
      return new Response(JSON.stringify({ error: `Unsupported mime for OCR: ${mimeType}` }), {
        status: 415, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userContent: any[] = [
      { type: "text", text: `Extract every readable line of text from this ${isPdf ? "PDF" : "image"}${fileName ? ` (filename: ${fileName})` : ""}.` },
      { type: "image_url", image_url: { url: dataUrl } },
    ];

    const resp = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userContent },
        ],
        temperature: 0,
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace > Usage." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const errText = await resp.text();
      console.error("OCR gateway error", resp.status, errText);
      return new Response(JSON.stringify({ error: `OCR failed (${resp.status})` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await resp.json();
    const raw: string = json?.choices?.[0]?.message?.content ?? "";
    const text = raw.trim() === "EMPTY" ? "" : raw.trim();

    return new Response(
      JSON.stringify({
        text,
        chars: text.length,
        truncated: text.length >= 20000,
        textPreview: text.slice(0, 20000),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ocr-extract error", e);
    return new Response(JSON.stringify({ error: (e as Error).message || "OCR failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
