import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  query: string;
  context?: {
    equipmentModel?: string;
    currentStep?: string;
    findings?: any[];
    measurements?: any;
    workOrderNumber?: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { query, context } = await req.json() as RequestBody;

    if (!query || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ 
          error: "AI service not configured",
          message: "Please add your OPENAI_API_KEY to Supabase Edge Function secrets"
        }),
        {
          status: 503,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const systemPrompt = `You are an expert AI assistant for electric motor and pump repair technicians. You provide technical guidance, troubleshooting help, and repair recommendations.

Key responsibilities:
- Help diagnose issues based on symptoms and measurements
- Provide torque specifications and tolerances
- Explain proper repair procedures
- Identify common failure modes
- Recommend safety precautions
- Interpret measurement data

Always be:
- Precise and technical but clear
- Safety-conscious
- Practical and actionable
- Based on industry best practices

Context information will be provided about the current repair job.`;

    let contextText = "";
    if (context) {
      contextText = "\n\nCurrent Work Context:\n";
      if (context.workOrderNumber) {
        contextText += `- Work Order: ${context.workOrderNumber}\n`;
      }
      if (context.equipmentModel) {
        contextText += `- Equipment: ${context.equipmentModel}\n`;
      }
      if (context.currentStep) {
        contextText += `- Current Step: ${context.currentStep}\n`;
      }
      if (context.measurements && Object.keys(context.measurements).length > 0) {
        contextText += `- Recent Measurements: ${JSON.stringify(context.measurements, null, 2)}\n`;
      }
      if (context.findings && context.findings.length > 0) {
        contextText += `- Findings: ${context.findings.length} issues identified\n`;
      }
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt + contextText,
          },
          {
            role: "user",
            content: query,
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenAI API error:", errorData);
      
      return new Response(
        JSON.stringify({ 
          error: "AI service error",
          message: "Failed to get response from AI service"
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";

    return new Response(
      JSON.stringify({ response: aiResponse }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in ai-assistant function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});