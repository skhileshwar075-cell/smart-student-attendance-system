import React, { useState, useEffect, useCallback } from 'react';
import axios from '../../api.js';
import {
  Plus, Edit2, Trash2, X, CheckCircle2, Calendar,
  ArrowUpCircle, RefreshCw, AlertTriangle, Users
} from 'lucide-react';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function SessionModal({ session, onClose, onSaved }) {
  const isEdit = !!session?.id;
  const [form, setForm] = useState({
    name: session?.name || '',
    start_date: session?.start_date?.slice(0, 10) || '',
    end_date: session?.end_date?.slice(0, 10) || '',
    is_active: session?.is_active || false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isEdit) await axios.put(`/api/admin/academic-sessions/${session.id}`, form);
      else await axios.post('/api/admin/academic-sessions', form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800">{isEdit ? 'Edit Session' : 'New Academic Session'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        {error && <p className="text-red-600 text-xs bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="label">Session Name *</label>
            <input
              required value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="input-field" placeholder="e.g. 2025-26"
            />
          </div>
          <div>
            <label className="label">Start Date *</label>
            <input
              required type="date" value={form.start_date}
              onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">End Date *</label>
            <input
              required type="date" value={form.end_date}
              onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
              className="input-field"
            />
          </div>
          {!isEdit && (
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <input
                type="checkbox" checked={form.is_active}
                onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                className="w-4 h-4 rounded accent-blue-600"
              />
              Set as active session immediately
            </label>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PromoteModal({ sessions, classes, onClose, onDone }) {
  const activeSession = sessions.find(s => s.is_active);
  const [form, setForm] = useState({
    new_session: activeSession?.name || '',
    class_id: '',
    max_semester: 8,
  });
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const fetchPreview = useCallback(async () => {
    setLoadingPreview(true);
    try {
      const r = await axios.get('/api/admin/promote/preview', {
        params: { class_id: form.class_id || undefined, max_semester: form.max_semester }
      });
      setPreview(r.data.count);
    } catch { setPreview(null); }
    finally { setLoadingPreview(false); }
  }, [form.class_id, form.max_semester]);

  useEffect(() => { fetchPreview(); }, [fetchPreview]);

  const promote = async (e) => {
    e.preventDefault();
    if (!form.new_session.trim()) { setError('New session name is required'); return; }
    if (!window.confirm(`Promote ${preview} student(s) to session "${form.new_session}"? This cannot be undone.`)) return;
    setPromoting(true);
    setError('');
    try {
      const r = await axios.post('/api/admin/promote', {
        new_session: form.new_session,
        class_id: form.class_id || undefined,
        max_semester: form.max_semester,
      });
      setResult(r.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Promotion failed');
    } finally { setPromoting(false); }
  };

  if (result) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center space-y-4">
          <CheckCircle2 size={48} className="text-emerald-500 mx-auto" />
          <div>
            <p className="font-bold text-gray-900 text-lg">{result.promoted} Students Promoted</p>
            <p className="text-sm text-gray-500 mt-1">Now on session <span className="font-semibold text-blue-600">{result.new_session}</span></p>
          </div>
          <button onClick={() => { onDone(); onClose(); }} className="btn-primary w-full">Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <ArrowUpCircle size={18} className="text-blue-600" /> Bulk Student Promotion
          </h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        {/* Preview badge */}
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <Users size={18} className="text-blue-600 flex-shrink-0" />
          <div>
            {loadingPreview
              ? <p className="text-sm text-blue-600">Calculating…</p>
              : preview !== null
                ? <p className="text-sm font-semibold text-blue-700">{preview} student(s) will be promoted</p>
                : <p className="text-sm text-gray-400">Apply filters to preview</p>}
            <p className="text-xs text-gray-400">Semester increments by 1 (capped at max)</p>
          </div>
        </div>

        {error && <p className="text-red-600 text-xs bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <form onSubmit={promote} className="space-y-3">
          <div>
            <label className="label">New Academic Session *</label>
            <input
              required value={form.new_session}
              onChange={e => setForm(p => ({ ...p, new_session: e.target.value }))}
              className="input-field" placeholder="e.g. 2025-26"
              list="session-suggestions"
            />
            <datalist id="session-suggestions">
              {sessions.map(s => <option key={s.id} value={s.name} />)}
            </datalist>
          </div>
          <div>
            <label className="label">Filter by Class (optional)</label>
            <select
              value={form.class_id}
              onChange={e => setForm(p => ({ ...p, class_id: e.target.value }))}
              className="input-field"
            >
              <option value="">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.section} (Sem {c.semester})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Max Semester Cap</label>
            <select
              value={form.max_semester}
              onChange={e => setForm(p => ({ ...p, max_semester: parseInt(e.target.value) }))}
              className="input-field"
            >
              {[4, 6, 8, 10].map(n => <option key={n} value={n}>Semester {n}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              type="submit"
              disabled={promoting || preview === 0}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <ArrowUpCircle size={15} />
              {promoting ? 'Promoting…' : `Promote ${preview ?? '…'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AcademicSessions() {
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [showPromote, setShowPromote] = useState(false);
  const [activating, setActivating] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState('');

  const fetchSessions = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([
        axios.get('/api/admin/academic-sessions'),
        axios.get('/api/admin/classes'),
      ]);
      setSessions(s.data.sessions || []);
      setClasses(c.data.classes || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const activate = async (id) => {
    setActivating(id);
    try {
      const r = await axios.put(`/api/admin/academic-sessions/${id}/activate`);
      showToast(r.data.message);
      fetchSessions();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to activate');
    } finally { setActivating(null); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this session?')) return;
    setDeleting(id);
    try {
      await axios.delete(`/api/admin/academic-sessions/${id}`);
      fetchSessions();
    } catch (err) {
      showToast(err.response?.data?.error || 'Delete failed');
    } finally { setDeleting(null); }
  };

  const active = sessions.find(s => s.is_active);

  return (
    <div className="space-y-5 max-w-3xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div>
          <h1 className="page-title">Academic Sessions</h1>
          <p className="page-subtitle">Manage academic year sessions and promote students</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPromote(true)} className="btn-secondary flex items-center gap-2">
            <ArrowUpCircle size={15} /> Promote Students
          </button>
          <button onClick={() => setModal({ type: 'add' })} className="btn-primary flex items-center gap-2">
            <Plus size={15} /> New Session
          </button>
        </div>
      </div>

      {/* Active Session Banner */}
      {active && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
          <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-800">Active Session: {active.name}</p>
            <p className="text-xs text-emerald-600">{fmt(active.start_date)} → {fmt(active.end_date)}</p>
          </div>
        </div>
      )}

      {/* Session List */}
      <div className="card space-y-0 p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Calendar size={15} className="text-gray-400" /> All Sessions
          </span>
          <button onClick={fetchSessions} className="text-gray-400 hover:text-gray-600">
            <RefreshCw size={14} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : sessions.length === 0 ? (
          <div className="p-10 text-center">
            <Calendar size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400 font-medium">No academic sessions yet</p>
            <p className="text-xs text-gray-300 mt-1">Create one to get started</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {sessions.map(s => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50/60 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{s.name}</span>
                    {s.is_active && (
                      <span className="text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {fmt(s.start_date)} → {fmt(s.end_date)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {!s.is_active && (
                    <button
                      onClick={() => activate(s.id)}
                      disabled={activating === s.id}
                      title="Set as active"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                    >
                      <CheckCircle2 size={15} />
                    </button>
                  )}
                  <button
                    onClick={() => setModal({ type: 'edit', session: s })}
                    title="Edit"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  {!s.is_active && (
                    <button
                      onClick={() => del(s.id)}
                      disabled={deleting === s.id}
                      title="Delete"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4">
        <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-700 space-y-1">
          <p className="font-semibold">How Promotion Works</p>
          <p>Bulk promotion increments each eligible student's semester by 1 and updates their session label. Students already at the max semester cap are skipped. This action is recorded in the audit log.</p>
        </div>
      </div>

      {/* Modals */}
      {modal && (
        <SessionModal
          session={modal.session}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchSessions(); showToast('Session saved'); }}
        />
      )}
      {showPromote && (
        <PromoteModal
          sessions={sessions}
          classes={classes}
          onClose={() => setShowPromote(false)}
          onDone={() => { showToast('Promotion complete'); }}
        />
      )}
    </div>
  );
}
