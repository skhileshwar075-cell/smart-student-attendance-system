import React, { useState, useEffect, useRef } from 'react';
import axios from '../../api.js';
import { useAuth } from '../../context/AuthContext';
import {
  User, Lock, CheckCircle, Camera, AlertTriangle,
  Shield, Users, BookOpen, BarChart2, Activity, Calendar,
  Phone, Mail, Hash, GraduationCap, FileText
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

function StatCard({ label, value, color = 'violet', icon: Icon }) {
  const colors = {
    violet:  'bg-violet-50 border-violet-100 text-violet-700',
    blue:    'bg-blue-50 border-blue-100 text-blue-700',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    amber:   'bg-amber-50 border-amber-100 text-amber-700',
  };
  return (
    <div className={`rounded-xl p-4 border ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon size={16} className="opacity-70" />}
        <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">{label}</p>
      </div>
      <p className="text-3xl font-black">{value ?? '—'}</p>
    </div>
  );
}

function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const isErr = msg.startsWith('error:');
  const text = msg.replace('error:', '');
  return (
    <div className={`fixed bottom-6 left-2 right-2 sm:left-auto sm:right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${isErr ? 'bg-red-600 text-white' : 'bg-violet-600 text-white'}`}>
      {isErr ? <AlertTriangle size={15} /> : <CheckCircle size={15} />}
      {text}
    </div>
  );
}

const TABS = ['Info', 'System', 'Security'];

export default function AdminProfile() {
  const { user, updateUser } = useAuth();
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
  const [sysStats, setSysStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const fileRef = useRef();

  useEffect(() => {
    if (tab === 'System') loadSystem();
  }, [tab]);

  const loadSystem = async () => {
    try {
      const [statsRes, logsRes] = await Promise.all([
        axios.get('/api/admin/stats'),
        axios.get('/api/admin/audit-logs?limit=5'),
      ]);
      setSysStats(statsRes.data);
      setAuditLogs(logsRes.data?.logs || logsRes.data || []);
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
      await axios.put('/api/auth/profile', { name: form.name, phone: form.phone });
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

  const actionLabel = (action) => {
    const labels = { login: 'Logged in', password_change: 'Changed password', forgot_password: 'Requested password reset', password_reset: 'Reset password' };
    return labels[action] || action?.replace(/_/g, ' ');
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}

      {/* ── Profile Header ─────────────────────────────────── */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-violet-600 to-purple-600 shadow-lg">
              {photoPreview
                ? <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-white font-black text-3xl">{initial}</div>
              }
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-violet-600 hover:bg-violet-700 rounded-full flex items-center justify-center text-white shadow-md transition-colors"
            >
              {uploadingPhoto ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera size={13} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-900 text-lg leading-tight">{user?.name}</h2>
            <p className="text-gray-500 text-sm mt-0.5">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold bg-violet-100 text-violet-700">
                <Shield size={11} /> Administrator
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">Active</span>
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
            <h3 className="section-title"><User size={15} className="text-violet-500" /> Account Info</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <InfoTile label="Name"   value={user?.name}  icon={User} />
              <InfoTile label="Email"  value={user?.email} icon={Mail} />
              <InfoTile label="Phone"  value={user?.phone} icon={Phone} />
              <InfoTile label="Role"   value="Administrator" icon={Shield} />
            </div>
          </div>

          <div className="card">
            <h3 className="section-title mb-4"><User size={15} className="text-violet-500" /> Edit Profile</h3>
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

      {/* ── System Tab ────────────────────────────────────────── */}
      {tab === 'System' && (
        <>
          {!sysStats ? (
            <div className="card flex items-center justify-center py-10">
              <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="card">
                <h3 className="section-title mb-3"><BarChart2 size={15} className="text-violet-500" /> System Statistics</h3>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Students"  value={sysStats.totalStudents}  color="blue"    icon={GraduationCap} />
                  <StatCard label="Teachers"  value={sysStats.totalTeachers}  color="violet"  icon={Users} />
                  <StatCard label="Classes"   value={sysStats.totalClasses}   color="emerald" icon={BookOpen} />
                  <StatCard label="Subjects"  value={sysStats.totalSubjects}  color="amber"   icon={BookOpen} />
                </div>
              </div>

              <div className="card">
                <h3 className="section-title mb-2"><Activity size={15} className="text-blue-500" /> Today's Attendance</h3>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Present Today" value={sysStats.presentToday} color="emerald" icon={CheckCircle} />
                  <StatCard label="Not Present"   value={sysStats.absentToday}  color="amber"   icon={AlertTriangle} />
                </div>
                <p className="text-[10px] text-gray-400 text-center mt-2">
                  Not Present = {sysStats.totalStudents} enrolled − {sysStats.presentToday} present
                  {' '}· {sysStats.presentToday && sysStats.totalStudents
                    ? Math.round(sysStats.presentToday / sysStats.totalStudents * 100)
                    : 0}% attendance rate
                </p>
              </div>

              {auditLogs.length > 0 && (
                <div className="card">
                  <h3 className="section-title mb-3"><FileText size={15} className="text-gray-500" /> Recent Activity</h3>
                  <div className="space-y-2">
                    {auditLogs.slice(0, 5).map((log, i) => (
                      <div key={log.id || i} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                        <div>
                          <p className="text-sm font-semibold text-gray-800 capitalize">{actionLabel(log.action)}</p>
                          <p className="text-xs text-gray-400">{log.user_name || log.user_email || 'System'}</p>
                        </div>
                        <p className="text-xs text-gray-400 flex-shrink-0 ml-3">
                          {log.created_at ? new Date(log.created_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Security Tab ──────────────────────────────────────── */}
      {tab === 'Security' && (
        <div className="card">
          <h3 className="section-title mb-4"><Shield size={15} className="text-violet-500" /> Change Password</h3>
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
