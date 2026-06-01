import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from '../../api.js';
import {
  CheckCircle, XCircle, Play, Square, Hash, MapPin,
  Wifi, Clock, RefreshCw, QrCode, Shield, StopCircle, Eye, Calendar
} from 'lucide-react';
import { useGeolocation } from '../../hooks/useGeolocation';

function SessionCard({ session, onStop, stopping, now }) {
  const diff = new Date(session.expires_at) - now;
  const expired = diff <= 0;
  const mins = expired ? 0 : Math.floor(diff / 60000);
  const secs = expired ? 0 : Math.floor((diff % 60000) / 1000);
  const timeLabel = expired ? 'Expired' : `${mins}m ${secs.toString().padStart(2, '0')}s`;
  const urgent = !expired && diff < 120000;

  const TypeIcon = session.session_type === 'qr' ? QrCode : session.session_type === 'secure' ? Shield : Hash;

  const statusStopped = session.is_active === false;
  const status = statusStopped ? 'stopped' : expired ? 'expired' : 'active';
  const statusStyles = {
    active: 'bg-green-100 text-green-700',
    expired: 'bg-gray-100 text-gray-500',
    stopped: 'bg-red-100 text-red-500',
  };

  return (
    <div className={`border rounded-2xl p-4 transition-all ${status === 'active' ? 'border-blue-100 bg-white shadow-sm' : 'border-gray-100 bg-gray-50 opacity-70'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm truncate">{session.subject_name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {session.class_name}{session.class_section ? ` · ${session.class_section}` : ''}
          </p>
        </div>
        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium shrink-0 capitalize ${statusStyles[status]}`}>
          {status}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">
          <TypeIcon size={11} />
          {session.session_type?.toUpperCase()}
        </span>
        {session.code && (
          <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded-lg tracking-widest">
            {session.code}
          </span>
        )}
        {session.geo_lat && (
          <span className="flex items-center gap-1 text-xs text-orange-500">
            <MapPin size={11} /> Geo
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-1 text-xs font-medium ${status !== 'active' ? 'text-gray-400' : urgent ? 'text-orange-500' : 'text-green-600'}`}>
          <Clock size={12} />
          <span>{timeLabel}</span>
        </div>
        {status === 'active' && (
          <button
            onClick={() => onStop(session)}
            disabled={stopping === session.id}
            className="flex items-center gap-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            <StopCircle size={13} />
            {stopping === session.id ? 'Stopping…' : 'Stop Session'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function TakeAttendance() {
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [mode, setMode] = useState('manual');
  const [enableGeo, setEnableGeo] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const { location, getLocation, error: locError, loading: locLoading } = useGeolocation();

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [stopping, setStopping] = useState(null);
  const [sessionMsg, setSessionMsg] = useState('');
  const [creatingSession, setCreatingSession] = useState(false);
  const [rotatingToken, setRotatingToken] = useState(null);
  const [showAllToday, setShowAllToday] = useState(false);
  const [activeSession, setActiveSession] = useState(null);

  const [now, setNow] = useState(Date.now());
  const pollRef = useRef(null);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const fetchSessions = useCallback(async (silent = false) => {
    if (!silent) setSessionsLoading(true);
    try {
      const endpoint = showAllToday ? '/api/teacher/sessions' : '/api/teacher/sessions/active';
      const r = await axios.get(endpoint);
      const list = r.data.sessions || [];
      setSessions(list);
      const live = list.find(s => s.is_active !== false && new Date(s.expires_at) > new Date());
      setActiveSession(live || null);
    } catch (_) {}
    finally { if (!silent) setSessionsLoading(false); }
  }, [showAllToday]);

  useEffect(() => {
    fetchSessions();
    axios.get('/api/teacher/subjects').then(r => setSubjects(r.data.subjects || []));
  }, []);

  useEffect(() => { fetchSessions(); }, [showAllToday]);

  useEffect(() => {
    pollRef.current = setInterval(() => fetchSessions(true), 15000);
    return () => clearInterval(pollRef.current);
  }, [fetchSessions]);

  useEffect(() => {
    if (selectedSubject) {
      axios.get('/api/teacher/students', { params: { subject_id: selectedSubject } }).then(r => {
        const studs = r.data.students || [];
        setStudents(studs);
        
        // Fetch existing attendance for the selected date
        setLoadingAttendance(true);
        axios.get('/api/teacher/attendance/by-date', { 
          params: { subject_id: selectedSubject, date: attendanceDate } 
        }).then(res => {
          const existingAttendance = res.data.attendance || [];
          const attendanceMap = {};
          existingAttendance.forEach(a => {
            attendanceMap[a.student_id] = a.status;
          });
          
          // Initialize records: use existing attendance if available, otherwise default to 'absent'
          const rec = {};
          studs.forEach(s => {
            rec[s.id] = attendanceMap[s.id] || 'absent';
          });
          setRecords(rec);
        }).catch(() => {
          // On error, default to all absent
          const rec = {};
          studs.forEach(s => rec[s.id] = 'absent');
          setRecords(rec);
        }).finally(() => setLoadingAttendance(false));
      });
    }
  }, [selectedSubject, attendanceDate]);

  // Check if selected date is in the past to enable read-only mode
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setIsReadOnly(attendanceDate < today);
  }, [attendanceDate]);

  const statusOptions = [
    { value: 'present', label: 'Present' },
    { value: 'absent', label: 'Absent' },
    { value: 'holiday', label: 'Holiday' },
  ];

  const toggleAll = (status) => {
    const rec = {};
    students.forEach(s => rec[s.id] = status);
    setRecords(rec);
  };

  const markHoliday = async () => {
    if (!selectedSubject) return;
    if (!window.confirm('Mark the selected date as holiday for all students in this subject?')) return;
    setSaving(true); setMsg('');
    try {
      await axios.post('/api/teacher/attendance/holiday', { subject_id: selectedSubject, date: attendanceDate });
      setMsg('Holiday marked successfully. All students are set to holiday for the selected date.');
      const rec = {};
      students.forEach(s => rec[s.id] = 'holiday');
      setRecords(rec);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to mark holiday');
    } finally {
      setSaving(false);
    }
  };

  const saveAttendance = async () => {
    if (!selectedSubject || students.length === 0) return;
    setSaving(true); setMsg('');
    try {
      const recordsList = students.map(s => ({ student_id: s.id, status: records[s.id] || 'absent' }));
      await axios.post('/api/teacher/attendance/manual', { subject_id: selectedSubject, date: attendanceDate, records: recordsList });
      setMsg(`Attendance saved for ${recordsList.length} students!`);
    } catch (err) { setMsg(err.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const startSession = async () => {
    if (!selectedSubject) return;
    setCreatingSession(true); setSessionMsg('');
    try {
      const payload = { subject_id: selectedSubject, type: mode };
      if (enableGeo && location) { payload.geo_lat = location.lat; payload.geo_lng = location.lng; payload.geo_radius = 100; }
      await axios.post('/api/teacher/sessions', payload);
      setSessionMsg('Session started! Students can now mark attendance.');
      await fetchSessions();
    } catch (err) { setSessionMsg(err.response?.data?.error || 'Failed to start session'); }
    finally { setCreatingSession(false); }
  };

  const stopSession = async (session) => {
    if (!window.confirm(`Stop "${session.subject_name}" session? Students will immediately lose the ability to mark attendance.`)) return;
    setStopping(session.id);
    setSessionMsg('');
    try {
      await axios.delete(`/api/teacher/sessions/${session.id}`);
      setSessionMsg('Session stopped successfully.');
      await fetchSessions();
    } catch (err) { setSessionMsg(err.response?.data?.error || 'Failed to stop session'); }
    finally { setStopping(null); }
  };

  const rotateSessionToken = async (session) => {
    if (!window.confirm('Rotate the secure session token? Students will need the new token to mark attendance.')) return;
    setRotatingToken(session.id);
    setSessionMsg('');
    try {
      const res = await axios.post(`/api/teacher/sessions/${session.id}/rotate-token`);
      setSessionMsg('Secure session token rotated. Share the new token with your students.');
      const updatedSessions = sessions.map(s => s.id === session.id ? { ...s, session_token: res.data.session_token } : s);
      setSessions(updatedSessions);
      if (activeSession?.id === session.id) {
        setActiveSession({ ...activeSession, session_token: res.data.session_token });
      }
    } catch (err) {
      setSessionMsg(err.response?.data?.error || 'Failed to rotate session token');
    } finally {
      setRotatingToken(null);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const isToday = attendanceDate === today;

  const displaySessions = showAllToday
    ? sessions
    : sessions.filter(s => s.is_active !== false && new Date(s.expires_at) > new Date(now));

  const modeOptions = [
    { value: 'manual', label: 'Manual', icon: CheckCircle },
    { value: 'code', label: 'Code', icon: Hash },
    { value: 'qr', label: 'QR Code', icon: QrCode },
    { value: 'secure', label: 'Secure', icon: Shield },
  ];

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {msg && (
        <div className={`p-3 rounded-xl text-sm ${msg.includes('saved') || msg.includes('!') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg}
        </div>
      )}

      {/* ── Subject & Date ─────────────────────────────────────────────────── */}
      <div className="attendance-card space-y-3">
        <div>
          <label className="label">Subject</label>
          <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="input-field">
            <option value="">Select subject</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name} — {s.class_name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Date</label>
          <input type="date" value={attendanceDate} max={today} onChange={e => setAttendanceDate(e.target.value)} className="input-field" />
          {isReadOnly && <p className="text-xs text-orange-500 mt-1">⚠ View only mode - Past attendance cannot be edited</p>}
        </div>
        <div>
          <label className="label">Attendance Method</label>
          <div className="grid grid-cols-2 gap-2 mt-1 sm:grid-cols-4">
            {modeOptions.map(({ value, label, icon: Icon }) => (
              <button key={value} onClick={() => setMode(value)}
                className={`py-2 px-1 rounded-xl text-xs font-medium flex flex-col items-center gap-1 border transition-colors ${
                  mode === value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}>
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Session Control (for non-manual modes) ─────────────────────────── */}
      {mode !== 'manual' && (
        <div className="attendance-card space-y-3">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <Hash size={16} /> Session Control
          </h3>

          <div className="flex flex-col gap-3 bg-gray-50 rounded-xl p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <MapPin className={location ? 'text-green-500' : 'text-gray-400'} size={16} />
              <div>
                <p className="text-sm font-medium text-gray-700">Geo-fence</p>
                <p className="text-xs text-gray-400">Restrict to classroom location (100m)</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={enableGeo} onChange={e => { setEnableGeo(e.target.checked); if (e.target.checked) getLocation(); }} className="sr-only peer" />
              <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
            </label>
          </div>

          {enableGeo && (
            <div>
              {locLoading && <p className="text-xs text-gray-500">Getting location…</p>}
              {location && <p className="text-xs text-green-600">📍 Location captured: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>}
              {locError && <p className="text-xs text-red-500">{locError}</p>}
            </div>
          )}

          {activeSession ? (
            <div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center mb-3">
                <p className="text-xs text-gray-500 mb-1">Attendance Code</p>
                <p className="text-4xl font-mono font-bold text-green-700 tracking-widest">{activeSession.code}</p>
                <p className="text-xs text-gray-400 mt-2">Share with students · Active session running below</p>
                {mode === 'secure' && (
                  <>
                    <p className="text-xs text-purple-500 mt-1">🔒 Face verification required</p>
                    {activeSession.session_token && (
                      <div className="mt-3 rounded-xl bg-white border border-gray-200 p-3 text-left text-xs text-gray-700">
                        <p className="font-semibold text-xs text-gray-900">Secure Token</p>
                        <p className="font-mono break-all mt-1 text-sm text-indigo-700">{activeSession.session_token}</p>
                        <button
                          onClick={() => rotateSessionToken(activeSession)}
                          disabled={rotatingToken === activeSession.id}
                          className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white text-xs px-3 py-2 hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {rotatingToken === activeSession.id ? 'Rotating…' : 'Rotate Token'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
              <p className="text-xs text-center text-gray-400 mb-2">Stop the session from the Active Sessions panel below</p>
            </div>
          ) : (
            <div>
              {!selectedSubject && <p className="text-xs text-orange-400 text-center mb-2">Select a subject first</p>}
              <button onClick={startSession} disabled={!selectedSubject || creatingSession}
                className="btn-primary w-full flex items-center justify-center gap-2">
                <Play size={16} />
                {creatingSession ? 'Starting…' : `Start ${mode === 'secure' ? 'Secure' : mode === 'qr' ? 'QR' : 'Code'} Session`}
              </button>
            </div>
          )}

          {sessionMsg && (
            <p className={`text-xs text-center ${sessionMsg.includes('started') || sessionMsg.includes('stopped') ? 'text-green-600' : 'text-red-500'}`}>
              {sessionMsg}
            </p>
          )}
        </div>
      )}

      {/* ── Active Sessions Management ──────────────────────────────────────── */}
      <div className="attendance-card">
        <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${displaySessions.length > 0 && !showAllToday ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
            <h3 className="font-semibold text-gray-700 text-sm">
              Active Sessions
              {!showAllToday && displaySessions.length > 0 && (
                <span className="ml-1.5 bg-green-500 text-white text-xs rounded-full px-1.5 py-0.5">{displaySessions.length}</span>
              )}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAllToday(p => !p)}
              className="text-xs text-gray-500 hover:text-blue-600 border border-gray-200 hover:border-blue-200 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
            >
              <Eye size={11} />
              {showAllToday ? 'Active Only' : "All Today"}
            </button>
            <button onClick={() => fetchSessions()} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              <RefreshCw size={11} /> Refresh
            </button>
          </div>
        </div>

        {sessionsLoading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : displaySessions.length === 0 ? (
          <div className="text-center py-8">
            <Wifi className="mx-auto text-gray-200 mb-2" size={32} />
            <p className="text-gray-400 text-sm">
              {showAllToday ? 'No sessions created today' : 'No active sessions right now'}
            </p>
            <p className="text-gray-300 text-xs mt-1">
              {showAllToday ? 'Start a session above to get started' : 'Tap "All Today" to see expired and stopped sessions'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displaySessions.map(s => (
              <SessionCard key={s.id} session={s} onStop={stopSession} stopping={stopping} now={now} />
            ))}
          </div>
        )}

        <p className="text-xs text-gray-300 text-center mt-3">Auto-refreshes every 15 seconds</p>
      </div>

      {/* ── Manual Student List ─────────────────────────────────────────────── */}
      {mode === 'manual' && selectedSubject && (
        <div className="attendance-card">
          {isReadOnly && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
              <div className="text-amber-600 font-bold text-lg">ℹ</div>
              <div>
                <p className="text-sm font-medium text-amber-900">View Only - Past Attendance</p>
                <p className="text-xs text-amber-700 mt-1">You are viewing attendance from a previous date. To edit today's attendance, select today's date.</p>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-semibold text-gray-700">Students ({students.length})</h3>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => toggleAll('present')} disabled={isReadOnly} className="text-xs btn-success py-1 px-2 disabled:opacity-50 disabled:cursor-not-allowed">All Present</button>
              <button onClick={() => toggleAll('absent')} disabled={isReadOnly} className="text-xs btn-danger py-1 px-2 disabled:opacity-50 disabled:cursor-not-allowed">All Absent</button>
              <button onClick={() => toggleAll('holiday')} disabled={isReadOnly} className="text-xs border border-amber-200 bg-amber-50 text-amber-700 py-1 px-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed">All Holiday</button>
              <button onClick={markHoliday} disabled={saving || isReadOnly} className="text-xs border border-blue-200 bg-blue-50 text-blue-700 py-1 px-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed">
                <Calendar size={14} /> Mark Holiday
              </button>
            </div>
          </div>
          {loadingAttendance && (
            <div className="flex justify-center py-4">
              <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
            </div>
          )}
          {students.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No students in this class</p>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {students.map(s => (
                  <div key={s.id} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex flex-shrink-0 items-center justify-center text-gray-600 text-sm font-medium">
                        {s.name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.student_id}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button onClick={() => setRecords(p => ({ ...p, [s.id]: 'present' }))} disabled={isReadOnly}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${records[s.id] === 'present' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                        <CheckCircle size={16} />
                      </button>
                      <button onClick={() => setRecords(p => ({ ...p, [s.id]: 'absent' }))} disabled={isReadOnly}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${records[s.id] === 'absent' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                        <XCircle size={16} />
                      </button>
                      <button onClick={() => setRecords(p => ({ ...p, [s.id]: 'holiday' }))} disabled={isReadOnly}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${records[s.id] === 'holiday' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                        <Calendar size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs text-gray-500 mb-3">
                <span>Present: {Object.values(records).filter(v => v === 'present').length}</span>
                <span>Absent: {Object.values(records).filter(v => v === 'absent').length}</span>
                <span>Holiday: {Object.values(records).filter(v => v === 'holiday').length}</span>
              </div>
              <button onClick={saveAttendance} disabled={saving || isReadOnly} className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? 'Saving...' : isReadOnly ? 'Cannot edit past attendance' : 'Save Attendance'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
