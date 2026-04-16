import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Filter, Download, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { InputField } from '../../components/FormFields';

export default function StudentAttendance() {
  const [records, setRecords]   = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filters, setFilters]   = useState({ subject_id: '', from: '', to: '' });
  const [search, setSearch]     = useState('');

  useEffect(() => {
    axios.get('/api/student/subjects').then(r => setSubjects(r.data.subjects || []));
    fetchRecords();
  }, []);

  const fetchRecords = async (f = filters) => {
    setLoading(true);
    const params = {};
    if (f.subject_id) params.subject_id = f.subject_id;
    if (f.from)       params.from = f.from;
    if (f.to)         params.to   = f.to;
    const r = await axios.get('/api/student/attendance', { params });
    setRecords(r.data.records || []);
    setLoading(false);
  };

  const filtered = records.filter(r =>
    !search || r.subject_name?.toLowerCase().includes(search.toLowerCase())
  );

  const presentCount = filtered.filter(r => r.status === 'present').length;
  const total        = filtered.length;
  const pct          = total > 0 ? Math.round((presentCount / total) * 100) : 0;
  const pctColor     = pct >= 75 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600';
  const pctBg        = pct >= 75 ? 'bg-emerald-50 border-emerald-100' : pct >= 60 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100';

  const exportCSV = () => {
    const rows = [['Subject','Date','Status','Method']];
    filtered.forEach(r => rows.push([r.subject_name, r.date, r.status, r.method || '']));
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'my-attendance.csv'; a.click();
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">

      {/* ── Summary Stats ─────────────────────────────────────── */}
      <div className={`card border ${pctBg}`}>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-black text-gray-900">{total}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">Total</p>
          </div>
          <div>
            <p className="text-2xl font-black text-emerald-600">{presentCount}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">Present</p>
          </div>
          <div>
            <p className={`text-2xl font-black ${pctColor}`}>{pct}%</p>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">Rate</p>
          </div>
        </div>
        {total > 0 && (
          <div className="mt-3">
            <div className="progress-bar">
              <div
                className={`progress-fill ${pct >= 75 ? 'progress-green' : pct >= 60 ? 'progress-yellow' : 'progress-red'}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1 text-center">
              {pct >= 75 ? '✓ Satisfactory attendance' : pct >= 60 ? '⚠ Needs improvement' : '✗ Below minimum required'}
            </p>
          </div>
        )}
      </div>

      {/* ── Filters ───────────────────────────────────────────── */}
      <div className="card">
        <h3 className="section-title mb-3"><Filter size={15} className="text-blue-500" /> Filters</h3>
        <select
          value={filters.subject_id}
          onChange={e => setFilters(p => ({...p, subject_id: e.target.value}))}
          className="input-field mb-2.5"
        >
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <div>
            <label className="label">From Date</label>
            <input type="date" value={filters.from} onChange={e => setFilters(p => ({...p, from: e.target.value}))} className="input-field" />
          </div>
          <div>
            <label className="label">To Date</label>
            <input type="date" value={filters.to} onChange={e => setFilters(p => ({...p, to: e.target.value}))} className="input-field" />
          </div>
        </div>
        <button onClick={() => fetchRecords(filters)} className="btn-primary w-full">
          <TrendingUp size={15} /> Apply Filters
        </button>
      </div>

      {/* ── Records ───────────────────────────────────────────── */}
      <div className="card">
        <div className="flex gap-2 mb-4">
          <InputField
            icon={Search}
            className="flex-1"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by subject..."
          />
          <button onClick={exportCSV} title="Export CSV" className="btn btn-secondary btn-icon">
            <Download size={16} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="skeleton h-14" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state py-10">
            <Search size={32} className="empty-state-icon" />
            <p className="empty-state-text">No records found</p>
            <p className="empty-state-sub">Try adjusting your filters</p>
          </div>
        ) : (
          <div>
            {filtered.map(r => (
              <div key={r.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${r.status === 'present' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    {r.status === 'present'
                      ? <CheckCircle size={14} className="text-emerald-600" />
                      : <AlertTriangle size={14} className="text-red-500" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{r.subject_name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                      {r.method ? ` · ${r.method}` : ''}
                    </p>
                  </div>
                </div>
                <span className={r.status === 'present' ? 'badge-present' : 'badge-absent'}>{r.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
