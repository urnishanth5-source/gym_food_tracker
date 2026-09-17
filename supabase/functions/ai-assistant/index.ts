import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  action: "suggest" | "plan" | "substitute" | "grocery" | "chat";
  remainingCalories?: number;
  remainingProtein?: number;
  remainingCarbs?: number;
  remainingFat?: number;
  goal?: string;
  diet?: string;
  weightKg?: number;
  message?: string;
  currentMeal?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const xaiKey = Deno.env.get("XAI_API_KEY");

    if (!xaiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured. XAI_API_KEY is missing." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RequestBody = await req.json();

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    const goal = body.goal || profile?.goal || "maintain";
    const diet = body.diet || profile?.diet_type || "non_veg";
    const weightKg = body.weightKg || profile?.weight_kg || 70;

    const remCals = body.remainingCalories ?? 500;
    const remProtein = body.remainingProtein ?? 30;
    const remCarbs = body.remainingCarbs ?? 50;
    const remFat = body.remainingFat ?? 15;

    let systemPrompt = `You are FlexFuel AI, an expert Indian fitness nutritionist assistant. The user's goal is ${goal}, diet preference is ${diet}, and weight is ${weightKg}kg. 
Always respond with valid JSON only, no markdown, no explanation outside JSON.
Use Indian foods commonly available (rice, dal, chapati, paneer, chicken, eggs, whey, oats, etc.).
Nutritional values should be accurate and realistic for Indian home-cooked portions.`;

    let userPrompt = "";
    let responseSchema: Record<string, any>;

    if (body.action === "suggest") {
      userPrompt = `The user has ${remCals} kcal, ${remProtein}g protein, ${remCarbs}g carbs, and ${remFat}g fat remaining for the day.
Suggest 2-3 high-protein Indian meal options that fit within these remaining macros.
Each meal should have a title, short description, list of items with name/quantity/calories/protein/carbs/fat, and totals.`;
      responseSchema = {
        meals: [{
          title: "string",
          description: "string",
          items: [{ name: "string", quantity: "string", calories: "number", protein: "number", carbs: "number", fat: "number" }],
          totalCalories: "number",
          totalProtein: "number",
          totalCarbs: "number",
          totalFat: "number",
        }],
        notes: "string",
      };
    } else if (body.action === "plan") {
      userPrompt = `Create a full day meal plan for a ${goal} goal, ${diet} diet, ${weightKg}kg person.
Target: ${profile?.calorie_target || 2200} kcal, ${profile?.protein_target || 150}g protein, ${profile?.carbs_target || 250}g carbs, ${profile?.fat_target || 60}g fat.
Include breakfast, lunch, dinner, and 1-2 snacks. Each meal should have items with full macro breakdown.`;
      responseSchema = {
        meals: [{
          title: "string",
          description: "string",
          items: [{ name: "string", quantity: "string", calories: "number", protein: "number", carbs: "number", fat: "number" }],
          totalCalories: "number",
          totalProtein: "number",
          totalCarbs: "number",
          totalFat: "number",
        }],
        notes: "string",
      };
    } else if (body.action === "substitute") {
      userPrompt = `Suggest 2-3 healthier or higher-protein Indian food substitutions for: ${body.currentMeal || body.message}.
For each substitution, provide the meal with items and macros.`;
      responseSchema = {
        meals: [{
          title: "string",
          description: "string",
          items: [{ name: "string", quantity: "string", calories: "number", protein: "number", carbs: "number", fat: "number" }],
          totalCalories: "number",
          totalProtein: "number",
          totalCarbs: "number",
          totalFat: "number",
        }],
        notes: "string",
      };
    } else if (body.action === "grocery") {
      userPrompt = `Generate a weekly grocery list for a ${diet} diet person with ${goal} goal in India. 
Include quantities for a week. Group by category.`;
      responseSchema = {
        meals: [],
        groceryList: ["string"],
        notes: "string",
      };
    } else {
      userPrompt = body.message || "Give me general nutrition advice for my fitness goal.";
      responseSchema = {
        meals: [],
        notes: "string",
      };
    }

    const xaiResponse = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${xaiKey}`,
      },
      body: JSON.stringify({
        model: "grok-beta",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `${userPrompt}\n\nRespond with JSON matching this structure: ${JSON.stringify(responseSchema)}` },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!xaiResponse.ok) {
      const errText = await xaiResponse.text();
      return new Response(JSON.stringify({ error: `AI service error: ${xaiResponse.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const xaiData = await xaiResponse.json();
    const content = xaiData.choices?.[0]?.message?.content || "";

    let parsed: any;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      parsed = { meals: [], notes: content };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
