import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Mail, Hash, ArrowLeft, KeyRound, CheckCircle, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { InputField, PasswordField } from '../components/FormFields';

const STEPS = { IDENTIFY: 1, OTP: 2, NEW_PASSWORD: 3, SUCCESS: 4 };

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEPS.IDENTIFY);
  const [mode, setMode] = useState('email');

  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState(null);
  const [resetToken, setResetToken] = useState('');
  const [countdown, setCountdown] = useState(0);

  const otpRefs = useRef([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleIdentify = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const payload = mode === 'email' ? { email } : { student_id: studentId };
      const r = await axios.post('/api/auth/forgot-password', payload);
      setInfo(r.data);
      setCountdown(600);
      setStep(STEPS.OTP);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
    } finally { setLoading(false); }
  };

  const handleOtpChange = (i, val) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 1);
    const next = [...otp];
    next[i] = cleaned;
    setOtp(next);
    if (cleaned && i < 5) otpRefs.current[i + 1]?.focus();
    if (!cleaned && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && i > 0) otpRefs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
      e.preventDefault();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    const otpStr = otp.join('');
    try {
      const payload = mode === 'email' ? { email, otp: otpStr } : { student_id: studentId, otp: otpStr };
      const r = await axios.post('/api/auth/verify-otp', payload);
      setResetToken(r.data.reset_token);
      setStep(STEPS.NEW_PASSWORD);
    } catch (err) {
      setError(err.response?.data?.error || 'OTP verification failed.');
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    setError(''); setLoading(true); setOtp(['', '', '', '', '', '']);
    try {
      const payload = mode === 'email' ? { email } : { student_id: studentId };
      const r = await axios.post('/api/auth/forgot-password', payload);
      setInfo(r.data);
      setCountdown(600);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend OTP.');
    } finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault(); setError(''); 
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await axios.post('/api/auth/reset-password', { reset_token: resetToken, new_password: newPassword });
      setStep(STEPS.SUCCESS);
    } catch (err) {
      setError(err.response?.data?.error || 'Password reset failed. Please start over.');
    } finally { setLoading(false); }
  };

  const formatCountdown = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4 backdrop-blur">
            <GraduationCap className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">SmartAttend</h1>
          <p className="text-white/70 text-sm mt-1">Password Recovery</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          {step === STEPS.IDENTIFY && (
            <>
              <div className="flex items-center gap-2 mb-5">
                <Link to="/login" className="text-gray-400 hover:text-gray-600 transition-colors">
                  <ArrowLeft size={18} />
                </Link>
                <h2 className="font-semibold text-gray-800">Reset Password</h2>
              </div>
              <p className="text-sm text-gray-500 mb-5">
                Enter your email address or student ID and we'll send you a one-time password.
              </p>

              <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
                <button onClick={() => { setMode('email'); setError(''); }} className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${mode === 'email' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>
                  Email
                </button>
                <button onClick={() => { setMode('student_id'); setError(''); }} className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${mode === 'student_id' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>
                  Student ID
                </button>
              </div>

              {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 border border-red-100">{error}</div>}

              <form onSubmit={handleIdentify} className="space-y-4">
                {mode === 'email' ? (
                  <div>
                    <label className="label">Email Address</label>
                    <InputField icon={Mail} type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
                  </div>
                ) : (
                  <div>
                    <label className="label">Student ID</label>
                    <InputField icon={Hash} required value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="e.g. S001" />
                  </div>
                )}
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              </form>

              <p className="text-xs text-center text-gray-400 mt-4">
                Remember your password? <Link to="/login" className="text-blue-600 font-medium">Sign in</Link>
              </p>
            </>
          )}

          {step === STEPS.OTP && (
            <>
              <div className="flex items-center gap-2 mb-5">
                <button onClick={() => { setStep(STEPS.IDENTIFY); setError(''); setOtp(['','','','','','']); }} className="text-gray-400 hover:text-gray-600">
                  <ArrowLeft size={18} />
                </button>
                <h2 className="font-semibold text-gray-800">Enter OTP</h2>
              </div>

              <p className="text-sm text-gray-500 mb-1">
                A 6-digit code was sent to <span className="font-medium text-gray-700">{info?.email_masked}</span>
              </p>
              <p className="text-xs text-gray-400 mb-5">
                Hi {info?.name} · {info?.role}
              </p>

              {info?.dev_otp && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                  <p className="text-xs text-amber-700 font-semibold mb-1">Development Mode</p>
                  <p className="text-xs text-amber-600">No SMTP configured. Your OTP is:</p>
                  <p className="text-2xl font-mono font-bold text-amber-700 tracking-[0.3em] mt-1">{info.dev_otp}</p>
                </div>
              )}

              {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 border border-red-100">{error}</div>}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="label text-center block mb-3">Enter 6-digit OTP</label>
                  <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={el => otpRefs.current[i] = el}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(i, e)}
                        className="w-10 h-12 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={loading || otp.join('').length < 6} className="btn-primary w-full">
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
              </form>

              <div className="mt-4 text-center">
                {countdown > 0 ? (
                  <p className="text-xs text-gray-400">
                    OTP expires in <span className="font-mono font-medium text-gray-600">{formatCountdown(countdown)}</span>
                  </p>
                ) : (
                  <p className="text-xs text-red-500">OTP expired.</p>
                )}
                <button onClick={handleResend} disabled={loading || countdown > 540} className="mt-2 text-xs text-blue-600 font-medium hover:underline disabled:text-gray-300 disabled:no-underline flex items-center gap-1 mx-auto">
                  <RefreshCw size={12} /> Resend OTP {countdown > 540 ? `(wait ${formatCountdown(countdown - 540)})` : ''}
                </button>
              </div>
            </>
          )}

          {step === STEPS.NEW_PASSWORD && (
            <>
              <div className="flex items-center gap-2 mb-5">
                <button onClick={() => { setStep(STEPS.OTP); setError(''); }} className="text-gray-400 hover:text-gray-600">
                  <ArrowLeft size={18} />
                </button>
                <h2 className="font-semibold text-gray-800">New Password</h2>
              </div>
              <p className="text-sm text-gray-500 mb-5">OTP verified. Set your new password below.</p>

              {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 border border-red-100">{error}</div>}

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="label">New Password</label>
                  <PasswordField icon={KeyRound} visible={showPwd} onToggleVisible={() => setShowPwd(v => !v)} required value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" minLength={6} />
                </div>
                <div>
                  <label className="label">Confirm New Password</label>
                  <PasswordField icon={KeyRound} visible={showConfirm} onToggleVisible={() => setShowConfirm(v => !v)} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat password" minLength={6} />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>
                <button type="submit" disabled={loading || newPassword !== confirmPassword || newPassword.length < 6} className="btn-primary w-full">
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            </>
          )}

          {step === STEPS.SUCCESS && (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4">
                <CheckCircle className="text-green-600" size={32} />
              </div>
              <h2 className="font-bold text-gray-800 mb-2">Password Reset!</h2>
              <p className="text-sm text-gray-500 mb-6">Your password has been updated successfully. You can now sign in with your new password.</p>
              <button onClick={() => navigate('/login')} className="btn-primary w-full">
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
