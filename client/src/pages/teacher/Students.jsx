import React, { useState, useEffect } from 'react';
import axios from '../../api.js';
import { Search, User, Mail, Phone, Plus, Edit2, Trash2, X, BookOpen, CheckCircle, Copy, Hash, Lock, Calendar } from 'lucide-react';
import { InputField, PasswordField } from '../../components/FormFields';

const EMPTY_FORM = { name: '', email: '', student_id: '', roll_number: '', class_id: '', password: 'Student@123', phone: '', year_of_joining: new Date().getFullYear() };

export default function TeacherStudents() {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [createdInfo, setCreatedInfo] = useState(null);

  useEffect(() => {
    axios.get('/api/teacher/subjects').then(r => {
      const subs = r.data.subjects || [];
      setSubjects(subs);
      const uniqueClasses = [];
      const seen = new Set();
      subs.forEach(s => {
        if (s.class_id && !seen.has(s.class_id)) {
          seen.add(s.class_id);
          uniqueClasses.push({ id: s.class_id, name: s.class_name, section: s.section, branch_name: s.branch_name });
        }
      });
      setClasses(uniqueClasses);
    });
    fetchStudents();
  }, []);

  const fetchStudents = (s = '', subj = '') => {
    setLoading(true);
    const params = { mine: 'true' };
    if (s) params.search = s;
    if (subj) { params.subject_id = subj; delete params.mine; }
    axios.get('/api/teacher/students', { params })
      .then(r => setStudents(r.data.students || []))
      .finally(() => setLoading(false));
  };

  const handleSearch = (e) => { setSearch(e.target.value); fetchStudents(e.target.value, subjectFilter); };
  const handleSubjectFilter = (e) => { setSubjectFilter(e.target.value); fetchStudents(search, e.target.value); };

  const openAdd = () => {
    setError(''); setCreatedInfo(null); setShowPwd(false);
    setForm(EMPTY_FORM);
    setModal('add');
  };

  const openEdit = (student) => {
    setError(''); setCreatedInfo(null); setShowPwd(false);
    setForm({
      name: student.name || '',
      email: student.email || '',
      student_id: student.student_id || '',
      roll_number: student.roll_number || '',
      class_id: student.class_id || '',
      phone: student.phone || '',
      year_of_joining: student.year_of_joining || '',
      password: '',
    });
    setModal({ type: 'edit', id: student.id });
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError(''); setCreatedInfo(null);
    try {
      if (modal === 'add') {
        const r = await axios.post('/api/teacher/students', form);
        setCreatedInfo({ email: r.data.email, password: r.data.password });
        fetchStudents(search, subjectFilter);
        setForm(EMPTY_FORM);
      } else {
        await axios.put(`/api/teacher/students/${modal.id}`, form);
        setModal(null);
        fetchStudents(search, subjectFilter);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save student');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Remove student "${name}"? This will deactivate their account.`)) return;
    try {
      await axios.delete(`/api/teacher/students/${id}`);
      fetchStudents(search, subjectFilter);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove student');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const closeModal = () => { setModal(null); setCreatedInfo(null); setError(''); };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-4 sm:p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">{modal === 'add' ? 'Add New Student' : 'Edit Student'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            {createdInfo && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
                <div className="flex items-center gap-2 text-green-700 font-semibold mb-2">
                  <CheckCircle size={16} /> Student Created Successfully!
                </div>
                <p className="text-xs text-green-600 mb-1">Share these credentials with the student:</p>
                <div className="bg-white rounded-lg p-2 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Email:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-gray-800">{createdInfo.email}</span>
                      <button onClick={() => copyToClipboard(createdInfo.email)} className="text-gray-400 hover:text-blue-600"><Copy size={12} /></button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Password:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-gray-800">{createdInfo.password}</span>
                      <button onClick={() => copyToClipboard(createdInfo.password)} className="text-gray-400 hover:text-blue-600"><Copy size={12} /></button>
                    </div>
                  </div>
                </div>
                <button onClick={closeModal} className="btn-primary w-full mt-3 text-sm">Done</button>
              </div>
            )}

            {!createdInfo && (
              <>
                {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-3 border border-red-100">{error}</div>}
                <form onSubmit={handleSave} className="space-y-3">
                  <div>
                    <label className="label">Full Name *</label>
                    <InputField icon={User} required value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Ravi Kumar" />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label">Student ID *</label>
                      <InputField icon={Hash} required value={form.student_id} onChange={e => setForm(p => ({...p, student_id: e.target.value}))} placeholder="e.g. S007" disabled={modal !== 'add'} />
                    </div>
                    <div>
                      <label className="label">Roll Number</label>
                      <InputField icon={Hash} value={form.roll_number} onChange={e => setForm(p => ({...p, roll_number: e.target.value}))} placeholder="e.g. 21CS007" />
                    </div>
                  </div>
                  <div>
                    <label className="label">Email <span className="text-gray-400 font-normal">(auto-generated if empty)</span></label>
                    <InputField icon={Mail} type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder="student@email.com" />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <InputField icon={Phone} value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} placeholder="9876543210" />
                  </div>
                  <div>
                    <label className="label">Department / Class</label>
                    <select value={form.class_id} onChange={e => setForm(p => ({...p, class_id: e.target.value}))} className="input-field">
                      <option value="">Select department &amp; class</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.branch_name ? `${c.branch_name} — ` : ''}{c.name} {c.section}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label">Year of Joining</label>
                      <InputField icon={Calendar} type="number" value={form.year_of_joining} onChange={e => setForm(p => ({...p, year_of_joining: e.target.value}))} placeholder="2024" />
                    </div>
                    {modal === 'add' && (
                      <div>
                        <label className="label">Password</label>
                        <PasswordField icon={Lock} visible={showPwd} onToggleVisible={() => setShowPwd(v => !v)} value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                    <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : modal === 'add' ? 'Add Student' : 'Save Changes'}</button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <InputField icon={Search} value={search} onChange={handleSearch} placeholder="Search by name or ID..." />
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-1 px-3 whitespace-nowrap">
          <Plus size={16} /><span className="hidden sm:inline">Add</span>
        </button>
      </div>

      <div className="attendance-card">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={16} className="text-blue-500" />
          <select value={subjectFilter} onChange={handleSubjectFilter} className="input-field text-sm py-1.5">
            <option value="">My Students (All)</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name} — {s.class_name} {s.section}</option>)}
          </select>
        </div>

        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-700 text-sm">Students ({students.length})</h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" /></div>
        ) : students.length === 0 ? (
          <div className="text-center py-10">
            <User className="mx-auto text-gray-300 mb-3" size={36} />
            <p className="text-gray-400 text-sm font-medium">No students found</p>
            <p className="text-gray-300 text-xs mt-1">Click "Add" to create your first student</p>
          </div>
        ) : (
          <div className="space-y-2">
            {students.map(s => (
              <div key={s.id} className="border border-gray-100 rounded-xl p-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold flex-shrink-0">
                    {s.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{s.name}</p>
                    <p className="text-xs text-gray-400">
                      {s.student_id}{s.roll_number ? ` • Roll: ${s.roll_number}` : ''}
                      {s.class_name ? ` • ${s.class_name} ${s.section || ''}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(s)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(s.id, s.name)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-gray-400 sm:grid-cols-2">
                  {s.email && <div className="flex items-center gap-1 truncate"><Mail size={10} className="flex-shrink-0" />{s.email}</div>}
                  {s.phone && <div className="flex items-center gap-1"><Phone size={10} className="flex-shrink-0" />{s.phone}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
