import React, { useState, useEffect } from 'react';
import axios from '../../api.js';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

export default function ManageClasses() {
  const [classes, setClasses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', section: '', branch_id: '', semester: '', academic_year: '' });
  const [saving, setSaving] = useState(false);
  const [branchModal, setBranchModal] = useState(false);
  const [branchForm, setBranchForm] = useState({ name: '', code: '' });

  useEffect(() => { fetchClasses(); fetchBranches(); }, []);

  const fetchClasses = () => axios.get('/api/admin/classes').then(r => setClasses(r.data.classes || []));
  const fetchBranches = () => axios.get('/api/admin/branches').then(r => setBranches(r.data.branches || []));

  const openModal = (cls = null) => {
    if (cls) { setForm({ name: cls.name, section: cls.section, branch_id: cls.branch_id || '', semester: cls.semester, academic_year: cls.academic_year || '' }); setModal({ type: 'edit', id: cls.id }); }
    else { setForm({ name: '', section: '', branch_id: '', semester: '', academic_year: '' }); setModal({ type: 'add' }); }
  };

  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (modal.type === 'add') await axios.post('/api/admin/classes', form);
      else await axios.put(`/api/admin/classes/${modal.id}`, form);
      setModal(null); fetchClasses();
    } catch {} finally { setSaving(false); }
  };

  const del = async (id) => { if (!confirm('Delete this class?')) return; await axios.delete(`/api/admin/classes/${id}`); fetchClasses(); };

  const saveBranch = async (e) => {
    e.preventDefault();
    try { await axios.post('/api/admin/branches', branchForm); setBranchModal(false); setBranchForm({ name: '', code: '' }); fetchBranches(); } catch {}
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {(modal || branchModal) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-4 sm:p-5 max-h-[90vh] overflow-y-auto">
            {branchModal ? (
              <>
                <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-gray-800">Add Branch</h3><button onClick={() => setBranchModal(false)}><X size={20} /></button></div>
                <form onSubmit={saveBranch} className="space-y-3">
                  <div><label className="label">Branch Name *</label><input required value={branchForm.name} onChange={e => setBranchForm(p => ({...p, name: e.target.value}))} className="input-field" /></div>
                  <div><label className="label">Code *</label><input required value={branchForm.code} onChange={e => setBranchForm(p => ({...p, code: e.target.value.toUpperCase()}))} className="input-field" /></div>
                  <div className="flex gap-2"><button type="button" onClick={() => setBranchModal(false)} className="btn-secondary flex-1">Cancel</button><button type="submit" className="btn-primary flex-1">Add</button></div>
                </form>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-gray-800">{modal?.type === 'add' ? 'Add Class' : 'Edit Class'}</h3><button onClick={() => setModal(null)}><X size={20} /></button></div>
                <form onSubmit={save} className="space-y-3">
                  <div><label className="label">Class Name *</label><input required value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} className="input-field" placeholder="e.g. B.Tech CSE" /></div>
                  <div><label className="label">Section *</label><input required value={form.section} onChange={e => setForm(p => ({...p, section: e.target.value}))} className="input-field" placeholder="e.g. A" /></div>
                  <div><label className="label">Branch</label><select value={form.branch_id} onChange={e => setForm(p => ({...p, branch_id: e.target.value}))} className="input-field"><option value="">Select branch</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                  <div><label className="label">Semester *</label><select required value={form.semester} onChange={e => setForm(p => ({...p, semester: e.target.value}))} className="input-field"><option value="">Select</option>{[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}</select></div>
                  <div><label className="label">Academic Year</label><input value={form.academic_year} onChange={e => setForm(p => ({...p, academic_year: e.target.value}))} className="input-field" placeholder="e.g. 2025-26" /></div>
                  <div className="flex gap-2"><button type="button" onClick={() => setModal(null)} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save'}</button></div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button onClick={() => openModal()} className="btn-primary flex items-center gap-2 sm:w-auto"><Plus size={16} /> Add Class</button>
        <button onClick={() => setBranchModal(true)} className="btn-secondary flex items-center gap-2 sm:w-auto"><Plus size={16} /> Add Branch</button>
      </div>

      {branches.length > 0 && (
        <div className="attendance-card">
          <h3 className="font-semibold text-gray-700 mb-2 text-sm">Branches</h3>
          <div className="flex flex-wrap gap-2">
            {branches.map(b => <span key={b.id} className="bg-purple-100 text-purple-700 text-xs px-3 py-1 rounded-full">{b.name} ({b.code})</span>)}
          </div>
        </div>
      )}

      <div className="attendance-card">
        <h3 className="font-semibold text-gray-700 mb-3">Classes ({classes.length})</h3>
        {classes.length === 0 ? <p className="text-gray-400 text-sm text-center py-4">No classes found</p>
        : <div className="space-y-2">
          {classes.map(c => (
            <div key={c.id} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 truncate">{c.name} — Section {c.section}</p>
                <p className="text-xs text-gray-400 truncate">Sem {c.semester} • {c.branch_name || 'No branch'} • {c.academic_year || 'N/A'}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => openModal(c)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={15} /></button>
                <button onClick={() => del(c.id)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>}
      </div>
    </div>
  );
}
