import React, { useState } from 'react';
import { Camera, Loader2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AIImageAnalysisProps {
  imageUrl: string;
  componentType?: string;
  onAnalysisComplete?: (analysis: any) => void;
}

export default function AIImageAnalysis({
  imageUrl,
  componentType,
  onAnalysisComplete
}: AIImageAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<'damage' | 'wear' | 'measurement' | 'general'>('general');

  const analyzeImage = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-image-analysis`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          analysisType: selectedAnalysisType,
          componentType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze image');
      }

      const result = await response.json();
      setAnalysis(result);

      if (onAnalysisComplete) {
        onAnalysisComplete(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze image');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'major':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'moderate':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'minor':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'major':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'moderate':
        return 'bg-orange-50 border-orange-200 text-orange-900';
      case 'minor':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      default:
        return 'bg-green-50 border-green-200 text-green-900';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-slate-900">AI Image Analysis</h3>
        </div>

        {!analysis && (
          <div className="flex items-center gap-2">
            <select
              value={selectedAnalysisType}
              onChange={(e) => setSelectedAnalysisType(e.target.value as any)}
              className="px-3 py-1 border border-slate-300 rounded text-sm"
              disabled={isAnalyzing}
            >
              <option value="general">General</option>
              <option value="damage">Damage Detection</option>
              <option value="wear">Wear Analysis</option>
              <option value="measurement">Measurement Check</option>
            </select>

            <button
              onClick={analyzeImage}
              disabled={isAnalyzing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Analyze Image'
              )}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">Analysis Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {analysis && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">
                Analysis Type:
              </span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                {analysis.analysisType}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">
                Confidence:
              </span>
              <span className={`px-2 py-1 rounded text-sm font-medium ${
                analysis.confidence === 'high' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {analysis.confidence}
              </span>
            </div>
          </div>

          {analysis.detectedIssues && analysis.detectedIssues.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-slate-900">Detected Issues:</h4>
              {analysis.detectedIssues.map((issue: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-3 border rounded-lg ${getSeverityColor(issue.severity)}`}
                >
                  <div className="flex items-start gap-2">
                    {getSeverityIcon(issue.severity)}
                    <div className="flex-1">
                      <div className="font-medium capitalize">
                        {issue.severity} - {issue.type}
                      </div>
                      <p className="text-sm mt-1">{issue.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            <h4 className="font-medium text-slate-900 mb-2">Detailed Analysis:</h4>
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap">
              {analysis.analysis}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => {
                setAnalysis(null);
                setError(null);
              }}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Analyze Again
            </button>
          </div>
        </div>
      )}

      {isAnalyzing && (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
          <p className="text-sm text-slate-600">Analyzing image with AI...</p>
          <p className="text-xs text-slate-500 mt-1">This may take a few moments</p>
        </div>
      )}
    </div>
  );
}