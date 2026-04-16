import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap, Scan, MapPin, QrCode, BarChart2, Bell, FileText,
  ArrowRight, CheckCircle, ChevronDown, Menu, X, Shield, Zap,
  Users, BookOpen, LayoutDashboard, Star, Clock, TrendingUp, Flame,
  Smartphone, Download
} from 'lucide-react';

function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const h = () => setY(window.scrollY);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);
  return y;
}

const features = [
  { icon: Scan, title: 'Face Detection', desc: 'TensorFlow.js verifies student identity via webcam before marking attendance — no proxies allowed.', color: 'bg-violet-100 text-violet-600', border: 'border-violet-100' },
  { icon: MapPin, title: 'Geo-Fencing', desc: 'Students must be physically inside the classroom radius. GPS coordinates validated server-side.', color: 'bg-emerald-100 text-emerald-600', border: 'border-emerald-100' },
  { icon: QrCode, title: 'QR / Code Sessions', desc: 'Teachers start sessions that expire in 10 minutes. Students scan or enter the code to mark presence.', color: 'bg-blue-100 text-blue-600', border: 'border-blue-100' },
  { icon: BarChart2, title: 'Real-time Analytics', desc: 'Live dashboards showing attendance trends, low-attendance alerts, and subject-wise reports.', color: 'bg-orange-100 text-orange-600', border: 'border-orange-100' },
  { icon: Bell, title: 'Smart Notifications', desc: 'Instant alerts for low attendance, request approvals, and session starts via push notifications.', color: 'bg-pink-100 text-pink-600', border: 'border-pink-100' },
  { icon: FileText, title: 'Attendance Reports', desc: 'Export detailed CSV reports with percentage breakdowns per student, subject, and date range.', color: 'bg-teal-100 text-teal-600', border: 'border-teal-100' },
];

const steps = [
  { num: '01', title: 'Teacher Starts Session', desc: 'Teacher opens a QR or code session for a subject, optionally with GPS geo-fence.', icon: BookOpen, color: 'bg-blue-600' },
  { num: '02', title: 'Student Marks Attendance', desc: 'Student scans QR or enters code. Face detection and location are verified in real time.', icon: Users, color: 'bg-violet-600' },
  { num: '03', title: 'System Validates', desc: 'Server checks session active, student in class, not duplicate, within geo-fence.', icon: Shield, color: 'bg-emerald-600' },
  { num: '04', title: 'Data Stored & Reported', desc: 'Attendance saved with full audit trail. Analytics updated instantly on all dashboards.', icon: BarChart2, color: 'bg-orange-600' },
];

const roles = [
  {
    role: 'Student',
    color: 'from-emerald-500 to-teal-600',
    icon: GraduationCap,
    loginPath: '/login',
    features: ['Mark attendance via QR or code', 'View subject-wise attendance history', 'Submit correction requests', 'Receive low-attendance alerts', 'Track attendance percentage'],
  },
  {
    role: 'Teacher',
    color: 'from-blue-500 to-indigo-600',
    icon: Users,
    loginPath: '/login',
    features: ['Add & manage students', 'Start QR/code attendance sessions', 'Take manual attendance', 'Review student requests', 'Generate attendance reports'],
    badge: 'Most Used',
  },
  {
    role: 'Admin',
    color: 'from-purple-500 to-violet-600',
    icon: Shield,
    loginPath: '/login',
    features: ['Manage all teachers & students', 'Oversee all classes & subjects', 'View system-wide analytics', 'Access full audit logs', 'Configure departments & branches'],
  },
];

const stats = [
  { value: '99.9%', label: 'Uptime', icon: Zap },
  { value: '< 2s', label: 'Verification Speed', icon: Clock },
  { value: '0', label: 'Proxy Incidents', icon: Shield },
  { value: '100%', label: 'Audit Coverage', icon: TrendingUp },
];

export default function HomePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollY = useScrollY();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin') navigate('/admin', { replace: true });
      else if (user.role === 'teacher') navigate('/teacher', { replace: true });
      else navigate('/student', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
      <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );
  if (user) return null;

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── NAVBAR ──────────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrollY > 20 ? 'bg-white/95 backdrop-blur shadow-sm border-b border-gray-100' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Flame className="text-white" size={18} />
            </div>
            <span className={`font-bold text-lg ${scrollY > 20 ? 'text-gray-900' : 'text-white'}`}>SmartAttend</span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            {[['Home','hero'],['Features','features'],['How It Works','how'],['Roles','roles']].map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)} className={`text-sm font-medium transition-colors ${scrollY > 20 ? 'text-gray-600 hover:text-blue-600' : 'text-white/80 hover:text-white'}`}>{label}</button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className={`text-sm font-medium px-4 py-2 rounded-xl transition-all ${scrollY > 20 ? 'text-gray-700 hover:bg-gray-100' : 'text-white/90 hover:text-white'}`}>Sign In</Link>
            <Link to="/login" className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">Get Started</Link>
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className={`md:hidden ${scrollY > 20 ? 'text-gray-700' : 'text-white'}`}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-2 shadow-lg">
            {[['Home','hero'],['Features','features'],['How It Works','how'],['Roles','roles']].map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)} className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg font-medium">{label}</button>
            ))}
            <div className="pt-2 border-t border-gray-100 flex gap-2">
              <Link to="/login" onClick={() => setMenuOpen(false)} className="flex-1 text-center py-2 text-sm text-gray-700 border border-gray-200 rounded-xl font-medium">Sign In</Link>
              <Link to="/login" onClick={() => setMenuOpen(false)} className="flex-1 text-center py-2 text-sm text-white bg-blue-600 rounded-xl font-medium">Get Started</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section id="hero" className="relative min-h-screen flex items-center overflow-hidden bg-[#0f172a]">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-900/10 rounded-full blur-[80px]" />
          <div className="absolute inset-0" style={{backgroundImage:'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)', backgroundSize:'32px 32px'}} />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-16 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-900/40 border border-blue-800/50 rounded-full px-4 py-1.5 mb-6">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-blue-300 text-xs font-medium">Live System — Production Ready</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4">
                Smart Secure<br />
                <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                  Attendance
                </span><br />
                System
              </h1>

              <p className="text-lg text-slate-300 mb-4 max-w-lg">
                <span className="text-blue-400 font-semibold">Track.</span>{' '}
                <span className="text-violet-400 font-semibold">Secure.</span>{' '}
                <span className="text-emerald-400 font-semibold">Analyze.</span>
              </p>
              <p className="text-slate-400 mb-8 max-w-lg leading-relaxed">
                Eliminate proxy attendance with face detection, GPS geo-fencing, and secure QR sessions. 
                Built for colleges with real-time dashboards for every role.
              </p>

              <div className="flex flex-wrap gap-3 mb-10">
                {[
                  { label: 'Student Login', to: '/login', bg: 'bg-emerald-500 hover:bg-emerald-600', text: 'text-white' },
                  { label: 'Teacher Login', to: '/login', bg: 'bg-blue-600 hover:bg-blue-700', text: 'text-white' },
                  { label: 'Admin Login', to: '/login', bg: 'bg-white/10 hover:bg-white/20 border border-white/20', text: 'text-white' },
                ].map(btn => (
                  <Link key={btn.label} to={btn.to} className={`${btn.bg} ${btn.text} px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2`}>
                    {btn.label} <ArrowRight size={14} />
                  </Link>
                ))}
              </div>

              <div className="flex flex-wrap gap-4">
                {stats.map(s => (
                  <div key={s.label} className="flex items-center gap-2">
                    <s.icon size={14} className="text-blue-400" />
                    <span className="text-white font-bold text-sm">{s.value}</span>
                    <span className="text-slate-500 text-xs">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dashboard preview card */}
            <div className="hidden lg:block">
              <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-5 shadow-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex gap-1.5"><div className="w-3 h-3 bg-red-500 rounded-full"/><div className="w-3 h-3 bg-yellow-500 rounded-full"/><div className="w-3 h-3 bg-green-500 rounded-full"/></div>
                  <span className="text-slate-400 text-xs ml-2">Teacher Dashboard</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[['Present','42','bg-emerald-900/40 text-emerald-400'],['Absent','8','bg-red-900/40 text-red-400'],['Pending','3','bg-yellow-900/40 text-yellow-400']].map(([l,v,c])=>(
                    <div key={l} className={`${c} rounded-xl p-3 text-center`}>
                      <p className="text-2xl font-bold">{v}</p>
                      <p className="text-xs opacity-70">{l}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 mb-4">
                  {[['Data Structures','CS601','Active',true],['Database DBMS','CS602','Completed',false],['Operating Systems','CS603','Upcoming',false]].map(([sub,code,status,active])=>(
                    <div key={code} className="flex items-center gap-3 bg-slate-700/40 rounded-xl px-3 py-2">
                      <div className={`w-2 h-2 rounded-full ${active?'bg-emerald-400 animate-pulse':'bg-slate-500'}`}/>
                      <div className="flex-1"><p className="text-white text-xs font-medium">{sub}</p><p className="text-slate-400 text-xs">{code}</p></div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${active?'bg-emerald-900/50 text-emerald-300':'bg-slate-700 text-slate-400'}`}>{status}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-blue-600/20 border border-blue-600/30 rounded-xl p-3 flex items-center gap-3">
                  <QrCode className="text-blue-400" size={20} />
                  <div>
                    <p className="text-white text-xs font-semibold">Session Active</p>
                    <p className="text-blue-300 text-xs">Code: XK7P2Q · 8m left</p>
                  </div>
                  <div className="ml-auto w-8 h-8 bg-blue-600/30 rounded-lg flex items-center justify-center">
                    <div className="w-3 h-3 bg-blue-400 rounded-sm"/>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button onClick={() => scrollTo('features')} className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-500 hover:text-slate-300 transition-colors animate-bounce">
            <ChevronDown size={24} />
          </button>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────── */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="text-blue-600 text-sm font-semibold uppercase tracking-widest">Features</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-2">Built for security & speed</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">Every feature is designed to eliminate fraud while keeping attendance marking simple for students and teachers.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(f => (
              <div key={f.title} className={`bg-white rounded-2xl p-6 border ${f.border} hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group`}>
                <div className={`w-12 h-12 ${f.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon size={22} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────── */}
      <section id="how" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="text-violet-600 text-sm font-semibold uppercase tracking-widest">Process</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-2">How it works</h2>
            <p className="text-gray-500 mt-3 max-w-lg mx-auto">From session start to data storage — attendance is verified and recorded in under 2 seconds.</p>
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-blue-200 via-violet-200 to-orange-200" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((s, i) => (
                <div key={s.num} className="text-center relative">
                  <div className={`w-20 h-20 ${s.color} rounded-2xl flex flex-col items-center justify-center mx-auto mb-5 shadow-lg relative z-10`}>
                    <s.icon className="text-white" size={24} />
                    <span className="text-white/60 text-xs mt-1">{s.num}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                  {i < steps.length - 1 && <div className="lg:hidden w-0.5 h-6 bg-gray-200 mx-auto mt-4" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── ROLE SECTIONS ───────────────────────────────────────── */}
      <section id="roles" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="text-emerald-600 text-sm font-semibold uppercase tracking-widest">Access Levels</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-2">Built for every role</h2>
            <p className="text-gray-500 mt-3 max-w-lg mx-auto">Each role gets a tailored dashboard with exactly the tools they need — nothing more, nothing less.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {roles.map(r => (
              <div key={r.role} className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col">
                <div className={`bg-gradient-to-br ${r.color} p-6 relative`}>
                  {r.badge && (
                    <div className="absolute top-4 right-4 bg-white/20 backdrop-blur text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Star size={10} /> {r.badge}
                    </div>
                  )}
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                    <r.icon className="text-white" size={24} />
                  </div>
                  <h3 className="text-white font-bold text-xl">{r.role}</h3>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <ul className="space-y-2.5 flex-1">
                    {r.features.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                        <CheckCircle size={15} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to={r.loginPath} className={`mt-5 w-full text-center py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r ${r.color} hover:opacity-90 transition-opacity flex items-center justify-center gap-2`}>
                    {r.role} Login <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DOWNLOAD APP ────────────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 border border-slate-800 shadow-2xl">
            {/* bg glows */}
            <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-600/20 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-violet-600/15 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute inset-0 pointer-events-none" style={{backgroundImage:'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0)', backgroundSize:'28px 28px'}} />

            <div className="relative flex flex-col sm:flex-row items-center gap-8 px-8 py-10 sm:px-12">
              {/* Android icon area */}
              <div className="flex-shrink-0 flex flex-col items-center">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-xl shadow-green-900/40 mb-3">
                  {/* Android robot SVG */}
                  <svg viewBox="0 0 24 24" fill="white" className="w-11 h-11">
                    <path d="M17.523 15.341A5 5 0 0 0 12 11a5 5 0 0 0-5.523 4.341M6 8h12M8.5 5.5l-1.5-3M15.5 5.5l1.5-3M9 8v7a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V8" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                    <circle cx="9.5" cy="10.5" r="0.75" fill="white"/>
                    <circle cx="14.5" cy="10.5" r="0.75" fill="white"/>
                    <path d="M5 8h14a1 1 0 0 1 1 1v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1z" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
                  </svg>
                </div>
                <span className="text-xs text-slate-500 font-medium bg-slate-800 px-2.5 py-0.5 rounded-full">v1.0</span>
              </div>

              {/* Text */}
              <div className="flex-1 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 bg-green-900/30 border border-green-800/40 text-green-400 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                  <Smartphone size={11} /> Android App Available
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Download Mobile App</h2>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-md">
                  Install the Smart Attendance app for a better experience — mark attendance, view reports, and get instant alerts on the go.
                </p>
                <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                  {['QR Attendance','Offline Support','Push Notifications','Face Verification'].map(f => (
                    <span key={f} className="flex items-center gap-1">
                      <CheckCircle size={11} className="text-emerald-500" /> {f}
                    </span>
                  ))}
                </div>
              </div>

              {/* Download button */}
              <div className="flex-shrink-0">
                <a
                  href="/downloads/app.apk"
                  download="SmartAttend.apk"
                  className="group inline-flex items-center gap-3 bg-green-500 hover:bg-green-400 text-white font-bold px-7 py-4 rounded-2xl shadow-lg shadow-green-900/40 transition-all duration-200 hover:scale-105 hover:shadow-green-900/60 text-sm sm:text-base"
                >
                  <Download size={20} className="group-hover:animate-bounce" />
                  <div className="text-left">
                    <div className="text-xs opacity-80 font-normal leading-none mb-0.5">Get it free</div>
                    <div>Download APK</div>
                  </div>
                </a>
                <p className="text-xs text-slate-600 text-center mt-2">Android 7.0+ · ~12 MB</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#0f172a] relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-900/40 border border-blue-800/50 rounded-full px-4 py-1.5 mb-6">
            <Zap size={12} className="text-blue-400" />
            <span className="text-blue-300 text-xs font-medium">Ready to deploy</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to eliminate proxy attendance?</h2>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto leading-relaxed">
            Join SmartAttend and get face-verified, geo-fenced, tamper-proof attendance for your institution today.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/login" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2">
              Get Started Now <ArrowRight size={16} />
            </Link>
            <button onClick={() => scrollTo('features')} className="border border-slate-700 text-slate-300 px-6 py-3 rounded-xl font-semibold hover:bg-slate-800 transition-colors">
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="bg-slate-950 text-slate-400 py-10 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <Flame className="text-white" size={14} />
              </div>
              <span className="font-bold text-white text-base">SmartAttend</span>
              <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full ml-1">v2.0</span>
            </div>

            <div className="flex items-center gap-6 text-sm">
              {[['Home','hero'],['Features','features'],['How It Works','how'],['Roles','roles']].map(([label, id]) => (
                <button key={id} onClick={() => scrollTo(id)} className="hover:text-white transition-colors">{label}</button>
              ))}
            </div>

            <div className="flex items-center gap-4 text-sm">
              <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
              <Link to="/forgot-password" className="hover:text-white transition-colors">Forgot Password</Link>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <p>© 2026 SmartAttend. Smart Secure Student Attendance Management System.</p>
            <p>Stack: Node.js · PostgreSQL · React · TensorFlow.js · Firebase</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
