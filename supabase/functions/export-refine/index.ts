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

const AVAILABLE_FIELDS = [
  "name", "title", "university", "department", "researchAreas",
  "email", "profileUrl", "fundingStatus", "recentWork", "fitReason",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description } = await req.json();

    if (!description || typeof description !== "string") {
      return new Response(
        JSON.stringify({ error: "description is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiKey = getRandomGeminiKey();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: `You are a field selector. Given a user's description of what they want in their export, select the matching fields from this list: ${AVAILABLE_FIELDS.join(", ")}.

Use the select_fields tool to return your selection. Map natural language to field names:
- "name" = name
- "title" or "position" = title
- "university" or "school" or "institution" = university
- "department" or "dept" = department
- "research" or "research areas" or "interests" = researchAreas
- "email" or "contact" = email
- "profile" or "url" or "link" or "website" = profileUrl
- "funding" or "grant" = fundingStatus
- "recent work" or "publications" or "papers" = recentWork
- "fit" or "why" or "reason" or "match" = fitReason

Always include "name" even if not explicitly mentioned.`
            }]
          },
          contents: [{ role: "user", parts: [{ text: description }] }],
          tools: [{
            function_declarations: [{
              name: "select_fields",
              description: "Select which fields to include in the export",
              parameters: {
                type: "object",
                properties: {
                  selectedFields: {
                    type: "array",
                    items: { type: "string", enum: AVAILABLE_FIELDS },
                    description: "Fields to include in export",
                  },
                },
                required: ["selectedFields"],
              },
            }],
          }],
          tool_config: { function_calling_config: { mode: "ANY" } },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Gemini error:", err);
      return new Response(
        JSON.stringify({ selectedFields: AVAILABLE_FIELDS }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const fc = data.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall);
    const fields = fc?.functionCall?.args?.selectedFields || AVAILABLE_FIELDS;

    // Ensure name is always included
    if (!fields.includes("name")) fields.unshift("name");

    return new Response(
      JSON.stringify({ selectedFields: fields }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("export-refine error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
