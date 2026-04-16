import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, FileText, CheckCircle, XCircle, Clock, X, AlertCircle } from 'lucide-react';

const STATUS_META = {
  pending:  { icon: Clock,         badge: 'badge-pending',  label: 'Pending'  },
  approved: { icon: CheckCircle,   badge: 'badge-approved', label: 'Approved' },
  rejected: { icon: XCircle,       badge: 'badge-rejected', label: 'Rejected' },
};

function RequestCard({ r }) {
  const meta = STATUS_META[r.status] || STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <div className={`border rounded-2xl p-4 transition-all ${
      r.status === 'pending' ? 'border-amber-100 bg-amber-50/30' :
      r.status === 'approved' ? 'border-emerald-100 bg-emerald-50/20' :
      'border-red-100 bg-red-50/20'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0 mr-3">
          <p className="font-semibold text-gray-800 text-sm">{r.subject_name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Icon size={13} className={
            r.status === 'approved' ? 'text-emerald-500' :
            r.status === 'rejected' ? 'text-red-500' : 'text-amber-500'
          } />
          <span className={meta.badge}>{meta.label}</span>
        </div>
      </div>
      <p className="text-xs text-gray-600 bg-white/70 rounded-xl px-3 py-2 border border-gray-100">{r.reason}</p>
      {r.teacher_note && (
        <p className="text-xs text-gray-500 mt-2 italic flex items-center gap-1">
          <AlertCircle size={11} /> Teacher: {r.teacher_note}
        </p>
      )}
    </div>
  );
}

export default function AttendanceRequests() {
  const [requests,   setRequests]  = useState([]);
  const [subjects,   setSubjects]  = useState([]);
  const [showForm,   setShowForm]  = useState(false);
  const [form,       setForm]      = useState({ subject_id: '', date: '', reason: '' });
  const [loading,    setLoading]   = useState(true);
  const [submitting, setSubmitting]= useState(false);
  const [error,      setError]     = useState('');
  const [success,    setSuccess]   = useState('');
  const [filter,     setFilter]    = useState('all');

  useEffect(() => {
    axios.get('/api/student/subjects').then(r => setSubjects(r.data.subjects || []));
    fetchRequests();
  }, []);

  const fetchRequests = () => {
    setLoading(true);
    axios.get('/api/student/requests').then(r => setRequests(r.data.requests || [])).finally(() => setLoading(false));
  };

  const submit = async (e) => {
    e.preventDefault(); setError(''); setSubmitting(true);
    try {
      await axios.post('/api/student/requests', form);
      setSuccess('Request submitted successfully!');
      setShowForm(false);
      setForm({ subject_id: '', date: '', reason: '' });
      fetchRequests();
    } catch (err) { setError(err.response?.data?.error || 'Failed to submit request'); }
    finally { setSubmitting(false); }
  };

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);
  const counts   = { all: requests.length, pending: requests.filter(r => r.status === 'pending').length, approved: requests.filter(r => r.status === 'approved').length, rejected: requests.filter(r => r.status === 'rejected').length };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">

      {success && <div className="alert alert-success">{success}</div>}

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Attendance Requests</h2>
          <p className="page-subtitle">{counts.pending > 0 ? `${counts.pending} pending review` : 'All requests reviewed'}</p>
        </div>
        <button onClick={() => { setShowForm(true); setError(''); }} className="btn-primary btn-sm">
          <Plus size={15} /> New Request
        </button>
      </div>

      {/* ── Filter Tabs ───────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[['all','All'],['pending','Pending'],['approved','Approved'],['rejected','Rejected']].map(([k,l]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-xl border font-semibold transition-all ${
              filter === k
                ? k === 'pending' ? 'bg-amber-100 text-amber-700 border-amber-200'
                : k === 'approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                : k === 'rejected' ? 'bg-red-100 text-red-700 border-red-200'
                : 'bg-blue-100 text-blue-700 border-blue-200'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {l} {counts[k] > 0 && <span className="opacity-60">({counts[k]})</span>}
          </button>
        ))}
      </div>

      {/* ── List ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-24" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state card py-12">
          <FileText size={36} className="empty-state-icon" />
          <p className="empty-state-text">No {filter !== 'all' ? filter : ''} requests yet</p>
          <button onClick={() => { setShowForm(true); setError(''); }} className="btn-primary btn-sm mt-4">
            <Plus size={14} /> Submit a Request
          </button>
        </div>
      ) : (
        <div className="space-y-3">{filtered.map(r => <RequestCard key={r.id} r={r} />)}</div>
      )}

      {/* ── Modal ─────────────────────────────────────────────── */}
      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">Request Attendance Correction</h3>
              <button onClick={() => setShowForm(false)} className="btn-ghost btn-icon">
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              {error && <div className="alert alert-error mb-4">{error}</div>}
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="label">Subject *</label>
                  <select required value={form.subject_id} onChange={e => setForm(p => ({...p, subject_id: e.target.value}))} className="input-field">
                    <option value="">Select subject</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Date *</label>
                  <input type="date" required max={new Date().toISOString().split('T')[0]} value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} className="input-field" />
                </div>
                <div>
                  <label className="label">Reason *</label>
                  <textarea
                    required
                    value={form.reason}
                    onChange={e => setForm(p => ({...p, reason: e.target.value}))}
                    className="input-field resize-none"
                    rows={4}
                    placeholder="Explain why you missed class (medical, emergency, etc.)..."
                    minLength={10}
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={submitting} className="btn-primary flex-1">
                    {submitting ? <><span className="spinner w-4 h-4" /> Submitting…</> : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
