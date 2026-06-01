import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User, Hash, BookOpen, Flame, ArrowRight, CheckCircle, GraduationCap } from 'lucide-react';
import axios from 'axios';
import { InputField, PasswordField } from '../components/FormFields';

const DEMO = [
  { label: 'Admin',   email: 'admin@smartattend.edu',  password: 'Admin@123',   color: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100' },
  { label: 'Teacher', email: 'priya@smartattend.edu',  password: 'Teacher@123', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
  { label: 'Student', email: 'aarav@smartattend.edu',  password: 'Student@123', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
];

export default function Login() {
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const [reg, setReg] = useState({ name: '', email: '', password: '', student_id: '', roll_number: '', phone: '', class_id: '' });
  const [regShowPwd, setRegShowPwd] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    axios.get('/api/auth/classes').then(r => setClasses(r.data.classes || [])).catch(() => {});
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'teacher') navigate('/teacher');
      else navigate('/student');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const r = await axios.post('/api/auth/register', reg);
      localStorage.setItem('token', r.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${r.data.token}`;
      setRegSuccess(true);
      setTimeout(() => navigate('/student'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  const switchTab = (t) => { setTab(t); setError(''); };

  return (
    <div className="min-h-screen flex items-stretch overflow-x-hidden">
      {/* ── Brand Panel (desktop only) ─────────────────────────── */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 flex-col justify-between p-10 relative overflow-hidden flex-shrink-0">
        {/* bg glows */}
        <div className="absolute top-[-80px] left-[-80px] w-72 h-72 bg-blue-500/30 rounded-full blur-[80px]" />
        <div className="absolute bottom-[-60px] right-[-60px] w-64 h-64 bg-indigo-500/30 rounded-full blur-[80px]" />
        <div className="absolute inset-0" style={{backgroundImage:'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)', backgroundSize:'28px 28px'}} />

        <div className="relative">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Flame className="text-white" size={20} />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-none">SmartAttend</p>
              <p className="text-blue-200 text-xs">Secure Attendance System</p>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-white mb-3 leading-tight">
            Smart. Secure.<br />Tamper-Proof.
          </h2>
          <p className="text-blue-200 text-sm leading-relaxed mb-8">
            Eliminate proxy attendance with multi-layer verification — face detection, GPS geo-fencing, and session codes.
          </p>

          {[
            'Face Detection via TensorFlow.js',
            'GPS Geo-fencing validation',
            'Real-time QR/Code sessions',
            'Role-based dashboards',
          ].map(f => (
            <div key={f} className="flex items-center gap-3 mb-3">
              <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle size={11} className="text-white" />
              </div>
              <span className="text-blue-100 text-sm">{f}</span>
            </div>
          ))}
        </div>

        <div className="relative">
          <div className="bg-white/10 border border-white/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-blue-200 text-xs font-medium">Live session active</span>
            </div>
            <div className="flex gap-3">
              {[['42','Present','bg-emerald-400/20 text-emerald-300'],['8','Absent','bg-red-400/20 text-red-300'],['3','Pending','bg-amber-400/20 text-amber-300']].map(([v,l,c])=>(
                <div key={l} className={`flex-1 ${c} rounded-xl p-2 text-center`}>
                  <p className="text-lg font-bold">{v}</p>
                  <p className="text-[10px] opacity-80">{l}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-blue-300/50 text-[10px] text-center mt-4">SmartAttend v2.0 · Firebase · TensorFlow.js</p>
        </div>
      </div>

      {/* ── Form Panel ────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-3 py-5 sm:p-6">
        <div className="w-full max-w-sm min-w-0">
          {/* Mobile brand */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-2xl mb-3">
              <Flame size={18} />
              <span className="font-bold">SmartAttend</span>
            </div>
            <p className="text-gray-500 text-sm">Secure Attendance System</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-100 bg-gray-50">
              {[['login','Sign In'],['register','Register']].map(([t, l]) => (
                <button
                  key={t}
                  onClick={() => switchTab(t)}
                  className={`flex-1 py-3.5 text-sm font-semibold transition-all duration-200 ${
                    tab === t
                      ? 'text-blue-600 bg-white border-b-2 border-blue-600'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            <div className="p-4 sm:p-6">
              {/* Error / Success */}
              {error && (
                <div className="alert alert-error mb-4 text-xs">
                  {error}
                </div>
              )}
              {regSuccess && (
                <div className="alert alert-success mb-4 text-xs">
                  <CheckCircle size={14} /> Account created! Redirecting...
                </div>
              )}

              {tab === 'login' ? (
                <>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="label">Email Address</label>
                      <InputField icon={Mail} type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com" />
                    </div>
                    <div>
                      <label className="label">Password</label>
                      <PasswordField icon={Lock} visible={showPwd} onToggleVisible={() => setShowPwd(v => !v)} value={password} onChange={e => setPassword(e.target.value)} required placeholder="Your password" />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary w-full h-11"
                    >
                      {loading
                        ? <><span className="spinner w-4 h-4" /> Signing in…</>
                        : <>Sign In <ArrowRight size={15} /></>
                      }
                    </button>

                    <div className="text-center">
                      <Link to="/forgot-password" className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                        Forgot password?
                      </Link>
                    </div>
                  </form>

                  {/* Demo accounts */}
                  <div className="mt-5 pt-5 border-t border-gray-100">
                    <p className="text-center text-xs text-gray-400 mb-3 font-medium">🚀 Demo Access</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {DEMO.map(acc => (
                        <button
                          key={acc.label}
                          onClick={() => { setEmail(acc.email); setPassword(acc.password); }}
                          className={`border rounded-xl py-2 text-xs font-semibold transition-all ${acc.color}`}
                        >
                          {acc.label} Demo
                        </button>
                      ))}
                    </div>
                    <p className="text-center text-[10px] text-gray-300 mt-2">For judges and evaluators.</p>
                  </div>
                </>
              ) : (
                <form onSubmit={handleRegister} className="space-y-3.5">
                  <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                    Student self-registration. Your teacher can also create your account.
                  </p>

                  <div>
                    <label className="label">Full Name *</label>
                    <InputField icon={User} required value={reg.name} onChange={e => setReg(p => ({...p, name: e.target.value}))} placeholder="Your full name" />
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div>
                      <label className="label">Student ID *</label>
                      <InputField icon={Hash} required value={reg.student_id} onChange={e => setReg(p => ({...p, student_id: e.target.value}))} placeholder="S007" />
                    </div>
                    <div>
                      <label className="label">Roll No.</label>
                      <InputField icon={BookOpen} value={reg.roll_number} onChange={e => setReg(p => ({...p, roll_number: e.target.value}))} placeholder="21CS007" />
                    </div>
                  </div>

                  <div>
                    <label className="label">Email *</label>
                    <InputField icon={Mail} required type="email" value={reg.email} onChange={e => setReg(p => ({...p, email: e.target.value}))} placeholder="you@college.edu" />
                  </div>

                  <div>
                    <label className="label">Department / Branch</label>
                    <div className="relative">
                      <GraduationCap size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <select
                        value={reg.class_id}
                        onChange={e => setReg(p => ({...p, class_id: e.target.value}))}
                        className="input-field pl-9"
                      >
                        <option value="">Select your class / branch</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.branch_name ? `${c.branch_name} — ` : ''}{c.name} {c.section} (Sem {c.semester})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="label">Password *</label>
                    <PasswordField icon={Lock} visible={regShowPwd} onToggleVisible={() => setRegShowPwd(v => !v)} required value={reg.password} onChange={e => setReg(p => ({...p, password: e.target.value}))} placeholder="Min 6 characters" minLength={6} />
                  </div>

                  <button type="submit" disabled={loading} className="btn-primary w-full h-11">
                    {loading
                      ? <><span className="spinner w-4 h-4" /> Creating account…</>
                      : 'Create Account'
                    }
                  </button>

                  <p className="text-xs text-center text-gray-500">
                    Already have an account?{' '}
                    <button type="button" onClick={() => switchTab('login')} className="text-blue-600 font-semibold hover:underline">
                      Sign In
                    </button>
                  </p>
                </form>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-5">
            &copy; 2026 SmartAttend · <Link to="/" className="hover:text-gray-600">Home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
