import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, RefreshCw } from 'lucide-react';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLogs(); }, []);
  const fetchLogs = () => {
    setLoading(true);
    axios.get('/api/admin/audit-logs').then(r => setLogs(r.data.logs || [])).finally(() => setLoading(false));
  };

  const actionColors = { mark_attendance: 'bg-blue-100 text-blue-700', edit: 'bg-orange-100 text-orange-700', delete: 'bg-red-100 text-red-700', create: 'bg-green-100 text-green-700' };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-800 flex items-center gap-2"><Shield size={20} className="text-purple-600" /> Audit Logs</h2>
        <button onClick={fetchLogs} className="btn-secondary flex items-center gap-1 py-1.5 px-3 text-sm"><RefreshCw size={14} /> Refresh</button>
      </div>
      <div className="attendance-card">
        {loading ? <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full" /></div>
        : logs.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">No audit logs found</p>
        : <div className="space-y-2">
          {logs.map(l => (
            <div key={l.id} className="py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${actionColors[l.action] || 'bg-gray-100 text-gray-600'}`}>{l.action}</span>
                <span className="text-xs text-gray-400">{new Date(l.created_at).toLocaleString('en-IN')}</span>
              </div>
              <p className="text-sm text-gray-800">{l.user_name} <span className="text-gray-400 font-normal">({l.role})</span></p>
              {l.details && <p className="text-xs text-gray-400 mt-0.5">{JSON.stringify(l.details)}</p>}
            </div>
          ))}
        </div>}
      </div>
    </div>
  );
}
