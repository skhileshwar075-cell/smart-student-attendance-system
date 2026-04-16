import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingDown, AlertTriangle, Bell } from 'lucide-react';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ from: '', to: '' });
  const [alertMsg, setAlertMsg] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const params = {};
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    const r = await axios.get('/api/admin/analytics', { params });
    setData(r.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const sendAlert = async (student) => {
    try {
      await axios.post('/api/teacher/alerts', { student_id: student.student_id, attendance_pct: student.percentage });
      setAlertMsg(`Alert sent to ${student.name}`);
      setTimeout(() => setAlertMsg(''), 3000);
    } catch {}
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {alertMsg && <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-xl">{alertMsg}</div>}

      <div className="attendance-card space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label text-xs">From Date</label><input type="date" value={filters.from} onChange={e => setFilters(p => ({...p, from: e.target.value}))} className="input-field text-sm" /></div>
          <div><label className="label text-xs">To Date</label><input type="date" value={filters.to} onChange={e => setFilters(p => ({...p, to: e.target.value}))} className="input-field text-sm" /></div>
        </div>
        <button onClick={fetchData} className="btn-primary w-full">Update Analytics</button>
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full" /></div>
      : data && (
        <>
          {data.trend?.length > 0 && (
            <div className="attendance-card">
              <h3 className="font-semibold text-gray-700 mb-3">Attendance Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.trend.map(d => ({ ...d, date: new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="present" stroke="#16a34a" strokeWidth={2} dot={false} name="Present" />
                  <Line type="monotone" dataKey="absent" stroke="#dc2626" strokeWidth={2} dot={false} name="Absent" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {data.subjectStats?.length > 0 && (
            <div className="attendance-card">
              <h3 className="font-semibold text-gray-700 mb-3">Subject-wise Attendance</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.subjectStats} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <YAxis dataKey="code" type="category" tick={{ fontSize: 10 }} width={50} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="avg_attendance" fill="#3b82f6" radius={4} name="Avg %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {data.lowAttendance?.length > 0 && (
            <div className="attendance-card">
              <h3 className="font-semibold text-red-600 mb-3 flex items-center gap-2"><AlertTriangle size={16} /> Low Attendance Students</h3>
              <div className="space-y-2">
                {data.lowAttendance.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.student_id} • {s.class_name} {s.section}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-red-600">{s.percentage}%</span>
                      <button onClick={() => sendAlert(s)} className="w-7 h-7 flex items-center justify-center bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200">
                        <Bell size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
