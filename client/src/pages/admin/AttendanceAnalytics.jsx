import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, Bell, Search, TrendingDown, BookOpen, Users, User } from 'lucide-react';
import { InputField } from '../../components/FormFields';

const TABS = [
  { key: 'class', label: 'Class Analysis', icon: Users },
  { key: 'subject', label: 'Subject Analysis', icon: BookOpen },
  { key: 'student', label: 'Student Analysis', icon: User },
  { key: 'shortlist', label: 'Low Attendance', icon: TrendingDown },
];

function PctBadge({ pct }) {
  const v = parseFloat(pct) || 0;
  const color = v >= 75 ? 'text-green-700 bg-green-100' : v >= 50 ? 'text-yellow-700 bg-yellow-100' : 'text-red-700 bg-red-100';
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{v}%</span>;
}

function AttendanceBar({ pct }) {
  const v = parseFloat(pct) || 0;
  const color = v >= 75 ? 'bg-green-500' : v >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(v, 100)}%` }} />
    </div>
  );
}

export default function AttendanceAnalytics() {
  const [tab, setTab] = useState('class');
  const [filters, setFilters] = useState({ from: '', to: '', class_id: '', subject_id: '' });
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [classData, setClassData] = useState([]);
  const [subjectData, setSubjectData] = useState([]);

  const [studentSearch, setStudentSearch] = useState('');
  const [studentList, setStudentList] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentAnalysis, setStudentAnalysis] = useState(null);
  const [studentLoading, setStudentLoading] = useState(false);

  const [shortlistFilters, setShortlistFilters] = useState({ class_id: '', subject_id: '', from: '', to: '', threshold: 75, search: '' });
  const [shortlist, setShortlist] = useState([]);
  const [shortlistLoading, setShortlistLoading] = useState(false);
  const [shortlistFetched, setShortlistFetched] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');

  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => {
    axios.get('/api/admin/classes').then(r => setClasses(r.data.classes || []));
    axios.get('/api/admin/subjects').then(r => setSubjects(r.data.subjects || []));
  }, []);

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const params = {};
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.class_id) params.class_id = filters.class_id;
      const r = await axios.get('/api/admin/attendance/analytics', { params });
      setClassData(r.data.classWise || []);
      setSubjectData(r.data.subjectWise || []);
    } catch {}
    setAnalyticsLoading(false);
  };

  useEffect(() => { fetchAnalytics(); }, []);

  const searchStudents = async () => {
    if (!studentSearch.trim()) return;
    const r = await axios.get('/api/admin/students', { params: { search: studentSearch, limit: 20 } });
    setStudentList(r.data.students || []);
  };

  const fetchStudentAnalysis = async (student) => {
    setSelectedStudent(student);
    setStudentAnalysis(null);
    setStudentLoading(true);
    try {
      const params = {};
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      const r = await axios.get(`/api/admin/attendance/student/${student.id}`, { params });
      setStudentAnalysis(r.data);
    } catch (e) {
      setStudentAnalysis({ error: e.response?.data?.error || 'No attendance data found' });
    }
    setStudentLoading(false);
  };

  const fetchShortlist = async () => {
    setShortlistLoading(true);
    setShortlistFetched(true);
    try {
      const params = { threshold: shortlistFilters.threshold };
      if (shortlistFilters.class_id) params.class_id = shortlistFilters.class_id;
      if (shortlistFilters.subject_id) params.subject_id = shortlistFilters.subject_id;
      if (shortlistFilters.from) params.from = shortlistFilters.from;
      if (shortlistFilters.to) params.to = shortlistFilters.to;
      if (shortlistFilters.search) params.search = shortlistFilters.search;
      const r = await axios.get('/api/admin/attendance/low-shortlist', { params });
      setShortlist(r.data.students || []);
    } catch {}
    setShortlistLoading(false);
  };

  const sendAlert = async (student) => {
    try {
      await axios.post('/api/teacher/alerts', { student_id: student.student_id });
      setAlertMsg(`Alert sent to ${student.name}`);
      setTimeout(() => setAlertMsg(''), 3000);
    } catch { setAlertMsg('Failed to send alert'); }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {alertMsg && <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-xl">{alertMsg}</div>}

      <div className="attendance-card space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date Range Filter</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div><label className="label text-xs">From Date</label>
            <input type="date" value={filters.from} onChange={e => setFilters(p => ({ ...p, from: e.target.value }))} className="input-field text-sm" /></div>
          <div><label className="label text-xs">To Date</label>
            <input type="date" value={filters.to} onChange={e => setFilters(p => ({ ...p, to: e.target.value }))} className="input-field text-sm" /></div>
        </div>
        <button onClick={fetchAnalytics} className="btn-primary w-full" disabled={analyticsLoading}>
          {analyticsLoading ? 'Loading...' : 'Apply Filter'}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${tab === t.key ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              <Icon size={13} />{t.label}
            </button>
          );
        })}
      </div>

      {tab === 'class' && (
        <div className="attendance-card">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><Users size={16} className="text-purple-600" /> Class-wise Attendance</h3>
          {analyticsLoading ? <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full" /></div>
            : classData.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">No data available for selected range</p>
            : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={classData} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="class_name" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={v => `${v}%`} />
                    <Bar dataKey="avg_attendance" fill="#7c3aed" radius={4} name="Avg %" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-3">
                  {classData.map((c, i) => (
                    <div key={i} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{c.class_name} {c.section && `(${c.section})`}</p>
                          <p className="text-xs text-gray-400">{c.total_students} students · {c.total_records} records</p>
                        </div>
                        <PctBadge pct={c.avg_attendance} />
                      </div>
                      <AttendanceBar pct={c.avg_attendance} />
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span className="text-green-600">Present: {c.present_count}</span>
                        <span className="text-red-600">Absent: {c.absent_count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
        </div>
      )}

      {tab === 'subject' && (
        <div className="attendance-card">
          <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2"><BookOpen size={16} className="text-blue-600" /> Subject-wise Attendance</h3>
            <select value={filters.class_id} onChange={e => setFilters(p => ({ ...p, class_id: e.target.value }))} className="input-field text-xs py-1 sm:w-36">
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
            </select>
          </div>
          {analyticsLoading ? <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" /></div>
            : subjectData.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">No data available for selected range</p>
            : (
              <div className="space-y-3">
                {subjectData.map((s, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="text-sm font-medium text-gray-800 truncate">{s.subject_name} <span className="text-gray-400 text-xs">({s.code})</span></p>
                        <p className="text-xs text-gray-400">{s.class_name} {s.section} · {s.total_records} records</p>
                      </div>
                      <PctBadge pct={s.avg_attendance} />
                    </div>
                    <AttendanceBar pct={s.avg_attendance} />
                  </div>
                ))}
              </div>
            )}
        </div>
      )}

      {tab === 'student' && (
        <div className="space-y-3">
          <div className="attendance-card space-y-3">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2"><User size={16} className="text-indigo-600" /> Individual Student Analysis</h3>
            <div className="flex gap-2">
              <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchStudents()}
                placeholder="Search by name or student ID…" className="input-field min-w-0 flex-1 text-sm" />
              <button onClick={searchStudents} className="btn-primary px-3"><Search size={15} /></button>
            </div>
            {studentList.length > 0 && (
              <div className="border border-gray-100 rounded-xl divide-y divide-gray-50 max-h-48 overflow-y-auto">
                {studentList.map(s => (
                  <button key={s.id} onClick={() => fetchStudentAnalysis(s)}
                    className={`w-full text-left px-3 py-2 hover:bg-purple-50 transition-colors ${selectedStudent?.id === s.id ? 'bg-purple-50' : ''}`}>
                    <p className="text-sm font-medium text-gray-800">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.student_id} · {s.class_name} {s.class_section}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {studentLoading && <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full" /></div>}

          {studentAnalysis && !studentLoading && (
            studentAnalysis.error ? <div className="attendance-card text-center text-gray-400 text-sm py-6">{studentAnalysis.error}</div>
            : (
              <div className="attendance-card space-y-4">
                <div className="bg-purple-50 rounded-xl p-3">
                  <p className="font-semibold text-gray-800">{studentAnalysis.profile?.name}</p>
                  <p className="text-xs text-gray-500">{studentAnalysis.profile?.student_code} · {studentAnalysis.profile?.class_name} {studentAnalysis.profile?.section}</p>
                </div>
                <div className="grid grid-cols-1 gap-2 text-center sm:grid-cols-3">
                  <div className="bg-blue-50 rounded-xl p-2">
                    <p className="text-xl font-bold text-blue-700">{studentAnalysis.overall?.total_classes || 0}</p>
                    <p className="text-xs text-gray-500">Total Classes</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-2">
                    <p className="text-xl font-bold text-green-700">{studentAnalysis.overall?.present_count || 0}</p>
                    <p className="text-xs text-gray-500">Present</p>
                  </div>
                  <div className={`rounded-xl p-2 ${parseFloat(studentAnalysis.overall?.percentage) >= 75 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <p className={`text-xl font-bold ${parseFloat(studentAnalysis.overall?.percentage) >= 75 ? 'text-green-700' : 'text-red-700'}`}>
                      {studentAnalysis.overall?.percentage || 0}%
                    </p>
                    <p className="text-xs text-gray-500">Overall</p>
                  </div>
                </div>
                {studentAnalysis.bySubject?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Subject Breakdown</p>
                    <div className="space-y-2">
                      {studentAnalysis.bySubject.map((s, i) => (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex-1 min-w-0 mr-2">
                              <p className="text-sm text-gray-800 truncate">{s.subject_name} <span className="text-gray-400 text-xs">({s.code})</span></p>
                              <p className="text-xs text-gray-400">{s.present_count}/{s.total_classes} classes</p>
                            </div>
                            <PctBadge pct={s.percentage} />
                          </div>
                          <AttendanceBar pct={s.percentage} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      {tab === 'shortlist' && (
        <div className="space-y-3">
          <div className="attendance-card space-y-3">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2"><TrendingDown size={16} className="text-red-500" /> Low Attendance Shortlist</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <label className="label text-xs">Class</label>
                <select value={shortlistFilters.class_id} onChange={e => setShortlistFilters(p => ({ ...p, class_id: e.target.value }))} className="input-field text-sm">
                  <option value="">All Classes</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
                </select>
              </div>
              <div>
                <label className="label text-xs">Subject</label>
                <select value={shortlistFilters.subject_id} onChange={e => setShortlistFilters(p => ({ ...p, subject_id: e.target.value }))} className="input-field text-sm">
                  <option value="">All Subjects</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label text-xs">From Date</label>
                <input type="date" value={shortlistFilters.from} onChange={e => setShortlistFilters(p => ({ ...p, from: e.target.value }))} className="input-field text-sm" />
              </div>
              <div>
                <label className="label text-xs">To Date</label>
                <input type="date" value={shortlistFilters.to} onChange={e => setShortlistFilters(p => ({ ...p, to: e.target.value }))} className="input-field text-sm" />
              </div>
            </div>
            <div>
              <label className="label text-xs">Attendance Threshold: below <span className="font-bold text-red-600">{shortlistFilters.threshold}%</span></label>
              <input type="range" min="1" max="100" value={shortlistFilters.threshold}
                onChange={e => setShortlistFilters(p => ({ ...p, threshold: parseInt(e.target.value) }))}
                className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-red-500" />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5"><span>1%</span><span>50%</span><span>100%</span></div>
            </div>
            <InputField icon={Search} value={shortlistFilters.search} onChange={e => setShortlistFilters(p => ({ ...p, search: e.target.value }))}
              placeholder="Search by name or student ID…" inputClassName="text-sm" />
            <button onClick={fetchShortlist} className="btn-primary w-full" disabled={shortlistLoading}>
              {shortlistLoading ? 'Generating…' : 'Generate Shortlist'}
            </button>
          </div>

          {shortlistLoading && <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full" /></div>}

          {!shortlistLoading && shortlistFetched && (
            <div className="attendance-card">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                  <AlertTriangle size={15} className="text-red-500" />
                  {shortlist.length} student{shortlist.length !== 1 ? 's' : ''} below {shortlistFilters.threshold}%
                </h4>
              </div>
              {shortlist.length === 0 ? <p className="text-gray-400 text-sm text-center py-6">No students below this threshold</p>
                : (
                  <div className="space-y-2">
                    {shortlist.map((s, i) => {
                      const pct = parseFloat(s.percentage) || 0;
                      const critical = pct < 50;
                      return (
                        <div key={i} className={`flex flex-col gap-3 p-3 rounded-xl border sm:flex-row sm:items-center sm:justify-between ${critical ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-100'}`}>
                          <div className="flex-1 min-w-0 mr-2">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                              {critical && <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">CRITICAL</span>}
                            </div>
                            <p className="text-xs text-gray-500">{s.student_code} · {s.class_name} {s.section}</p>
                            <p className="text-xs text-gray-400">{s.present_count}/{s.total_classes} classes attended</p>
                          </div>
                          <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
                            <PctBadge pct={s.percentage} />
                            <button onClick={() => sendAlert(s)} title="Send low-attendance alert"
                              className="w-7 h-7 flex items-center justify-center bg-white border border-orange-300 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors">
                              <Bell size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
