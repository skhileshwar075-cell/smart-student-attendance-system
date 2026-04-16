import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import {
  User, Lock, CheckCircle, GraduationCap,
  Camera, AlertTriangle, TrendingUp, FileText, Bell,
  Phone, Mail, Hash, BookOpen, Calendar, Shield
} from 'lucide-react';
import { InputField, PasswordField } from '../../components/FormFields';

function InfoTile({ label, value, icon: Icon }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon size={10} className="text-gray-400" />}
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-sm font-semibold text-gray-800">{value || '—'}</p>
    </div>
  );
}

function StatCard({ label, value, color = 'emerald' }) {
  const colors = {
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    red:     'bg-red-50 border-red-100 text-red-700',
    amber:   'bg-amber-50 border-amber-100 text-amber-700',
    blue:    'bg-blue-50 border-blue-100 text-blue-700',
  };
  return (
    <div className={`rounded-xl p-3 border text-center ${colors[color]}`}>
      <p className="text-2xl font-black">{value ?? '—'}</p>
      <p className="text-[11px] font-medium mt-0.5 opacity-80">{label}</p>
    </div>
  );
}

function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const isErr = msg.startsWith('error:');
  const text = msg.replace('error:', '');
  return (
    <div className={`fixed bottom-6 left-2 right-2 sm:left-auto sm:right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${isErr ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
      {isErr ? <AlertTriangle size={15} /> : <CheckCircle size={15} />}
      {text}
    </div>
  );
}

const TABS = ['Info', 'Stats', 'Security'];

export default function StudentProfile() {
  const { user, updateUser, refreshUser } = useAuth();
  const [tab, setTab] = useState('Info');
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(user?.profile_photo || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const fileRef = useRef();

  useEffect(() => {
    if (tab === 'Stats') loadStats();
  }, [tab]);

  const loadStats = async () => {
    try {
      const [dashRes, reqRes] = await Promise.all([
        axios.get('/api/student/dashboard'),
        axios.get('/api/student/requests'),
      ]);
      setStats(dashRes.data);
      setRequests(reqRes.data?.requests || []);
    } catch {}
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) { setToast('error:Image must be under 1.5MB'); return; }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result;
      setPhotoPreview(base64);
      setUploadingPhoto(true);
      try {
        await axios.put('/api/auth/profile-photo', { photoBase64: base64 });
        updateUser({ profile_photo: base64 });
        setToast('Profile photo updated!');
      } catch (err) {
        setToast(`error:${err.response?.data?.error || 'Failed to upload photo'}`);
        setPhotoPreview(user?.profile_photo || null);
      } finally { setUploadingPhoto(false); }
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setToast('error:Name is required'); return; }
    setSaving(true);
    try {
      await axios.put('/api/auth/profile', form);
      updateUser({ name: form.name, phone: form.phone });
      setToast('Profile updated successfully!');
    } catch (err) { setToast(`error:${err.response?.data?.error || 'Failed to update profile'}`); }
    finally { setSaving(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmPassword) { setToast('error:Passwords do not match'); return; }
    if (pwdForm.newPassword.length < 6) { setToast('error:Password must be at least 6 characters'); return; }
    if (!pwdForm.currentPassword) { setToast('error:Current password is required'); return; }
    try {
      await axios.put('/api/auth/change-password', { currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword });
      setToast('Password changed successfully!');
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { setToast(`error:${err.response?.data?.error || 'Failed to change password'}`); }
  };

  const initial = user?.name?.charAt(0).toUpperCase() || '?';
  const overallPct = parseFloat(stats?.overallPercentage || stats?.overall_percentage) || 0;
  const pendingReqs = requests.filter(r => r.status === 'pending').length;
  const approvedReqs = requests.filter(r => r.status === 'approved').length;
  const rejectedReqs = requests.filter(r => r.status === 'rejected').length;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}

      {/* ── Profile Header ─────────────────────────────────── */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
              {photoPreview
                ? <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-white font-black text-3xl">{initial}</div>
              }
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-emerald-600 hover:bg-emerald-700 rounded-full flex items-center justify-center text-white shadow-md transition-colors"
            >
              {uploadingPhoto ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera size={13} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-900 text-lg leading-tight">{user?.name}</h2>
            <p className="text-gray-500 text-sm mt-0.5">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="badge-present inline-flex items-center gap-1"><GraduationCap size={11} /> Student</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user?.is_active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {user?.is_active !== false ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
              <Calendar size={11} />
              Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Info Tab ──────────────────────────────────────────── */}
      {tab === 'Info' && (
        <>
          <div className="card space-y-3">
            <h3 className="section-title"><User size={15} className="text-emerald-500" /> Academic Info</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <InfoTile label="Student ID"  value={user?.student_code} icon={Hash} />
              <InfoTile label="Roll Number" value={user?.roll_number}  icon={Hash} />
              <InfoTile label="Department"  value={user?.branch_name}  icon={GraduationCap} />
              <InfoTile label="Class"       value={[user?.class_name, user?.class_section].filter(Boolean).join(' ') || null} icon={BookOpen} />
              <InfoTile label="Semester"    value={user?.semester ? `Semester ${user.semester}` : null} icon={Calendar} />
              <InfoTile label="Phone"       value={user?.phone}        icon={Phone} />
              <InfoTile label="Email"       value={user?.email}        icon={Mail} />
            </div>
          </div>

          <div className="card">
            <h3 className="section-title mb-4"><User size={15} className="text-blue-500" /> Edit Profile</h3>
            <form onSubmit={saveProfile} className="space-y-4">
              <div>
                <label className="label">Full Name</label>
                <InputField icon={User} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" required />
              </div>
              <div>
                <label className="label">Phone Number</label>
                <InputField icon={Phone} value={form.phone || ''} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 xxxxx xxxxx" />
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full">
                {saving ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> Saving…</> : <><CheckCircle size={15} /> Save Changes</>}
              </button>
            </form>
          </div>
        </>
      )}

      {/* ── Stats Tab ─────────────────────────────────────────── */}
      {tab === 'Stats' && (
        <>
          {!stats ? (
            <div className="card flex items-center justify-center py-10">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="card">
                <h3 className="section-title mb-3"><TrendingUp size={15} className="text-emerald-500" /> Attendance Overview</h3>
                <div className="grid grid-cols-3 gap-2.5">
                  <StatCard label="Overall %" value={`${overallPct}%`} color={overallPct >= 75 ? 'emerald' : overallPct >= 60 ? 'amber' : 'red'} />
                  <StatCard label="Present" value={stats.presentCount || stats.present_count || '—'} color="emerald" />
                  <StatCard label="Absent"  value={stats.absentCount  || stats.absent_count  || '—'} color="red" />
                </div>
                {overallPct < 75 && (
                  <div className="mt-3 flex items-center gap-2 bg-red-50 text-red-700 rounded-xl px-3 py-2.5 text-xs font-medium border border-red-100">
                    <AlertTriangle size={14} /> Your attendance is below 75%. Attend more classes to meet the requirement.
                  </div>
                )}
              </div>

              {stats.subjects?.length > 0 && (
                <div className="card">
                  <h3 className="section-title mb-3"><BookOpen size={15} className="text-blue-500" /> Subject-wise Attendance</h3>
                  <div className="space-y-3">
                    {stats.subjects.map(sub => {
                      const pct = parseFloat(sub.percentage) || 0;
                      const color = pct >= 75 ? '#059669' : pct >= 60 ? '#D97706' : '#DC2626';
                      return (
                        <div key={sub.subject_id || sub.id} className="py-2 border-b border-gray-50 last:border-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-sm font-semibold text-gray-800 truncate flex-1 mr-3">{sub.name}</p>
                            <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{sub.present_count || 0}/{sub.total_classes || 0} classes</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="card">
                <h3 className="section-title mb-3"><FileText size={15} className="text-purple-500" /> Request History</h3>
                <div className="grid grid-cols-3 gap-2.5">
                  <StatCard label="Pending"  value={pendingReqs}  color="amber" />
                  <StatCard label="Approved" value={approvedReqs} color="emerald" />
                  <StatCard label="Rejected" value={rejectedReqs} color="red" />
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Security Tab ──────────────────────────────────────── */}
      {tab === 'Security' && (
        <div className="card">
          <h3 className="section-title mb-4"><Shield size={15} className="text-blue-500" /> Change Password</h3>
          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <PasswordField icon={Lock} visible={showCur} onToggleVisible={() => setShowCur(v => !v)} value={pwdForm.currentPassword} onChange={e => setPwdForm(p => ({ ...p, currentPassword: e.target.value }))} required placeholder="Your current password" />
            </div>
            <div>
              <label className="label">New Password</label>
              <PasswordField icon={Lock} visible={showNew} onToggleVisible={() => setShowNew(v => !v)} value={pwdForm.newPassword} onChange={e => setPwdForm(p => ({ ...p, newPassword: e.target.value }))} required placeholder="Min 6 characters" minLength={6} />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <PasswordField icon={Lock} visible={showConf} onToggleVisible={() => setShowConf(v => !v)} value={pwdForm.confirmPassword} onChange={e => setPwdForm(p => ({ ...p, confirmPassword: e.target.value }))} inputClassName={pwdForm.confirmPassword && pwdForm.newPassword !== pwdForm.confirmPassword ? 'border-red-400 focus:ring-red-400/30' : ''} required placeholder="Re-enter new password" />
              {pwdForm.confirmPassword && pwdForm.newPassword !== pwdForm.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>
            <button type="submit" className="btn-primary w-full">
              <Lock size={15} /> Change Password
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
