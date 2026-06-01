import React, { useState, useEffect } from 'react';
import axios from '../../api.js';
import { useNavigate } from 'react-router-dom';
import {
  Users, GraduationCap, BookOpen, UserCheck, TrendingDown, BarChart2,
  Shield, ArrowRight, CheckCircle, AlertTriangle, Activity
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, gradient, textColor, badgeClass, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`card hover-lift ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className={`w-10 h-10 ${gradient} rounded-xl flex items-center justify-center mb-3`}>
        <Icon size={18} className="text-white" />
      </div>
      <p className={`text-2xl font-black ${textColor || 'text-gray-900'}`}>{value}</p>
      <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      {onClick && (
        <p className="text-xs text-blue-500 font-medium mt-2 flex items-center gap-1">
          Manage <ArrowRight size={11} />
        </p>
      )}
    </div>
  );
}

function QuickAction({ icon: Icon, label, desc, gradient, onClick }) {
  return (
    <button
      onClick={onClick}
      className="card hover-lift cursor-pointer text-left group w-full"
    >
      <div className={`w-10 h-10 ${gradient} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
        <Icon size={18} className="text-white" />
      </div>
      <p className="text-sm font-bold text-gray-800">{label}</p>
      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 max-w-3xl mx-auto animate-pulse">
      <div className="card h-24" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="card h-24" />)}
      </div>
      <div className="card h-32" />
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/admin/stats')
      .then(r => setStats(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  // presentPct uses totalStudents as denominator so it's always relative to full enrollment
  const presentPct = stats?.totalStudents
    ? Math.round((stats.presentToday || 0) / stats.totalStudents * 100)
    : null;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">

      {/* ── Welcome Banner ───────────────────────────────────── */}
      <div className="card bg-gradient-to-br from-violet-700 to-purple-800 border-0 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-300 text-xs font-medium mb-1 flex items-center gap-1.5">
              <span className="dot-active" /> System Online
            </p>
            <h2 className="font-bold text-xl leading-tight">Admin Dashboard</h2>
            <p className="text-purple-200 text-sm mt-0.5">{today}</p>
          </div>
          <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center">
            <Shield size={28} className="text-white" />
          </div>
        </div>

        {/* Attendance snapshot */}
        <div className="mt-4 bg-white/10 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-purple-200 text-xs">Today's Attendance Rate</p>
            <p className="text-2xl font-black text-white">{presentPct ?? 0}%</p>
            <p className="text-purple-300 text-[10px] mt-0.5">of {stats?.totalStudents || 0} enrolled</p>
          </div>
          <div className="flex gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-emerald-300">{stats?.presentToday || 0}</p>
              <p className="text-purple-300 text-[10px]">Present</p>
            </div>
            <div className="w-px bg-white/20" />
            <div>
              <p className="text-lg font-bold text-red-300">{stats?.absentToday || 0}</p>
              <p className="text-purple-300 text-[10px]">Not Present</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Core Stats ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={GraduationCap} label="Students" value={stats?.totalStudents || 0}
          gradient="bg-blue-600" onClick={() => navigate('/admin/students')}
        />
        <StatCard
          icon={Users} label="Teachers" value={stats?.totalTeachers || 0}
          gradient="bg-violet-600" onClick={() => navigate('/admin/teachers')}
        />
        <StatCard
          icon={BookOpen} label="Subjects" value={stats?.totalSubjects || 0}
          gradient="bg-emerald-600" onClick={() => navigate('/admin/subjects')}
        />
        <StatCard
          icon={UserCheck} label="Classes" value={stats?.totalClasses || 0}
          gradient="bg-orange-500" onClick={() => navigate('/admin/classes')}
        />
      </div>

      {/* ── Today's Attendance Detail ─────────────────────────── */}
      <div className="card">
        <div className="section-header">
          <h3 className="section-title"><Activity size={16} className="text-violet-500" /> Today's Attendance</h3>
          <button onClick={() => navigate('/admin/analytics')} className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
            Full Analytics <ArrowRight size={11} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <CheckCircle size={16} className="text-emerald-600" />
              <span className="text-xs text-emerald-600 font-semibold">Present</span>
            </div>
            <p className="text-3xl font-black text-emerald-700">{stats?.presentToday || 0}</p>
            <p className="text-[10px] text-emerald-500 mt-1">unique students</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <AlertTriangle size={16} className="text-red-500" />
              <span className="text-xs text-red-500 font-semibold">Not Present</span>
            </div>
            <p className="text-3xl font-black text-red-600">{stats?.absentToday || 0}</p>
            <p className="text-[10px] text-red-400 mt-1">enrolled − present</p>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-2">
          Present + Not Present = {(stats?.presentToday || 0) + (stats?.absentToday || 0)} total enrolled students
        </p>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────── */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction icon={BarChart2} label="Analytics" desc="View system reports" gradient="bg-violet-600" onClick={() => navigate('/admin/analytics')} />
          <QuickAction icon={TrendingDown} label="Adv. Analytics" desc="Deep attendance insights" gradient="bg-blue-600" onClick={() => navigate('/admin/attendance-analytics')} />
          <QuickAction icon={Shield} label="Audit Logs" desc="System activity trail" gradient="bg-slate-700" onClick={() => navigate('/admin/logs')} />
          <QuickAction icon={BookOpen} label="Reports" desc="Export attendance data" gradient="bg-emerald-600" onClick={() => navigate('/admin/reports')} />
        </div>
      </div>

    </div>
  );
}
