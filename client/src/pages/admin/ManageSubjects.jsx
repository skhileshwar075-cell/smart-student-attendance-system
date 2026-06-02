import React, { useState, useEffect } from 'react';
import axios from '../../api.js';
import { Search, Plus, Edit2, Trash2, X } from 'lucide-react';
import { InputField } from '../../components/FormFields';
import Toast from '../../components/Toast';

export default function ManageSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', class_id: '', teacher_id: '', credits: 3 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    axios.get('/api/admin/classes').then(r => setClasses(r.data.classes || []));
    axios.get('/api/admin/teachers').then(r => setTeachers(r.data.teachers || []));
    fetchSubjects();
  }, []);

  const fetchSubjects = (s = '') => {
    axios.get('/api/admin/subjects', { params: { search: s } }).then(r => setSubjects(r.data.subjects || []));
  };

  const openModal = (sub = null) => {
    setError('');
    if (sub) { setForm({ name: sub.name, code: sub.code, class_id: sub.class_id || '', teacher_id: sub.teacher_id || '', credits: sub.credits || 3 }); setModal({ type: 'edit', id: sub.id }); }
    else { setForm({ name: '', code: '', class_id: '', teacher_id: '', credits: 3 }); setModal({ type: 'add' }); }
  };

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (modal.type === 'add') await axios.post('/api/admin/subjects', form);
      else await axios.put(`/api/admin/subjects/${modal.id}`, form);
      setModal(null); fetchSubjects(search);
      setToast({ message: modal.type === 'add' ? 'Subject added' : 'Subject updated', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete this subject?')) return;
    setDeleting(id);
    try {
      await axios.delete(`/api/admin/subjects/${id}`);
      fetchSubjects(search);
      setToast({ message: 'Subject deleted', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Delete failed', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    } finally { setDeleting(null); }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-4 sm:p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-gray-800">{modal.type === 'add' ? 'Add Subject' : 'Edit Subject'}</h3><button onClick={() => setModal(null)}><X size={20} /></button></div>
            {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-3">{error}</div>}
            <form onSubmit={save} className="space-y-3">
              <div><label className="label">Subject Name *</label><input required value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} className="input-field" /></div>
              <div><label className="label">Subject Code *</label><input required value={form.code} onChange={e => setForm(p => ({...p, code: e.target.value.toUpperCase()}))} className="input-field" /></div>
              <div><label className="label">Class</label><select value={form.class_id} onChange={e => setForm(p => ({...p, class_id: e.target.value}))} className="input-field"><option value="">Select class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.section} - Sem {c.semester}</option>)}</select></div>
              <div><label className="label">Teacher</label><select value={form.teacher_id} onChange={e => setForm(p => ({...p, teacher_id: e.target.value}))} className="input-field"><option value="">Select teacher</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
              <div><label className="label">Credits</label><input type="number" min="1" max="6" value={form.credits} onChange={e => setForm(p => ({...p, credits: e.target.value}))} className="input-field" /></div>
              <div className="flex gap-2"><button type="button" onClick={() => setModal(null)} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save'}</button></div>
            </form>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <InputField icon={Search} className="flex-1" value={search} onChange={e => { setSearch(e.target.value); fetchSubjects(e.target.value); }} placeholder="Search subjects..." />
        <button onClick={() => openModal()} className="btn-primary flex items-center gap-1 px-3"><Plus size={18} /></button>
      </div>

      <div className="attendance-card">
        {toast && <Toast message={toast.message} type={toast.type} />}
        {subjects.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">No subjects found</p>
        : <div className="space-y-2">
          {subjects.map(s => (
            <div key={s.id} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                <p className="text-xs text-gray-400 truncate">{s.code} • {s.class_name} {s.section} • {s.teacher_name || 'No teacher'}</p>
                <p className="text-xs text-gray-400">{s.credits} credits</p>
              </div>
                <div className="flex shrink-0 gap-1">
                <button onClick={() => openModal(s)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={15} /></button>
                <button onClick={() => del(s.id)} disabled={deleting === s.id} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>}
      </div>
    </div>
  );
}
