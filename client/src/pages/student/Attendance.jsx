import React, { useState, useEffect } from 'react';
import axios from '../../api.js';
import { Search, Filter, Download, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { InputField } from '../../components/FormFields';

export default function StudentAttendance() {
  const [records, setRecords]   = useState([]);
  const [calendarRecords, setCalendarRecords] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filters, setFilters]   = useState({ subject_id: '', from: '', to: '' });
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(0);
  const [limit, setLimit]       = useState(30);
  const [total, setTotal]       = useState(0);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  useEffect(() => {
    axios.get('/api/student/subjects').then(r => setSubjects(r.data.subjects || []));
    fetchCalendarRecords();
    fetchRecords(filters, 0, search);
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchRecords(filters, 0, search);
    }, 400);
    return () => clearTimeout(debounce);
  }, [search]);

  useEffect(() => {
    fetchCalendarRecords();
  }, [currentMonth, filters.subject_id]);

  const fetchRecords = async (f = filters, pageIndex = page, query = search) => {
    setLoading(true);
    const params = { limit, offset: pageIndex * limit };
    if (f.subject_id) params.subject_id = f.subject_id;
    if (f.from)       params.from = f.from;
    if (f.to)         params.to   = f.to;
    if (query)        params.search = query;
    const r = await axios.get('/api/student/attendance', { params });
    setRecords(r.data.records || []);
    setTotal(r.data.total || 0);
    setLimit(r.data.limit || limit);
    setPage(r.data.offset ? Math.floor(r.data.offset / (r.data.limit || limit)) : pageIndex);
    setLoading(false);
  };

  const fetchCalendarRecords = async () => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const params = { from: firstDay.toISOString().slice(0, 10), to: lastDay.toISOString().slice(0, 10), limit: 1000, offset: 0 };
    if (filters.subject_id) params.subject_id = filters.subject_id;
    const r = await axios.get('/api/student/attendance', { params });
    setCalendarRecords(r.data.records || []);
  };

  const pagePresentCount = records.filter(r => r.status === 'present').length;
  const pageAbsentCount = records.filter(r => r.status === 'absent').length;
  const pageHolidayCount = records.filter(r => r.status === 'holiday').length;
  const pageTotal = records.length;
  const pageStart = total === 0 ? 0 : page * limit + 1;
  const pageEnd = page * limit + records.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const activeTotal  = Math.max(pageTotal - pageHolidayCount, 0);
  const pct          = activeTotal > 0 ? Math.round((pagePresentCount / activeTotal) * 100) : 0;
  const pctColor     = pct >= 75 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600';
  const pctBg        = pct >= 75 ? 'bg-emerald-50 border-emerald-100' : pct >= 60 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100';

  const monthRecords = calendarRecords.reduce((map, record) => {
    const dateKey = record.date?.slice(0, 10);
    if (!dateKey) return map;
    const priority = { holiday: 3, absent: 2, late: 2, excused: 2, present: 1 };
    const existing = map[dateKey];
    if (!existing || priority[record.status] > priority[existing]) {
      map[dateKey] = record.status;
    }
    return map;
  }, {});

  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthName = monthStart.toLocaleString('default', { month: 'long' });
  const year = monthStart.getFullYear();
  const startDay = monthStart.getDay();
  const daysInMonth = new Date(year, currentMonth.getMonth() + 1, 0).getDate();
  const totalCells = startDay + daysInMonth;
  const rows = Math.ceil(totalCells / 7);
  const calendarCells = Array.from({ length: rows * 7 }, (_, idx) => {
    const day = idx - startDay + 1;
    if (day < 1 || day > daysInMonth) return null;
    const date = new Date(year, currentMonth.getMonth(), day);
    const key = date.toISOString().slice(0, 10);
    return {
      day,
      status: monthRecords[key] || null,
      dateKey: key,
    };
  });

  const statusLabel = status => {
    if (status === 'present') return 'Present';
    if (status === 'holiday') return 'Holiday';
    if (status === 'absent' || status === 'late' || status === 'excused') return 'Absent';
    return 'No record';
  };

  const statusClass = status => {
    if (status === 'present') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (status === 'holiday') return 'bg-yellow-100 text-amber-700 border-yellow-200';
    if (status === 'absent' || status === 'late' || status === 'excused') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-gray-50 text-gray-400 border-gray-200';
  };

  const exportCSV = () => {
    const rows = [['Subject','Date','Status','Method']];
    records.forEach(r => rows.push([r.subject_name, r.date, r.status, r.method || '']));
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'my-attendance.csv'; a.click();
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">

      {/* ── Summary Stats ─────────────────────────────────────── */}
      <div className={`card border ${pctBg}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-black text-gray-900">{total}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">Total matching records</p>
            <p className="text-xs text-gray-400 mt-1">Showing {pageStart}–{pageEnd}</p>
          </div>
          <div>
            <p className="text-2xl font-black text-emerald-600">{pagePresentCount}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">Present on page</p>
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

      {/* ── Calendar Attendance Report ────────────────────────── */}
      <div className="card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">Attendance Calendar</p>
            <h3 className="text-lg font-semibold text-gray-900">{monthName} {year}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              className="btn btn-secondary btn-sm"
            >◀</button>
            <button
              onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              className="btn btn-secondary btn-sm"
            >▶</button>
          </div>
        </div>
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="min-w-[360px]">
            <div className="grid grid-cols-7 gap-2 text-center text-xs text-gray-500 mb-3">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => (
                <div key={day} className="font-medium">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {calendarCells.map((cell, index) => (
                <div
                  key={`${cell?.dateKey || 'blank'}-${index}`}
                  className={`min-h-[72px] rounded-2xl border p-2 text-left ${cell ? statusClass(cell.status) : 'bg-gray-50 border-gray-100'}`}
                >
                  {cell ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-800">{cell.day}</span>
                        {cell.status && (
                          <span className="text-[10px] uppercase tracking-[0.18em] font-semibold">
                            {cell.status === 'present' ? 'P' : cell.status === 'holiday' ? 'H' : 'A'}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-[11px] text-gray-600">{statusLabel(cell.status)}</p>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs">
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 block" />
            <span className="text-gray-700">Present days</span>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-yellow-100 bg-yellow-50 p-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600 block" />
            <span className="text-gray-700">Holiday days</span>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 p-3">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 block" />
            <span className="text-gray-700">Absent days</span>
          </div>
        </div>
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
        <button onClick={() => { setPage(0); fetchRecords(filters, 0, search); }} className="btn-primary w-full">
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
        ) : records.length === 0 ? (
          <div className="empty-state py-10">
            <Search size={32} className="empty-state-icon" />
            <p className="empty-state-text">No records found</p>
            <p className="empty-state-sub">Try adjusting your filters</p>
          </div>
        ) : (
          <div>
            {records.map(r => (
              <div key={r.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${r.status === 'present' ? 'bg-emerald-100' : r.status === 'holiday' ? 'bg-yellow-100' : 'bg-red-100'}`}>
                    {r.status === 'present' ? (
                      <CheckCircle size={14} className="text-emerald-600" />
                    ) : r.status === 'holiday' ? (
                      <span className="text-yellow-600 font-semibold">H</span>
                    ) : (
                      <AlertTriangle size={14} className="text-red-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{r.subject_name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                      {r.method ? ` · ${r.method}` : ''}
                    </p>
                  </div>
                </div>
                <span className={
                  r.status === 'present' ? 'badge-present' :
                  r.status === 'holiday' ? 'badge-holiday' :
                  'badge-absent'
                }>{r.status}</span>
              </div>
            ))}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-gray-500">
              <p>Showing {pageStart}–{pageEnd} of {total}</p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 0 || loading}
                  onClick={() => {
                    const nextPage = Math.max(page - 1, 0);
                    setPage(nextPage);
                    fetchRecords(filters, nextPage, search);
                  }}
                  className="btn btn-secondary btn-sm"
                >Previous</button>
                <button
                  disabled={page >= totalPages - 1 || loading}
                  onClick={() => {
                    const nextPage = Math.min(page + 1, totalPages - 1);
                    setPage(nextPage);
                    fetchRecords(filters, nextPage, search);
                  }}
                  className="btn btn-secondary btn-sm"
                >Next</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
