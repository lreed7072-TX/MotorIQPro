import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Send, MessageSquare, AlertCircle, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Message {
  id: string;
  work_order_id: string | null;
  sender_id: string;
  recipient_id: string;
  message_type: 'internal' | 'customer' | 'supplier';
  subject: string;
  body: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_read: boolean;
  created_at: string;
  work_order?: {
    work_order_number: string;
  };
  sender?: {
    full_name: string;
  };
  recipient?: {
    full_name: string;
  };
}

export default function MessagesCenter() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    urgent: 0,
  });

  useEffect(() => {
    fetchMessages();
  }, [typeFilter, profile]);

  const fetchMessages = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      let query = supabase
        .from('messages')
        .select(`
          *,
          work_order:work_orders (work_order_number),
          sender:users!messages_sender_id_fkey (full_name),
          recipient:users!messages_recipient_id_fkey (full_name)
        `)
        .or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`)
        .order('created_at', { ascending: false });

      if (typeFilter !== 'all') {
        query = query.eq('message_type', typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      setMessages(data || []);

      const total = data?.length || 0;
      const unread = data?.filter(m => !m.is_read && m.recipient_id === profile.id).length || 0;
      const urgent = data?.filter(m => m.priority === 'urgent' && !m.is_read && m.recipient_id === profile.id).length || 0;

      setStats({ total, unread, urgent });
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);

      fetchMessages();
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const filteredMessages = messages.filter((msg) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      msg.subject.toLowerCase().includes(searchLower) ||
      msg.body.toLowerCase().includes(searchLower) ||
      msg.sender?.full_name?.toLowerCase().includes(searchLower)
    );
  });

  const getPriorityBadge = (priority: string) => {
    const badges = {
      low: 'bg-slate-100 text-slate-700',
      normal: 'bg-blue-100 text-blue-700',
      high: 'bg-amber-100 text-amber-700',
      urgent: 'bg-red-100 text-red-700',
    };
    return badges[priority as keyof typeof badges] || badges.normal;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900 mb-2">Messages</h1>
        <p className="text-slate-600">Internal communication and notifications</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Messages</p>
              <p className="text-2xl font-semibold text-slate-900">{stats.total}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Unread</p>
              <p className="text-2xl font-semibold text-slate-900">{stats.unread}</p>
            </div>
            <div className="bg-amber-100 p-3 rounded-lg">
              <MessageSquare className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Urgent</p>
              <p className="text-2xl font-semibold text-slate-900">{stats.urgent}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search messages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
                >
                  <option value="all">All Types</option>
                  <option value="internal">Internal</option>
                  <option value="customer">Customer</option>
                  <option value="supplier">Supplier</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600"></div>
                <p className="mt-4 text-slate-600">Loading messages...</p>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="p-12 text-center">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">No messages found</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredMessages.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => {
                      setSelectedMessage(msg);
                      if (!msg.is_read && msg.recipient_id === profile?.id) {
                        markAsRead(msg.id);
                      }
                    }}
                    className={`p-4 hover:bg-slate-50 cursor-pointer transition ${
                      !msg.is_read && msg.recipient_id === profile?.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="bg-slate-200 p-2 rounded-full">
                        <User className="w-5 h-5 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {msg.sender_id === profile?.id ? `To: ${msg.recipient?.full_name}` : `From: ${msg.sender?.full_name}`}
                          </p>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityBadge(msg.priority)}`}>
                            {msg.priority}
                          </span>
                          {!msg.is_read && msg.recipient_id === profile?.id && (
                            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-900 mb-1">{msg.subject}</p>
                        <p className="text-sm text-slate-600 truncate">{msg.body}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-slate-500">
                            {new Date(msg.created_at).toLocaleString()}
                          </span>
                          {msg.work_order && (
                            <span className="text-xs text-blue-600">
                              WO: {msg.work_order.work_order_number}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          {selectedMessage ? (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Message Details</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 mb-1">From</p>
                  <p className="text-sm font-medium text-slate-900">{selectedMessage.sender?.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">To</p>
                  <p className="text-sm font-medium text-slate-900">{selectedMessage.recipient?.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Subject</p>
                  <p className="text-sm font-medium text-slate-900">{selectedMessage.subject}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Priority</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityBadge(selectedMessage.priority)}`}>
                    {selectedMessage.priority}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Message</p>
                  <p className="text-sm text-slate-900 whitespace-pre-wrap">{selectedMessage.body}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Sent</p>
                  <p className="text-sm text-slate-900">{new Date(selectedMessage.created_at).toLocaleString()}</p>
                </div>
                {selectedMessage.work_order && (
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Related Work Order</p>
                    <p className="text-sm text-blue-600">{selectedMessage.work_order.work_order_number}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Select a message to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
