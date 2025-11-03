import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  imageUrl: string;
  analysisType: 'damage' | 'wear' | 'measurement' | 'general';
  componentType?: string;
  context?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { imageUrl, analysisType, componentType, context } = await req.json() as RequestBody;

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "Image URL is required" }),
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

    const analysisPrompts = {
      damage: `Analyze this image of a ${componentType || 'component'} for any signs of damage. Look for:
- Cracks, breaks, or fractures
- Corrosion or rust
- Deformation or warping
- Surface defects
- Missing parts

Provide a severity assessment (minor, moderate, major, critical) and specific recommendations.`,
      
      wear: `Analyze this image of a ${componentType || 'component'} for wear patterns. Look for:
- Surface wear and scoring
- Material loss or thinning
- Bearing surface condition
- Contact pattern abnormalities
- Lubrication issues

Assess the wear level and remaining service life.`,
      
      measurement: `Analyze this image to verify measurements or alignments. Look for:
- Clearances and gaps
- Alignment issues
- Dimensional accuracy
- Surface finish quality
- Installation correctness

Provide specific observations about the measurements visible.`,
      
      general: `Analyze this image of equipment/component during service work. Provide:
- Overall condition assessment
- Any anomalies or concerns
- Maintenance recommendations
- Safety considerations
- Next steps suggested`
    };

    const systemPrompt = `You are an expert AI assistant specializing in visual inspection of electric motors, pumps, and industrial equipment. Analyze images to identify issues, assess condition, and provide technical recommendations.

You should:
- Be highly observant and detail-oriented
- Provide specific, actionable findings
- Assess severity accurately
- Consider safety implications
- Reference industry standards when applicable
- Be conservative in assessments (when in doubt, recommend further inspection)

${context ? `\nAdditional context: ${context}` : ''}`;

    const userPrompt = analysisPrompts[analysisType] || analysisPrompts.general;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: userPrompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                  detail: "high"
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenAI API error:", errorData);
      
      return new Response(
        JSON.stringify({ 
          error: "AI service error",
          message: "Failed to analyze image"
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
    const analysis = data.choices[0]?.message?.content || "Unable to analyze image.";

    const detectedIssues = [];
    const severityMatch = analysis.match(/\b(minor|moderate|major|critical)\b/gi);
    if (severityMatch) {
      detectedIssues.push({
        type: analysisType,
        severity: severityMatch[0].toLowerCase(),
        description: analysis.split('\n')[0],
      });
    }

    const result = {
      analysis,
      analysisType,
      componentType,
      detectedIssues,
      confidence: data.choices[0]?.finish_reason === 'stop' ? 'high' : 'medium',
      timestamp: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in ai-image-analysis function:", error);
    
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