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
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/teacher/dashboard')
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

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
        <StatCard icon={BookOpen} label="My Subjects"    value={data.subjects?.length || 0}        gradient="bg-blue-600" />
        <StatCard icon={Users}    label="My Students"    value={data.totalStudents ?? '—'}          gradient="bg-violet-600"
          sub="unique, all classes" />
        <StatCard icon={UserCheck} label="Present Today" value={data.todayStats?.present || 0}      gradient="bg-emerald-600"
          sub="unique students" />
        <StatCard icon={Users}     label="Not Present"   value={data.todayStats?.absent  || 0}      gradient="bg-red-500"
          sub="enrolled − present" />
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
                    onClick={() => navigate('/teacher/attendance')}
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

    </div>
  );
}
