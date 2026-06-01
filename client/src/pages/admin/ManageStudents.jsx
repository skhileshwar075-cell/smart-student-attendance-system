import React, { useState, useEffect } from 'react';
import axios from '../../api.js';
import { Search, Plus, Edit2, Trash2, X, User, Mail, Phone, Hash, Lock } from 'lucide-react';
import { InputField, PasswordField } from '../../components/FormFields';

export default function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', student_id: '', class_id: '', roll_number: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    axios.get('/api/admin/classes').then(r => setClasses(r.data.classes || []));
    fetchStudents();
  }, []);

  const fetchStudents = async (s = '') => {
    setLoading(true);
    const r = await axios.get('/api/admin/students', { params: { search: s, limit: 100 } });
    setStudents(r.data.students || []);
    setTotal(r.data.total || 0);
    setLoading(false);
  };

  const openModal = (student = null) => {
    setError('');
    setShowPwd(false);
    if (student) {
      setForm({ name: student.name, email: student.email, phone: student.phone || '', student_id: student.student_id, class_id: student.class_id || '', roll_number: student.roll_number || '', password: '' });
      setModal({ type: 'edit', id: student.id });
    } else {
      setForm({ name: '', email: '', phone: '', student_id: '', class_id: '', roll_number: '', password: 'student@123' });
      setModal({ type: 'add' });
    }
  };

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (modal.type === 'add') await axios.post('/api/admin/students', form);
      else await axios.put(`/api/admin/students/${modal.id}`, form);
      setModal(null); fetchStudents(search);
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Deactivate this student?')) return;
    await axios.delete(`/api/admin/students/${id}`);
    fetchStudents(search);
  };

  const handleSearch = (e) => { setSearch(e.target.value); fetchStudents(e.target.value); };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">{modal.type === 'add' ? 'Add Student' : 'Edit Student'}</h3>
              <button onClick={() => setModal(null)}><X size={20} /></button>
            </div>
            {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-3">{error}</div>}
            <form onSubmit={save} className="space-y-3">
              <div><label className="label">Full Name *</label><InputField icon={User} required value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} /></div>
              <div><label className="label">Email *</label><InputField icon={Mail} required type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} /></div>
              <div><label className="label">Phone</label><InputField icon={Phone} value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} /></div>
              <div><label className="label">Student ID *</label><InputField icon={Hash} required value={form.student_id} onChange={e => setForm(p => ({...p, student_id: e.target.value}))} /></div>
              <div><label className="label">Department / Class</label>
                <select value={form.class_id} onChange={e => setForm(p => ({...p, class_id: e.target.value}))} className="input-field">
                  <option value="">Select department &amp; class</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.branch_name ? `${c.branch_name} — ` : ''}{c.name} {c.section} (Sem {c.semester})
                    </option>
                  ))}
                </select>
              </div>
              <div><label className="label">Roll Number</label><InputField icon={Hash} value={form.roll_number} onChange={e => setForm(p => ({...p, roll_number: e.target.value}))} /></div>
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
          <InputField icon={Search} value={search} onChange={handleSearch} placeholder="Search students..." />
        </div>
        <button onClick={() => openModal()} className="btn-primary flex items-center gap-1 px-3"><Plus size={18} /></button>
      </div>

      <div className="attendance-card">
        <p className="text-sm text-gray-500 mb-3">Total: {total} students</p>
        {loading ? <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full" /></div>
        : students.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">No students found</p>
        : <div className="space-y-2">
          {students.map(s => (
            <div key={s.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold flex-shrink-0">
                {s.name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                <p className="text-xs text-gray-400 truncate">{s.student_id} • {s.class_name} {s.section}</p>
                <p className="text-xs text-gray-400 truncate">{s.email}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => openModal(s)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={15} /></button>
                <button onClick={() => del(s.id)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>}
      </div>
    </div>
  );
}
