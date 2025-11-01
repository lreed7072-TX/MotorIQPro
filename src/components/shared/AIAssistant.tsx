import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { AIInteraction } from '../../types/database';
import { Bot, Send, ThumbsUp, ThumbsDown, X } from 'lucide-react';

interface AIAssistantProps {
  workSessionId: string;
  context?: {
    equipmentModel?: string;
    currentStep?: string;
    findings?: any[];
    measurements?: any;
  };
  onClose?: () => void;
}

export default function AIAssistant({ workSessionId, context, onClose }: AIAssistantProps) {
  const { profile } = useAuth();
  const [query, setQuery] = useState('');
  const [interactions, setInteractions] = useState<AIInteraction[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInteractionHistory();
  }, [workSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [interactions]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchInteractionHistory = async () => {
    try {
      setLoadingHistory(true);
      const { data, error } = await supabase
        .from('ai_interactions')
        .select('*')
        .eq('work_session_id', workSessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setInteractions(data || []);
    } catch (error) {
      console.error('Error fetching AI interaction history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !profile) return;

    const userQuery = query.trim();
    setQuery('');
    setLoading(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userQuery,
          context: context || {},
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get AI response');
      }

      const { response: aiResponse } = await response.json();

      const { data, error } = await supabase
        .from('ai_interactions')
        .insert({
          work_session_id: workSessionId,
          user_id: profile.id,
          query: userQuery,
          context: context || {},
          response: aiResponse,
        })
        .select()
        .single();

      if (error) throw error;

      setInteractions((prev) => [...prev, data]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error getting AI response. Please try again.';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (interactionId: string, helpful: boolean) => {
    try {
      await supabase
        .from('ai_interactions')
        .update({ helpful })
        .eq('id', interactionId);

      setInteractions((prev) =>
        prev.map((interaction) =>
          interaction.id === interactionId ? { ...interaction, helpful } : interaction
        )
      );
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const suggestedQuestions = [
    'What should I check for bearing wear?',
    'What are the torque specifications?',
    'How do I diagnose unusual vibration?',
    'What are common failure modes?',
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full h-[600px] flex flex-col">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-blue-600 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-lg">
              <Bot className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">AI Assistant</h2>
              <p className="text-sm text-blue-100">Ask me anything about your repair</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-blue-700 rounded-lg transition text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loadingHistory ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600"></div>
            </div>
          ) : interactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                How can I help you today?
              </h3>
              <p className="text-slate-600 mb-6">
                Ask me about equipment specs, troubleshooting, or repair procedures
              </p>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700 mb-3">Quick questions:</p>
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => setQuery(question)}
                    className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            interactions.map((interaction) => (
              <div key={interaction.id} className="space-y-4">
                <div className="flex justify-end">
                  <div className="bg-blue-600 text-white rounded-lg px-4 py-3 max-w-[80%]">
                    <p className="text-sm">{interaction.query}</p>
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="bg-slate-100 rounded-lg px-4 py-3 max-w-[80%]">
                    <p className="text-sm text-slate-900 whitespace-pre-wrap">
                      {interaction.response}
                    </p>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200">
                      <span className="text-xs text-slate-500">Was this helpful?</span>
                      <button
                        onClick={() => handleFeedback(interaction.id, true)}
                        className={`p-1 rounded transition ${
                          interaction.helpful === true
                            ? 'bg-green-100 text-green-600'
                            : 'hover:bg-slate-200 text-slate-400'
                        }`}
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleFeedback(interaction.id, false)}
                        className={`p-1 rounded transition ${
                          interaction.helpful === false
                            ? 'bg-red-100 text-red-600'
                            : 'hover:bg-slate-200 text-slate-400'
                        }`}
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="p-6 border-t border-slate-200">
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type your question..."
              disabled={loading}
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
