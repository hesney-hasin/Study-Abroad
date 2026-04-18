import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─────────────────────────────────────────────
// Gemini API Key Rotation
// ─────────────────────────────────────────────
function getAllGeminiKeys(): string[] {
  const keyNames = ["GEMINI_KEY_5", "GEMINI_KEY_6", "GEMINI_KEY_7", "GEMINI_KEY_8", "GEMINI_KEY_9"];
  const keys: string[] = [];
  for (const name of keyNames) {
    const val = Deno.env.get(name);
    if (val) keys.push(val);
  }
  return keys;
}

function getRandomGeminiKey(): string {
  const keys = getAllGeminiKeys();
  if (keys.length === 0) throw new Error("No Gemini API keys configured");
  return keys[Math.floor(Math.random() * keys.length)];
}

const SYSTEM_PROMPT = `You are a Research Paper Analysis AI Agent for students seeking Master's and PhD positions abroad.

## YOUR ROLE
Analyze research papers (from links, titles, abstracts, or descriptions) and provide:

1. **Paper Analysis** — Summarize the paper's key contributions, methodology, and field
2. **Research Field Mapping** — Identify the specific research areas and sub-fields
3. **University Recommendations** — Suggest universities with strong programs in this research area, especially those offering:
   - Research-based scholarships
   - Funded PhD positions in this field
   - Active research groups doing similar work
4. **Professor Recommendations** — Name specific professors/labs doing related work
5. **Scholarship Opportunities** — Research-specific scholarships and grants relevant to this field

## RESPONSE FORMAT
Use clear markdown with sections:

### 📄 Paper Summary
Brief analysis of the research contribution

### 🔬 Research Field
- Primary field and sub-fields
- Related/interdisciplinary areas
- Current trends in this area

### 🏛️ Recommended Universities
For each university:
- **University Name** (Country) — Why it's relevant
- Key research groups/labs in this area
- Scholarship/funding opportunities
- Approximate tuition for international students

### 👨‍🏫 Professors to Consider
- **Prof. Name** — University, research focus, why relevant

### 💰 Research Scholarships
- Scholarships specifically for this research area
- General research funding that applies

### 📋 Next Steps
Actionable advice for the student

## RULES
- Only recommend REAL universities and professors you are confident about
- Focus on universities in Europe, USA, Canada, Australia, Japan, South Korea
- Prioritize universities with funded positions and research scholarships
- Add disclaimer: "Please verify all details through official university websites"
- Be encouraging but honest about competitiveness
- If the paper/description is unclear, ask for clarification`;

// ─────────────────────────────────────────────
// Gemini Native API
// ─────────────────────────────────────────────

function convertToGeminiFormat(messages: any[]) {
  const contents: any[] = [];
  let systemInstruction: any = null;

  for (const msg of messages) {
    if (msg.role === "system") {
      systemInstruction = { parts: [{ text: msg.content }] };
    } else if (msg.role === "user") {
      contents.push({ role: "user", parts: [{ text: msg.content }] });
    } else if (msg.role === "assistant" || msg.role === "model") {
      contents.push({ role: "model", parts: [{ text: msg.content }] });
    }
  }

  return { contents, systemInstruction };
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 1): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);
    if (response.status === 429 && attempt < maxRetries - 1) {
      let waitMs = Math.pow(2, attempt) * 3000 + Math.random() * 1000;
      try {
        const clone = response.clone();
        const errBody = await clone.json();
        const retryInfo = errBody.error?.details?.find((d: any) => d["@type"]?.includes("RetryInfo"));
        if (retryInfo?.retryDelay) {
          const seconds = parseInt(retryInfo.retryDelay);
          if (!isNaN(seconds)) waitMs = (seconds + 2) * 1000;
        }
      } catch { /* use default wait */ }
      console.log(`Rate limited, waiting ${Math.round(waitMs)}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
      continue;
    }
    return response;
  }
  throw new Error("Max retries exceeded");
}

// ─────────────────────────────────────────────
// SSE Stream from text
// ─────────────────────────────────────────────

function createSSEStream(text: string): ReadableStream {
  const encoder = new TextEncoder();
  const chunkSize = 20;
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }

  let index = 0;
  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        const chunk = { choices: [{ delta: { content: chunks[index] }, index: 0 }] };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        index++;
      } else {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });
}

// ─────────────────────────────────────────────
// Main Server
// ─────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiKey = getRandomGeminiKey();

    const allMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    const { contents, systemInstruction } = convertToGeminiFormat(allMessages);

    const body: any = { contents };
    if (systemInstruction) body.system_instruction = systemInstruction;

    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini error:", response.status, errText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't analyze that. Please try again.";

    const stream = createSSEStream(text);
    return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });

  } catch (e) {
    console.error("paper-analysis error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
