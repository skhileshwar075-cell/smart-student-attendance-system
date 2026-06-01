import React, { useState, useEffect } from 'react';
import axios from '../../api.js';
import { MapPin, Hash, Wifi, CheckCircle, Clock, AlertCircle, Shield, QrCode } from 'lucide-react';
import { useGeolocation } from '../../hooks/useGeolocation';
import FaceCapture from '../../components/FaceCapture';
import QRScanner from '../../components/QRScanner';

export default function MarkAttendance() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [marking, setMarking] = useState(false);
  const [message, setMessage] = useState(null);
  const [showFaceCapture, setShowFaceCapture] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [pendingMark, setPendingMark] = useState(null);
  const [faceVerified, setFaceVerified] = useState(false);
  const [faceEmbedding, setFaceEmbedding] = useState(null);
  const [qrError, setQrError] = useState('');
  const { location, error: locError, loading: locLoading, getLocation } = useGeolocation();

  useEffect(() => {
    fetchSessions();
    getLocation();
  }, []);

  const fetchSessions = () => {
    setLoading(true);
    axios.get('/api/student/sessions/active').then(r => setSessions(r.data.sessions || [])).finally(() => setLoading(false));
  };

  const initiateMarkBySession = (session) => {
    setPendingMark({ type: 'session', session });
    setShowFaceCapture(true);
  };

  const initiateMarkByCode = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setMessage({ type: 'error', text: 'Enter a valid attendance code before submitting.' });
      return;
    }
    if (!/^[A-Z0-9]{4,8}$/.test(trimmed)) {
      setMessage({ type: 'error', text: 'Attendance code must be 4 to 8 uppercase letters or digits.' });
      return;
    }
    setCode(trimmed);
    setPendingMark({ type: 'code', code: trimmed });
    setShowFaceCapture(true);
    setQrError('');
  };

  const handleQrDetected = async (rawData) => {
    const trimmed = String(rawData || '').trim();
    let extracted = trimmed;
    const parts = trimmed.split(':');
    if (parts.length >= 4 && parts[0] === 'SMARTATTEND') {
      extracted = parts[2] || '';
    }
    extracted = extracted.toUpperCase();
    if (!/^[A-Z0-9]{4,8}$/.test(extracted)) {
      setQrError('Scanned QR did not contain a valid attendance code.');
      return;
    }
    setCode(extracted);
    setShowQrScanner(false);
    setQrError('');
    await doMark({ type: 'code', code: extracted }, false);
  };

  const openQrScanner = () => {
    setQrError('');
    setShowQrScanner(true);
  };

  const closeQrScanner = () => {
    setShowQrScanner(false);
  };

  const handleFaceVerified = async (verified, embedding) => {
    setFaceVerified(verified);
    setFaceEmbedding(embedding || null);
    setShowFaceCapture(false);
    if (pendingMark) await doMark(pendingMark, verified, embedding);
  };

  const handleFaceSkip = async () => {
    setFaceEmbedding(null);
    setShowFaceCapture(false);
    if (pendingMark) await doMark(pendingMark, false, null);
  };

  const doMark = async (markData, faceVerifiedStatus, embedding) => {
    setMarking(true);
    setMessage(null);
    try {
      const payload = {
        geo_lat: location?.lat,
        geo_lng: location?.lng,
        face_verified: faceVerifiedStatus,
      };
      if (embedding) payload.face_embedding = embedding;
      if (markData.type === 'session') payload.session_id = markData.session?.id || markData.sessionId;
      else { payload.code = markData.code; setCode(''); }

      await axios.post('/api/student/attendance/mark', payload);
      setMessage({ type: 'success', text: `Attendance marked!${faceVerifiedStatus ? ' (Face verified ✓)' : ''}` });
      setPendingMark(null);
      setFaceEmbedding(null);
      fetchSessions();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to mark attendance' });
    } finally {
      setMarking(false);
    }
  };

  const timeLeft = (expiresAt) => {
    const exp = expiresAt?.toDate ? expiresAt.toDate() : new Date(expiresAt);
    const diff = exp - new Date();
    if (diff <= 0) return 'Expired';
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  if (showQrScanner) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="attendance-card bg-blue-50 border border-blue-200">
          <div className="flex items-center gap-2 text-blue-700 text-sm mb-1">
            <QrCode size={16} /> <span className="font-medium">Scan Attendance QR Code</span>
          </div>
          <p className="text-xs text-blue-500">Point your camera at the session QR code to capture the attendance code.</p>
        </div>
        <QRScanner onDetected={handleQrDetected} onCancel={closeQrScanner} />
        {qrError && <p className="text-xs text-red-500 mt-2">{qrError}</p>}
      </div>
    );
  }

  if (showFaceCapture) {
    const requiresFace = pendingMark?.type === 'session' && pendingMark.session?.session_type === 'secure';
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="attendance-card bg-blue-50 border border-blue-200">
          <div className="flex items-center gap-2 text-blue-700 text-sm mb-1">
            <Shield size={16} /> <span className="font-medium">Secure Attendance Verification</span>
          </div>
          <p className="text-xs text-blue-500">
            {requiresFace
              ? 'Face scan is required for this secure session.'
              : 'Complete face scan for secure attendance or skip to use code only.'}
          </p>
        </div>
        <FaceCapture onVerified={handleFaceVerified} onSkip={handleFaceSkip} allowSkip={!requiresFace} />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {message && (
        <div className={`p-4 rounded-2xl flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      <div className="attendance-card">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className={location ? 'text-green-500' : 'text-gray-400'} size={16} />
          <span className="text-sm font-medium text-gray-700">Geolocation Status</span>
          <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">FusedLocation API</span>
        </div>
        {locLoading && <p className="text-xs text-gray-400">Getting your location...</p>}
        {location && (
          <div>
            <p className="text-xs text-green-600 font-medium">Location captured</p>
            <p className="text-xs text-gray-400">Lat: {location.lat.toFixed(5)}, Lng: {location.lng.toFixed(5)} (±{Math.round(location.accuracy)}m)</p>
          </div>
        )}
        {locError && (
          <div>
            <p className="text-xs text-orange-500">{locError}</p>
            <button onClick={getLocation} className="mt-1 text-xs btn-secondary py-1">Retry Location</button>
          </div>
        )}
        {!location && !locLoading && !locError && (
          <button onClick={getLocation} className="text-xs btn-secondary py-1">Get Location</button>
        )}
      </div>

      <div className="attendance-card">
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><Hash size={16} /> Enter Attendance Code</h3>
        <div className="flex gap-2 flex-col sm:flex-row">
          <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && initiateMarkByCode()}
            placeholder="Enter 6-digit code" maxLength={8}
            className="input-field flex-1 text-center text-xl font-mono tracking-widest uppercase" />
          <div className="flex gap-2">
            <button onClick={initiateMarkByCode} disabled={marking || !code.trim()} className="btn-primary px-4">Submit</button>
            <button onClick={openQrScanner} disabled={marking} className="btn-secondary px-4 flex items-center gap-2">
              <QrCode size={16} /> Scan QR
            </button>
          </div>
        </div>
        {qrError && <p className="text-xs text-red-500 mt-2">{qrError}</p>}
        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1"><Shield size={11} /> Face verification will be requested for secure attendance sessions</p>
      </div>

      <div className="attendance-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2"><Wifi size={16} /> Active Sessions</h3>
          <button onClick={fetchSessions} className="text-xs text-primary-600 hover:underline">Refresh</button>
        </div>
        {loading ? (
          <div className="flex justify-center py-6"><div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full" /></div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8">
            <Wifi className="mx-auto text-gray-300 mb-2" size={32} />
            <p className="text-gray-400 text-sm">No active sessions right now</p>
            <p className="text-gray-300 text-xs mt-1">Ask your teacher to start a session</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(s => (
              <div key={s.id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{s.subject_name}</p>
                    <p className="text-xs text-gray-400">{s.class_name} • {s.teacher_name}</p>
                  </div>
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full capitalize">{s.session_type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-orange-500 text-xs">
                    <Clock size={12} />
                    <span>{timeLeft(s.expires_at)}</span>
                  </div>
                  <button onClick={() => initiateMarkBySession(s)} disabled={marking}
                    className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1">
                    <Shield size={12} /> {marking ? 'Marking...' : 'Mark Present'}
                  </button>
                </div>
                {s.geo_lat && location && (
                  <p className="text-xs text-gray-400 mt-1">
                    📍 Geo-fence active — you must be within {s.geo_radius}m
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
