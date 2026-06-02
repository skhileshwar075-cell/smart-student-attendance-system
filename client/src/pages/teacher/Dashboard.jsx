import React, { useState, useEffect } from 'react';
import axios from '../../api.js';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, UserCheck, AlertCircle, TrendingUp, ArrowRight, Activity, Clock } from 'lucide-react';

function StatCard({ icon: Icon, label, value, gradient, sub, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`card hover-lift ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${gradient}`}>
        <Icon size={18} className="text-white" />
      </div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 max-w-2xl mx-auto animate-pulse">
      <div className="grid grid-cols-2 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="card h-24" />)}
      </div>
      <div className="card h-48" />
    </div>
  );
}

export default function TeacherDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryStudents, setCategoryStudents] = useState([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [showSubjectsModal, setShowSubjectsModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/teacher/dashboard')
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  const fetchCategoryStudents = async (category) => {
    setCategoryLoading(true);
    try {
      const r = await axios.get('/api/teacher/dashboard/students', {
        params: { category, class_id: selectedClass, subject_id: selectedSubject }
      });
      setCategoryStudents(r.data.students || []);
    } catch (_) {
      setCategoryStudents([]);
    } finally {
      setCategoryLoading(false);
    }
  };

  const openStudentList = async (category) => {
    setSelectedCategory(category);
    setSelectedClass('');
    setSelectedSubject('');
    setCategoryLoading(true);
    try {
      const r = await axios.get('/api/teacher/dashboard/students', { params: { category } });
      setCategoryStudents(r.data.students || []);
    } catch (_) {
      setCategoryStudents([]);
    } finally {
      setCategoryLoading(false);
    }
  };

  const closeStudentList = () => {
    setSelectedCategory(null);
    setCategoryStudents([]);
  };

  const openSubjectsModal = () => {
    setShowSubjectsModal(true);
  };

  const closeSubjectsModal = () => {
    setShowSubjectsModal(false);
  };

  if (loading) return <LoadingSkeleton />;
  if (!data) return (
    <div className="empty-state card max-w-md mx-auto mt-12">
      <p className="empty-state-text">Failed to load dashboard</p>
    </div>
  );

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long' });

  return (
    <div className="space-y-4 max-w-2xl mx-auto">

      {/* ── Welcome Banner ───────────────────────────────────── */}
      <div className="card bg-gradient-to-br from-blue-600 to-blue-700 border-0 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-xs font-medium mb-1">Teacher Dashboard</p>
            <h2 className="font-bold text-lg leading-tight">Manage Your Classes</h2>
            <p className="text-blue-200 text-sm mt-0.5">{today}</p>
          </div>
          <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center">
            <Activity size={24} className="text-white" />
          </div>
        </div>
      </div>

      {/* ── Stats Grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={BookOpen} label="My Subjects"    value={data.subjects?.length || 0}        gradient="bg-blue-600"
          onClick={openSubjectsModal} />
        <StatCard icon={Users}    label="My Students"    value={data.totalStudents ?? '—'}          gradient="bg-violet-600"
          sub="unique, all classes" onClick={() => navigate('/teacher/students')} />
        <StatCard icon={UserCheck} label="Present Today" value={data.todayStats?.present || 0}      gradient="bg-emerald-600"
          sub="unique students" onClick={() => openStudentList('present')} />
        <StatCard icon={Users}     label="Not Present"   value={data.todayStats?.absent  || 0}      gradient="bg-red-500"
          sub="enrolled − present" onClick={() => openStudentList('absent')} />
      </div>

      {/* Pending requests banner (separate row) */}
      {data.pendingRequests > 0 && (
        <button
          onClick={() => navigate('/teacher/requests')}
          className="w-full card hover-lift cursor-pointer text-left flex items-center justify-between py-3 border-amber-100 bg-amber-50/60"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <AlertCircle size={15} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-800">{data.pendingRequests} Pending Request{data.pendingRequests > 1 ? 's' : ''}</p>
              <p className="text-xs text-amber-600">Students awaiting approval</p>
            </div>
          </div>
          <ArrowRight size={15} className="text-amber-500 flex-shrink-0" />
        </button>
      )}

      {/* ── Quick Actions ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/teacher/attendance')}
          className="card hover-lift cursor-pointer text-center group border border-blue-100 bg-blue-50/50"
        >
          <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-2.5 group-hover:scale-110 transition-transform">
            <UserCheck className="text-white" size={20} />
          </div>
          <p className="text-sm font-bold text-gray-800">Take Attendance</p>
          <p className="text-xs text-gray-500 mt-0.5">Start session or manual</p>
        </button>
        <button
          onClick={() => navigate('/teacher/reports')}
          className="card hover-lift cursor-pointer text-center group border border-purple-100 bg-purple-50/50"
        >
          <div className="w-11 h-11 bg-violet-600 rounded-xl flex items-center justify-center mx-auto mb-2.5 group-hover:scale-110 transition-transform">
            <TrendingUp className="text-white" size={20} />
          </div>
          <p className="text-sm font-bold text-gray-800">View Reports</p>
          <p className="text-xs text-gray-500 mt-0.5">Analytics & exports</p>
        </button>
      </div>

      {/* ── My Subjects ──────────────────────────────────────── */}
      <div className="card">
        <div className="section-header">
          <h3 className="section-title"><BookOpen size={16} className="text-blue-500" /> My Subjects</h3>
          <span className="badge-blue">{data.subjects?.length || 0} assigned</span>
        </div>

        {!data.subjects?.length ? (
          <div className="empty-state py-8">
            <BookOpen size={32} className="empty-state-icon" />
            <p className="empty-state-text">No subjects assigned yet</p>
            <p className="empty-state-sub">Contact your administrator</p>
          </div>
        ) : (
          <div className="space-y-0">
            {data.subjects.map(s => (
              <div key={s.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <BookOpen size={15} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.class_name} {s.section} · {s.code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-400 hidden sm:block">
                    {parseInt(s.student_count) || 0} students
                  </span>
                  <button
                    onClick={() => navigate(`/teacher/attendance?subject_id=${s.id}`)}
                    className="btn btn-sm btn-primary opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Clock size={12} /> Attend
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Student List Modal ─────────────────────────────────── */}
      {selectedCategory && (
        <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={closeStudentList} />
          <div className="relative w-full md:max-w-2xl bg-white rounded-t-xl shadow-lg max-h-[80vh] overflow-auto md:rounded-3xl">
            <div className="p-4 md:p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 capitalize">{selectedCategory} Today</h3>
                  <p className="text-sm text-gray-500">Total: {categoryStudents.length} student{categoryStudents.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={closeStudentList} className="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50">Close</button>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setSelectedSubject('');
                  }}
                  className="input-field text-sm"
                >
                  <option value="">All Classes</option>
                  {data?.subjects?.reduce((acc, s) => {
                    if (!acc.find(c => c.id === s.class_id)) {
                      acc.push({ id: s.class_id, name: `${s.class_name} ${s.section}` });
                    }
                    return acc;
                  }, []).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="input-field text-sm"
                >
                  <option value="">All Subjects</option>
                  {(selectedClass
                    ? data?.subjects?.filter(s => String(s.class_id) === String(selectedClass))
                    : data?.subjects || []
                  ).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Apply Filters Button */}
              <button
                onClick={() => fetchCategoryStudents(selectedCategory)}
                className="btn btn-sm btn-primary w-full mb-4"
              >
                Apply Filters
              </button>

              {/* Student List */}
              {categoryLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <div key={i} className="skeleton h-12" />)}
                </div>
              ) : categoryStudents.length === 0 ? (
                <div className="text-center py-8">
                  <Users size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">No students found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {categoryStudents.map(s => (
                    <div key={s.student_id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{s.student_name}</p>
                        <p className="text-xs text-gray-500">{s.student_id} · {s.class_name} {s.section}</p>
                      </div>
                      {s.subject_name && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">{s.subject_name}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Subjects Modal ─────────────────────────────────────── */}
      {showSubjectsModal && (
        <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={closeSubjectsModal} />
          <div className="relative w-full md:max-w-2xl bg-white rounded-t-xl shadow-lg max-h-[80vh] overflow-auto md:rounded-3xl">
            <div className="p-4 md:p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">My Subjects</h3>
                  <p className="text-sm text-gray-500">Total: {data?.subjects?.length || 0} subject{data?.subjects?.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={closeSubjectsModal} className="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50">Close</button>
              </div>

              {/* Subjects List */}
              {data?.subjects && data.subjects.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">No subjects assigned</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data?.subjects?.map(s => (
                    <div
                      key={s.id}
                      onClick={() => {
                        navigate(`/teacher/attendance?subject_id=${s.id}`);
                        closeSubjectsModal();
                      }}
                      className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.class_name} {s.section}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-blue-600">{s.student_count} students</p>
                        <p className="text-xs text-gray-400">{s.code}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
