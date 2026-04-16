import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, BookOpen, Bell, ArrowRight, UserCheck, FileText, TrendingUp } from 'lucide-react';

function CircleProgress({ value = 0, size = 96 }) {
  const r = 36; const c = 2 * Math.PI * r;
  const offset = c - (Math.min(value, 100) / 100) * c;
  const color = value >= 75 ? '#059669' : value >= 60 ? '#D97706' : '#DC2626';
  const trackColor = value >= 75 ? '#D1FAE5' : value >= 60 ? '#FEF3C7' : '#FEE2E2';
  return (
    <svg width={size} height={size} viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={r} fill="none" stroke={trackColor} strokeWidth="9" />
      <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="9"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 48 48)"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x="48" y="53" textAnchor="middle" fill={color} fontSize="16" fontWeight="800">{value}%</text>
    </svg>
  );
}

function AttendanceBadge({ pct }) {
  const num = parseFloat(pct) || 0;
  if (num >= 75) return <span className="badge-present">{num}%</span>;
  if (num >= 60) return <span className="badge-pending">{num}%</span>;
  return <span className="badge-absent">{num}%</span>;
}

function SubjectBar({ subject }) {
  const pct = parseFloat(subject.percentage) || 0;
  const colorClass = pct >= 75 ? 'progress-green' : pct >= 60 ? 'progress-yellow' : 'progress-red';
  return (
    <div className="py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex-1 mr-3">
          <p className="text-sm font-semibold text-gray-800 truncate">{subject.name}</p>
          <p className="text-xs text-gray-400">{subject.present_count}/{subject.total_classes} classes attended</p>
        </div>
        <AttendanceBadge pct={pct} />
      </div>
      <div className="progress-bar">
        <div className={`progress-fill ${colorClass}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 max-w-2xl mx-auto animate-pulse">
      <div className="card h-32" />
      <div className="grid grid-cols-2 gap-3">
        <div className="card h-24" /><div className="card h-24" />
      </div>
      <div className="card h-48" />
    </div>
  );
}

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/student/dashboard')
      .then(r => setData(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (error || !data) return (
    <div className="empty-state card max-w-md mx-auto mt-12">
      <AlertTriangle className="empty-state-icon text-red-400" size={40} />
      <p className="empty-state-text">Could not load dashboard</p>
      <p className="empty-state-sub">Please refresh or try again</p>
    </div>
  );

  const lowAttendance = data.subjects.filter(s => parseFloat(s.percentage) < 75);
  const pct = data.overallPercentage || 0;
  const statusColor = pct >= 75 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600';
  const statusBg = pct >= 75 ? 'from-emerald-50 to-teal-50 border-emerald-100' : pct >= 60 ? 'from-amber-50 to-yellow-50 border-amber-100' : 'from-red-50 to-rose-50 border-red-100';

  return (
    <div className="space-y-4 max-w-2xl mx-auto">

      {/* ── Overall Attendance Hero ───────────────────────────── */}
      <div className={`card bg-gradient-to-br ${statusBg} border`}>
        <div className="flex items-center gap-5">
          <CircleProgress value={pct} size={96} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Overall Attendance</p>
            <p className={`text-3xl font-black ${statusColor}`}>{pct}%</p>
            <p className="text-gray-600 text-sm mt-1">
              {data.presentCount} present · {data.totalClasses - data.presentCount} absent · {data.totalClasses} total
            </p>
            {pct < 75 && (
              <div className="flex items-center gap-1.5 mt-2 text-red-600 text-xs font-semibold">
                <AlertTriangle size={13} />
                Below minimum required (75%)
              </div>
            )}
            {pct >= 75 && (
              <div className="flex items-center gap-1.5 mt-2 text-emerald-600 text-xs font-semibold">
                <CheckCircle size={13} />
                Attendance is satisfactory
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Low Attendance Alert ──────────────────────────────── */}
      {lowAttendance.length > 0 && (
        <div className="alert alert-error">
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-sm mb-1">Low Attendance — {lowAttendance.length} subject{lowAttendance.length > 1 ? 's' : ''}</p>
            <div className="space-y-1">
              {lowAttendance.map(s => (
                <div key={s.id} className="flex items-center justify-between">
                  <span className="text-xs">{s.name}</span>
                  <span className="badge-absent ml-2">{s.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Actions ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => navigate('/student/mark')} className="card hover-lift text-center group cursor-pointer border border-blue-100 bg-gradient-to-br from-blue-50 to-blue-50/30">
          <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-2.5 group-hover:scale-110 transition-transform">
            <UserCheck className="text-white" size={20} />
          </div>
          <p className="text-sm font-bold text-gray-800">Mark Attendance</p>
          <p className="text-xs text-gray-500 mt-0.5">Scan QR or enter code</p>
        </button>
        <button onClick={() => navigate('/student/requests')} className="card hover-lift text-center group cursor-pointer border border-orange-100 bg-gradient-to-br from-orange-50 to-orange-50/30">
          <div className="w-11 h-11 bg-orange-500 rounded-xl flex items-center justify-center mx-auto mb-2.5 group-hover:scale-110 transition-transform">
            <FileText className="text-white" size={20} />
          </div>
          <p className="text-sm font-bold text-gray-800">Request Attendance</p>
          <p className="text-xs text-gray-500 mt-0.5">Submit correction</p>
        </button>
      </div>

      {/* ── Notifications ─────────────────────────────────────── */}
      {data.notifications?.length > 0 && (
        <div className="card">
          <div className="section-header">
            <h3 className="section-title"><Bell size={16} className="text-blue-500" /> Notifications</h3>
            <button onClick={() => navigate('/student/notifications')} className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-0">
            {data.notifications.slice(0, 3).map(n => (
              <div key={n.id} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{n.title}</p>
                  <p className="text-xs text-gray-500 truncate">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Subject-wise Attendance ───────────────────────────── */}
      <div className="card">
        <div className="section-header">
          <h3 className="section-title"><BookOpen size={16} className="text-blue-500" /> Subject-wise Attendance</h3>
          <span className="badge-blue">{data.subjects.length} subjects</span>
        </div>
        {data.subjects.length === 0 ? (
          <div className="empty-state py-8">
            <BookOpen size={32} className="empty-state-icon" />
            <p className="empty-state-text">No subjects enrolled</p>
          </div>
        ) : (
          <div>{data.subjects.map(s => <SubjectBar key={s.id} subject={s} />)}</div>
        )}
      </div>

      {/* ── Recent Activity ───────────────────────────────────── */}
      <div className="card">
        <div className="section-header">
          <h3 className="section-title"><TrendingUp size={16} className="text-blue-500" /> Recent Activity</h3>
        </div>
        {data.recentAttendance?.length === 0 ? (
          <div className="empty-state py-8">
            <p className="empty-state-text">No recent attendance records</p>
          </div>
        ) : (
          <div className="space-y-0">
            {data.recentAttendance?.map((a, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${a.status === 'present' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    {a.status === 'present' ? <CheckCircle size={14} className="text-emerald-600" /> : <AlertTriangle size={14} className="text-red-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{a.subject_name}</p>
                    <p className="text-xs text-gray-400">{new Date(a.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}</p>
                  </div>
                </div>
                <span className={a.status === 'present' ? 'badge-present' : 'badge-absent'}>{a.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
