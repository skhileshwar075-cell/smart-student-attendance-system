import React, { useState, useEffect } from 'react';
import axios from '../../api.js';
import { Search, Plus, Edit2, Trash2, X, User, Mail, Phone, Hash, Lock, Briefcase } from 'lucide-react';
import { InputField, PasswordField } from '../../components/FormFields';
import Toast from '../../components/Toast';

export default function ManageTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', teacher_id: '', department: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => { fetchTeachers(); }, []);

  const fetchTeachers = async (s = '') => {
    setLoading(true);
    const r = await axios.get('/api/admin/teachers', { params: { search: s } });
    setTeachers(r.data.teachers || []);
    setLoading(false);
  };

  const openModal = (teacher = null) => {
    setError('');
    setShowPwd(false);
    if (teacher) {
      setForm({ name: teacher.name, email: teacher.email, phone: teacher.phone || '', teacher_id: teacher.teacher_id, department: teacher.department || '', password: '' });
      setModal({ type: 'edit', id: teacher.id });
    } else {
      setForm({ name: '', email: '', phone: '', teacher_id: '', department: '', password: 'teacher@123' });
      setModal({ type: 'add' });
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (modal.type === 'add') {
        await axios.post('/api/admin/teachers', form);
        showToast('Teacher added successfully', 'success');
      } else {
        await axios.put(`/api/admin/teachers/${modal.id}`, form);
        showToast('Teacher updated successfully', 'success');
      }
      setModal(null); fetchTeachers(search);
    } catch (err) {
      const message = err.response?.data?.error || 'Failed';
      setError(message);
      showToast(message, 'error');
    } finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Deactivate this teacher?')) return;
    try {
      await axios.delete(`/api/admin/teachers/${id}`);
      showToast('Teacher deactivated', 'success');
      fetchTeachers(search);
    } catch (err) {
      const message = err.response?.data?.error || 'Delete failed';
      showToast(message, 'error');
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-4 sm:p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">{modal.type === 'add' ? 'Add Teacher' : 'Edit Teacher'}</h3>
              <button onClick={() => setModal(null)}><X size={20} /></button>
            </div>
            {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-3">{error}</div>}
            <form onSubmit={save} className="space-y-3">
              <div><label className="label">Full Name *</label><InputField icon={User} required value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} /></div>
              <div><label className="label">Email *</label><InputField icon={Mail} required type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} /></div>
              <div><label className="label">Phone</label><InputField icon={Phone} value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} /></div>
              <div><label className="label">Teacher ID *</label><InputField icon={Hash} required value={form.teacher_id} onChange={e => setForm(p => ({...p, teacher_id: e.target.value}))} /></div>
              <div><label className="label">Department</label><InputField icon={Briefcase} value={form.department} onChange={e => setForm(p => ({...p, department: e.target.value}))} /></div>
              {modal.type === 'add' && <div><label className="label">Password</label><PasswordField icon={Lock} visible={showPwd} onToggleVisible={() => setShowPwd(v => !v)} value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} /></div>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <InputField icon={Search} value={search} onChange={e => { setSearch(e.target.value); fetchTeachers(e.target.value); }} placeholder="Search teachers..." />
        </div>
        <button onClick={() => openModal()} className="btn-primary flex items-center gap-1 px-3"><Plus size={18} /></button>
      </div>

      <div className="attendance-card">
        {loading ? <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full" /></div>
        : teachers.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">No teachers found</p>
        : <div className="space-y-2">
          {teachers.map(t => (
            <div key={t.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-bold flex-shrink-0">{t.name?.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{t.name}</p>
                <p className="text-xs text-gray-400 truncate">{t.teacher_id} • {t.department || 'No dept'}</p>
                <p className="text-xs text-gray-400 truncate">{t.email}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => openModal(t)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={15} /></button>
                <button onClick={() => del(t.id)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>}
      </div>
    </div>
  );
}
