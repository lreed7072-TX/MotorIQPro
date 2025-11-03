import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  equipmentUnitId?: string;
  equipmentModelId?: string;
  analysisType: 'failure_prediction' | 'maintenance_recommendation' | 'cost_forecast';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { equipmentUnitId, equipmentModelId, analysisType } = await req.json() as RequestBody;

    let historicalData: any = null;

    if (equipmentUnitId) {
      const { data: workOrders } = await supabase
        .from('work_orders')
        .select(`
          *,
          work_sessions(*),
          work_order_parts(*)
        `)
        .eq('equipment_unit_id', equipmentUnitId)
        .order('completed_at', { ascending: false })
        .limit(20);

      historicalData = {
        equipmentUnitId,
        totalWorkOrders: workOrders?.length || 0,
        recentWorkOrders: workOrders || [],
      };
    } else if (equipmentModelId) {
      const { data: units } = await supabase
        .from('equipment_units')
        .select('id')
        .eq('equipment_model_id', equipmentModelId);

      const unitIds = units?.map(u => u.id) || [];

      const { data: workOrders } = await supabase
        .from('work_orders')
        .select('*')
        .in('equipment_unit_id', unitIds)
        .order('completed_at', { ascending: false });

      historicalData = {
        equipmentModelId,
        totalUnits: units?.length || 0,
        totalWorkOrders: workOrders?.length || 0,
        recentWorkOrders: workOrders || [],
      };
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const analysisPrompts = {
      failure_prediction: `Based on the historical maintenance data provided, analyze failure patterns and predict:
- Probability of failure in the next 3, 6, and 12 months
- Most likely failure modes
- Early warning signs to monitor
- Recommended inspection intervals

Provide a risk score (0-100) and specific recommendations.`,
      
      maintenance_recommendation: `Based on the maintenance history, recommend:
- Optimal maintenance schedule
- Critical components to monitor
- Preventive actions to take
- Parts likely to need replacement soon
- Cost-benefit analysis of preventive vs reactive maintenance`,
      
      cost_forecast: `Analyze the historical maintenance costs and forecast:
- Expected maintenance costs for next 12 months
- Major upcoming expenses
- Cost trends and patterns
- Budget recommendations
- ROI of preventive maintenance investments`
    };

    const systemPrompt = `You are an expert AI assistant specializing in predictive maintenance analytics for industrial equipment. Analyze historical maintenance data to provide data-driven predictions and recommendations.

You should:
- Identify patterns in failure modes and frequencies
- Calculate statistical probabilities based on historical data
- Consider equipment age and usage
- Reference industry reliability standards
- Provide actionable, prioritized recommendations
- Include confidence levels in predictions`;

    const userPrompt = `${analysisPrompts[analysisType]}

Historical Data:
${JSON.stringify(historicalData, null, 2)}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI API request failed');
    }

    const data = await response.json();
    const analysis = data.choices[0]?.message?.content || "Unable to generate analysis.";

    const riskScoreMatch = analysis.match(/risk score[:\s]+(\d+)/i);
    const riskScore = riskScoreMatch ? parseInt(riskScoreMatch[1]) : null;

    const result = {
      analysis,
      analysisType,
      riskScore,
      dataPoints: historicalData?.totalWorkOrders || 0,
      confidence: (historicalData?.totalWorkOrders || 0) > 10 ? 'high' : 'medium',
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
    console.error("Error in ai-predictive-analysis function:", error);
    
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