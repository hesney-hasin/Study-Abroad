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

const SYSTEM_PROMPT = `You are a university data API. When given search criteria, return a JSON array of universities.

Each university object MUST have this exact structure:
{
  "id": "unique-slug",
  "name": "University Name",
  "city": "City",
  "country": "Country",
  "countryCode": "XX",
  "flagEmoji": "🇩🇪",
  "type": "Public" or "Private",
  "tuitionMin": 0,
  "tuitionMax": 5000,
  "currency": "EUR",
  "degreeTypes": ["Bachelor", "Masters", "PhD"],
  "teachingLanguages": ["English", "German"],
  "ranking": 150,
  "scholarshipsAvailable": true,
  "researchFocus": true,
  "popularPrograms": ["Computer Science", "Engineering"],
  "description": "Brief 1-2 sentence description",
  "website": "https://...",
  "imageKeyword": "campus architecture"
}

IMPORTANT RULES:
- Return ONLY valid JSON array, no markdown, no explanation
- Return realistic, real universities with accurate data
- Tuition is per year for international non-EU students
- For free tuition (e.g. Germany public), set tuitionMin and tuitionMax to 0
- Include 15-25 universities per response — the more the better
- Cover all European countries (Germany, France, Netherlands, Sweden, Finland, Denmark, Norway, Austria, Switzerland, Italy, Spain, Belgium, Ireland, Poland, Czech Republic, Portugal, Hungary, etc.)
- Also include universities from USA, UK, Canada, Australia, Japan, South Korea when relevant
- Provide a diverse mix of countries, rankings, and tuition levels
- ranking should be approximate world ranking (QS/THE), use 0 if unranked
- imageKeyword should be a short descriptive phrase for generating a representative image`;

function getAIConfig() {
  const geminiKey = getRandomGeminiKey();
  return {
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    apiKey: geminiKey,
    model: "gemini-2.5-flash",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, filters } = await req.json();
    const config = getAIConfig();

    let userPrompt = "";
    if (query) {
      userPrompt = `Search for universities matching: "${query}"`;
    } else {
      userPrompt = "List popular universities for international students";
    }

    if (filters) {
      if (filters.country) userPrompt += `. Country: ${filters.country}`;
      if (filters.degreeLevel) userPrompt += `. Degree: ${filters.degreeLevel}`;
      if (filters.tuitionMax) userPrompt += `. Max tuition: €${filters.tuitionMax}/year`;
      if (filters.language) userPrompt += `. Teaching language: ${filters.language}`;
      if (filters.category) userPrompt += `. Category: ${filters.category}`;
      if (filters.field) userPrompt += `. Field/Program: ${filters.field}`;
    }

    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
          tools: [
            {
              type: "function",
              function: {
                name: "return_universities",
                description: "Return a list of universities matching the search criteria",
                parameters: {
                  type: "object",
                  properties: {
                    universities: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          name: { type: "string" },
                          city: { type: "string" },
                          country: { type: "string" },
                          countryCode: { type: "string" },
                          flagEmoji: { type: "string" },
                          type: { type: "string", enum: ["Public", "Private"] },
                          tuitionMin: { type: "number" },
                          tuitionMax: { type: "number" },
                          currency: { type: "string" },
                          degreeTypes: { type: "array", items: { type: "string" } },
                          teachingLanguages: { type: "array", items: { type: "string" } },
                          ranking: { type: "number" },
                          scholarshipsAvailable: { type: "boolean" },
                          researchFocus: { type: "boolean" },
                          popularPrograms: { type: "array", items: { type: "string" } },
                          description: { type: "string" },
                          website: { type: "string" },
                          imageKeyword: { type: "string" },
                        },
                        required: ["id", "name", "city", "country", "countryCode", "flagEmoji", "type", "tuitionMin", "tuitionMax", "currency", "degreeTypes", "teachingLanguages", "scholarshipsAvailable", "popularPrograms", "description", "website"],
                      },
                    },
                  },
                  required: ["universities"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "return_universities" } },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // Extract from tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(
        JSON.stringify({ universities: parsed.universities }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback: try parsing content directly
    const content = data.choices?.[0]?.message?.content || "[]";
    let universities;
    try {
      universities = JSON.parse(content);
    } catch {
      universities = [];
    }

    return new Response(
      JSON.stringify({ universities: Array.isArray(universities) ? universities : [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("university-search error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
