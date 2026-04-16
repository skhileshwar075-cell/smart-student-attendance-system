import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Filter, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import { InputField } from '../../components/FormFields';

export default function TeacherRecords() {
  const [records,  setRecords]  = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filters,  setFilters]  = useState({ subject_id: '', from: '', to: '' });
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    axios.get('/api/teacher/subjects').then(r => setSubjects(r.data.subjects || []));
    fetchRecords();
  }, []);

  const fetchRecords = async (f = filters) => {
    setLoading(true);
    const params = {};
    if (f.subject_id) params.subject_id = f.subject_id;
    if (f.from)       params.from = f.from;
    if (f.to)         params.to   = f.to;
    const r = await axios.get('/api/teacher/attendance', { params });
    setRecords(r.data.records || []);
    setLoading(false);
  };

  const filtered = records.filter(r =>
    !search ||
    r.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.student_code?.toLowerCase().includes(search.toLowerCase())
  );

  const presentCount = filtered.filter(r => r.status === 'present').length;
  const absentCount  = filtered.filter(r => r.status === 'absent').length;

  const exportCSV = () => {
    const rows = [['Student','Student ID','Subject','Date','Status','Method']];
    filtered.forEach(r => rows.push([r.student_name, r.student_code, r.subject_name, r.date, r.status, r.method || '']));
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'attendance-records.csv'; a.click();
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">

      {/* ── Summary ───────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card text-center py-3">
            <p className="text-xl font-black text-gray-900">{filtered.length}</p>
            <p className="text-xs text-gray-500 font-medium">Total</p>
          </div>
          <div className="card text-center py-3 bg-emerald-50 border-emerald-100">
            <p className="text-xl font-black text-emerald-600">{presentCount}</p>
            <p className="text-xs text-emerald-500 font-medium">Present</p>
          </div>
          <div className="card text-center py-3 bg-red-50 border-red-100">
            <p className="text-xl font-black text-red-600">{absentCount}</p>
            <p className="text-xs text-red-500 font-medium">Absent</p>
          </div>
        </div>
      )}

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
            <label className="label">From</label>
            <input type="date" value={filters.from} onChange={e => setFilters(p => ({...p, from: e.target.value}))} className="input-field" />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" value={filters.to} onChange={e => setFilters(p => ({...p, to: e.target.value}))} className="input-field" />
          </div>
        </div>
        <button onClick={() => fetchRecords(filters)} className="btn-primary w-full">Apply Filters</button>
      </div>

      {/* ── Records Table ─────────────────────────────────────── */}
      <div className="card">
        <div className="flex gap-2 mb-4">
          <InputField
            icon={Search}
            className="flex-1"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by student name or ID..."
          />
          <button onClick={exportCSV} title="Export CSV" className="btn btn-secondary btn-icon">
            <Download size={16} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-16" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state py-10">
            <Search size={32} className="empty-state-icon" />
            <p className="empty-state-text">No records found</p>
            <p className="empty-state-sub">Try adjusting filters or search term</p>
          </div>
        ) : (
          <div>
            {filtered.map(r => (
              <div key={r.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-white ${
                  r.status === 'present' ? 'bg-emerald-500' : 'bg-red-500'
                }`}>
                  {r.student_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{r.student_name}</p>
                  <p className="text-xs text-gray-400">
                    {r.student_code} · {r.subject_name} ·{' '}
                    {new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
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
