import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle, XCircle, Filter, Clock, X, AlertCircle, User } from 'lucide-react';

const STATUS_META = {
  pending:  { badge: 'badge-pending',  label: 'Pending',  icon: Clock       },
  approved: { badge: 'badge-approved', label: 'Approved', icon: CheckCircle },
  rejected: { badge: 'badge-rejected', label: 'Rejected', icon: XCircle     },
};

export default function TeacherRequests() {
  const [requests, setRequests] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filters,  setFilters]  = useState({ status: 'pending', subject_id: '' });
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);
  const [note,     setNote]     = useState('');
  const [msg,      setMsg]      = useState(null);
  const [acting,   setActing]   = useState(false);

  useEffect(() => {
    axios.get('/api/teacher/subjects').then(r => setSubjects(r.data.subjects || []));
    fetchRequests();
  }, []);

  const fetchRequests = (f = filters) => {
    setLoading(true);
    const params = {};
    if (f.status)     params.status     = f.status;
    if (f.subject_id) params.subject_id = f.subject_id;
    axios.get('/api/teacher/requests', { params })
      .then(r => setRequests(r.data.requests || []))
      .finally(() => setLoading(false));
  };

  const applyFilter = (key, val) => {
    const f = {...filters, [key]: val};
    setFilters(f);
    fetchRequests(f);
  };

  const handleAction = async (id, status) => {
    setActing(true);
    try {
      await axios.put(`/api/teacher/requests/${id}`, { status, teacher_note: note });
      setMsg({ type: 'success', text: `Request ${status} successfully.` });
      setModal(null); setNote('');
      fetchRequests(filters);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Action failed' });
    } finally { setActing(false); }
  };

  const openModal = (req, action) => { setModal({...req, action}); setNote(''); };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">

      {msg && (
        <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {msg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-auto text-current/60 hover:text-current"><X size={14} /></button>
        </div>
      )}

      {/* ── Filters ───────────────────────────────────────────── */}
      <div className="card">
        <h3 className="section-title mb-3"><Filter size={15} className="text-blue-500" /> Filter Requests</h3>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="label">Status</label>
            <select value={filters.status} onChange={e => applyFilter('status', e.target.value)} className="input-field">
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="label">Subject</label>
            <select value={filters.subject_id} onChange={e => applyFilter('subject_id', e.target.value)} className="input-field">
              <option value="">All Subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Requests List ─────────────────────────────────────── */}
      <div className="card">
        <div className="section-header">
          <h3 className="section-title">Requests</h3>
          <span className={filters.status === 'pending' ? 'badge-pending' : 'badge-blue'}>
            {requests.length} {filters.status || 'total'}
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-24" />)}</div>
        ) : requests.length === 0 ? (
          <div className="empty-state py-10">
            <CheckCircle size={36} className="empty-state-icon text-emerald-300" />
            <p className="empty-state-text">No {filters.status || ''} requests</p>
            <p className="empty-state-sub">All caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(r => {
              const meta = STATUS_META[r.status] || STATUS_META.pending;
              const Icon = meta.icon;
              return (
                <div key={r.id} className={`border rounded-2xl p-4 ${
                  r.status === 'pending' ? 'border-amber-100 bg-amber-50/30' :
                  r.status === 'approved' ? 'border-emerald-100 bg-emerald-50/20' :
                  'border-red-100 bg-red-50/20'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center font-bold text-gray-600 text-sm flex-shrink-0">
                        {r.student_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{r.student_name}</p>
                        <p className="text-xs text-gray-400">{r.student_code} · {r.subject_name}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Icon size={13} className={r.status === 'approved' ? 'text-emerald-500' : r.status === 'rejected' ? 'text-red-500' : 'text-amber-500'} />
                      <span className={meta.badge}>{meta.label}</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-700 bg-white/80 rounded-xl px-3 py-2 border border-gray-100 mb-3">{r.reason}</p>

                  {r.teacher_note && (
                    <p className="text-xs text-gray-500 mb-3 italic flex items-center gap-1">
                      <AlertCircle size={11} /> {r.teacher_note}
                    </p>
                  )}

                  {r.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openModal(r, 'approved')}
                        className="flex-1 btn btn-success btn-sm"
                      >
                        <CheckCircle size={13} /> Approve
                      </button>
                      <button
                        onClick={() => openModal(r, 'rejected')}
                        className="flex-1 btn btn-danger btn-sm"
                      >
                        <XCircle size={13} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Confirmation Modal ────────────────────────────────── */}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className={`p-5 rounded-t-2xl ${modal.action === 'approved' ? 'bg-emerald-50 border-b border-emerald-100' : 'bg-red-50 border-b border-red-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {modal.action === 'approved'
                    ? <CheckCircle size={20} className="text-emerald-600" />
                    : <XCircle size={20} className="text-red-500" />
                  }
                  <h3 className="font-bold text-gray-800">
                    {modal.action === 'approved' ? 'Approve' : 'Reject'} Request
                  </h3>
                </div>
                <button onClick={() => setModal(null)} className="btn-ghost btn-icon"><X size={18} /></button>
              </div>
            </div>
            <div className="p-5">
              <div className="bg-gray-50 rounded-xl p-3 mb-4">
                <p className="text-sm font-semibold text-gray-800">{modal.student_name}</p>
                <p className="text-xs text-gray-500">{modal.subject_name} · {new Date(modal.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                <p className="text-xs text-gray-600 mt-1">{modal.reason}</p>
              </div>
              <div className="mb-4">
                <label className="label">Add a Note (optional)</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Reason for approval or rejection..."
                  className="input-field resize-none"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={() => handleAction(modal.id, modal.action)}
                  disabled={acting}
                  className={`flex-1 btn ${modal.action === 'approved' ? 'btn-success' : 'btn-danger'}`}
                >
                  {acting
                    ? <><span className="spinner w-4 h-4" /> Processing…</>
                    : modal.action === 'approved' ? 'Confirm Approve' : 'Confirm Reject'
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
