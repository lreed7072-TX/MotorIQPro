import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Clock, MapPin, Play, Square, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface TimeEntry {
  id: string;
  user_id: string;
  work_order_id: string | null;
  clock_in_time: string;
  clock_out_time: string | null;
  location_in: any;
  location_out: any;
  hours_worked: number | null;
  notes: string | null;
  work_order?: {
    work_order_number: string;
    customer: {
      company_name: string;
    };
  };
}

export default function TimeClock() {
  const { profile } = useAuth();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayHours: 0,
    weekHours: 0,
    monthHours: 0,
  });

  useEffect(() => {
    fetchTimeEntries();
    const interval = setInterval(fetchTimeEntries, 60000);
    return () => clearInterval(interval);
  }, [profile]);

  const fetchTimeEntries = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          work_order:work_orders (
            work_order_number,
            customer:customers (company_name)
          )
        `)
        .eq('user_id', profile.id)
        .order('clock_in_time', { ascending: false })
        .limit(20);

      if (error) throw error;

      setTimeEntries(data || []);

      const active = data?.find(e => !e.clock_out_time);
      setActiveEntry(active || null);

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const todayHours = data
        ?.filter(e => new Date(e.clock_in_time) >= today && e.hours_worked)
        .reduce((sum, e) => sum + (e.hours_worked || 0), 0) || 0;

      const weekHours = data
        ?.filter(e => new Date(e.clock_in_time) >= weekStart && e.hours_worked)
        .reduce((sum, e) => sum + (e.hours_worked || 0), 0) || 0;

      const monthHours = data
        ?.filter(e => new Date(e.clock_in_time) >= monthStart && e.hours_worked)
        .reduce((sum, e) => sum + (e.hours_worked || 0), 0) || 0;

      setStats({ todayHours, weekHours, monthHours });
    } catch (error) {
      console.error('Error fetching time entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
      } else {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      }
    });
  };

  const clockIn = async () => {
    try {
      let location = null;
      try {
        const pos = await getLocation();
        location = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
      } catch (err) {
        console.warn('Could not get location:', err);
      }

      const { error } = await supabase
        .from('time_entries')
        .insert({
          user_id: profile?.id,
          clock_in_time: new Date().toISOString(),
          location_in: location,
        });

      if (error) throw error;
      fetchTimeEntries();
    } catch (error) {
      console.error('Error clocking in:', error);
      alert('Failed to clock in. Please try again.');
    }
  };

  const clockOut = async () => {
    if (!activeEntry) return;

    try {
      let location = null;
      try {
        const pos = await getLocation();
        location = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
      } catch (err) {
        console.warn('Could not get location:', err);
      }

      const clockOutTime = new Date();
      const clockInTime = new Date(activeEntry.clock_in_time);
      const hoursWorked = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

      const { error } = await supabase
        .from('time_entries')
        .update({
          clock_out_time: clockOutTime.toISOString(),
          location_out: location,
          hours_worked: hoursWorked,
        })
        .eq('id', activeEntry.id);

      if (error) throw error;
      fetchTimeEntries();
    } catch (error) {
      console.error('Error clocking out:', error);
      alert('Failed to clock out. Please try again.');
    }
  };

  const getCurrentDuration = () => {
    if (!activeEntry) return '00:00:00';

    const now = new Date();
    const clockIn = new Date(activeEntry.clock_in_time);
    const diff = now.getTime() - clockIn.getTime();

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const [currentTime, setCurrentTime] = useState(getCurrentDuration());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentDuration());
    }, 1000);
    return () => clearInterval(interval);
  }, [activeEntry]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900 mb-2">Time Clock</h1>
        <p className="text-slate-600">Track your work hours</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-slate-200 p-8">
            <div className="text-center">
              <Clock className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              {activeEntry ? (
                <>
                  <p className="text-sm text-slate-600 mb-2">Currently Clocked In</p>
                  <p className="text-5xl font-bold text-slate-900 mb-2">{currentTime}</p>
                  <p className="text-sm text-slate-600 mb-6">
                    Started at {new Date(activeEntry.clock_in_time).toLocaleTimeString()}
                  </p>
                  <button
                    onClick={clockOut}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition mx-auto"
                  >
                    <Square className="w-5 h-5" />
                    <span>Clock Out</span>
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-600 mb-2">Ready to Start</p>
                  <p className="text-5xl font-bold text-slate-900 mb-6">--:--:--</p>
                  <button
                    onClick={clockIn}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition mx-auto"
                  >
                    <Play className="w-5 h-5" />
                    <span>Clock In</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <p className="text-sm text-slate-600 mb-1">Today</p>
            <p className="text-2xl font-semibold text-slate-900">{stats.todayHours.toFixed(1)} hrs</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <p className="text-sm text-slate-600 mb-1">This Week</p>
            <p className="text-2xl font-semibold text-slate-900">{stats.weekHours.toFixed(1)} hrs</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <p className="text-sm text-slate-600 mb-1">This Month</p>
            <p className="text-2xl font-semibold text-slate-900">{stats.monthHours.toFixed(1)} hrs</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Recent Time Entries</h2>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600"></div>
            <p className="mt-4 text-slate-600">Loading entries...</p>
          </div>
        ) : timeEntries.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No time entries yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Clock In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Clock Out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Work Order
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {timeEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {new Date(entry.clock_in_time).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {new Date(entry.clock_in_time).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {entry.clock_out_time ? new Date(entry.clock_out_time).toLocaleTimeString() : 'Active'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {entry.hours_worked ? `${entry.hours_worked.toFixed(2)} hrs` : '--'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {entry.work_order ? (
                        <div>
                          <div className="font-medium">{entry.work_order.work_order_number}</div>
                          <div className="text-xs text-slate-500">{entry.work_order.customer?.company_name}</div>
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
