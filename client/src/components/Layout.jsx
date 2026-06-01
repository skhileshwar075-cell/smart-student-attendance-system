import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import {
  LayoutDashboard, Users, BookOpen, ClipboardList, BarChart2,
  Bell, LogOut, Menu, X, ChevronRight, UserCheck, Settings,
  GraduationCap, FileText, AlertCircle, Shield, Flame, TrendingDown,
  Activity, Zap, MonitorSmartphone, CalendarRange
} from 'lucide-react';

const navGroups = {
  student: [
    {
      items: [
        { path: '/student',              label: 'Dashboard',       icon: LayoutDashboard },
        { path: '/student/mark',         label: 'Mark Attendance', icon: UserCheck },
        { path: '/student/attendance',   label: 'My Attendance',   icon: ClipboardList },
        { path: '/student/requests',     label: 'Requests',        icon: FileText },
        { path: '/student/notifications',label: 'Notifications',   icon: Bell },
        { path: '/student/profile',      label: 'Profile',         icon: Settings },
      ],
    },
  ],
  teacher: [
    {
      label: 'Overview',
      items: [
        { path: '/teacher',               label: 'Dashboard',       icon: LayoutDashboard },
        { path: '/teacher/students',      label: 'Students',        icon: Users },
        { path: '/teacher/notifications', label: 'Notifications',   icon: Bell },
      ],
    },
    {
      label: 'Attendance',
      items: [
        { path: '/teacher/attendance', label: 'Take Attendance',    icon: UserCheck },
        { path: '/teacher/sessions',   label: 'Active Sessions',    icon: Activity },
        { path: '/teacher/records',    label: 'Records',            icon: ClipboardList },
        { path: '/teacher/requests',   label: 'Student Requests',   icon: AlertCircle },
      ],
    },
    {
      label: 'Analytics',
      items: [
        { path: '/teacher/reports', label: 'Reports', icon: BarChart2 },
      ],
    },
    {
      label: 'Account',
      items: [
        { path: '/teacher/profile', label: 'My Profile', icon: Settings },
      ],
    },
  ],
  admin: [
    {
      label: 'Overview',
      items: [
        { path: '/admin',               label: 'Dashboard',     icon: LayoutDashboard },
        { path: '/admin/notifications', label: 'Notifications', icon: Bell },
        { path: '/admin/device-preview',label: 'Device Preview',icon: MonitorSmartphone },
      ],
    },
    {
      label: 'Management',
      items: [
        { path: '/admin/students',          label: 'Students',           icon: GraduationCap },
        { path: '/admin/teachers',          label: 'Teachers',           icon: Users },
        { path: '/admin/classes',           label: 'Classes',            icon: BookOpen },
        { path: '/admin/subjects',          label: 'Subjects',           icon: BookOpen },
        { path: '/admin/academic-sessions', label: 'Academic Sessions',  icon: CalendarRange },
      ],
    },
    {
      label: 'Analytics',
      items: [
        { path: '/admin/reports',               label: 'Reports',        icon: BarChart2 },
        { path: '/admin/analytics',             label: 'Analytics',      icon: BarChart2 },
        { path: '/admin/attendance-analytics',  label: 'Adv. Analytics', icon: TrendingDown },
        { path: '/admin/logs',                  label: 'Audit Logs',     icon: Shield },
      ],
    },
    {
      label: 'Account',
      items: [
        { path: '/admin/profile', label: 'My Profile', icon: Settings },
      ],
    },
  ],
};

const roleMeta = {
  admin:   { label: 'Administrator', gradient: 'from-violet-700 to-purple-700', badge: 'bg-purple-500', dot: 'bg-purple-400' },
  teacher: { label: 'Teacher',       gradient: 'from-blue-700 to-blue-600',     badge: 'bg-blue-500',   dot: 'bg-blue-400' },
  student: { label: 'Student',       gradient: 'from-emerald-700 to-teal-600',  badge: 'bg-emerald-500',dot: 'bg-emerald-400' },
};

function NavItem({ item, active, roleGradient }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 transition-all duration-200 group ${
        active
          ? 'bg-white/15 text-white font-semibold'
          : 'text-white/60 hover:bg-white/10 hover:text-white/90'
      }`}
    >
      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full" />}
      <Icon size={17} className="flex-shrink-0" />
      <span className="text-sm">{item.label}</span>
      {active && <ChevronRight size={13} className="ml-auto opacity-60" />}
    </Link>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const initialOpen = window.innerWidth >= 1024;
    setSidebarOpen(initialOpen);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const groups = navGroups[user?.role] || [];
  const meta = roleMeta[user?.role] || roleMeta.student;
  const allItems = groups.flatMap(g => g.items);
  const currentItem = allItems.find(i => i.path === location.pathname);

  const handleLogout = () => { logout(); navigate('/'); };

  const initial = user?.name?.charAt(0).toUpperCase() || '?';
  const greeting = time.getHours() < 12 ? 'Good morning' : time.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen flex overflow-x-hidden" style={{ background: 'var(--bg)' }}>
      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-[min(16rem,85vw)] flex flex-col
        bg-gradient-to-b ${meta.gradient}
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0 lg:translate-x-0' : '-translate-x-full lg:-translate-x-full'}
      `}>
        {/* Brand */}
        <div className="px-4 pt-5 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Flame className="text-white" size={16} />
              </div>
              <div>
                <p className="text-white font-bold text-base leading-none">SmartAttend</p>
                <p className="text-white/50 text-[10px] mt-0.5">v2.0</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/60 hover:text-white">
              <X size={18} />
            </button>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
            <div className="w-9 h-9 rounded-xl bg-white/25 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
              {user?.profile_photo
                ? <img src={user.profile_photo} alt="" className="w-full h-full object-cover" />
                : initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate leading-tight">{user?.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${meta.dot} animate-pulse`} />
                <span className="text-white/60 text-xs">{meta.label}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {groups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest px-3 mb-1.5">
                  {group.label}
                </p>
              )}
              {group.items.map(item => (
                <NavItem
                  key={item.path}
                  item={item}
                  active={location.pathname === item.path}
                  roleGradient={meta.gradient}
                />
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4 border-t border-white/10 pt-3">
          <div className="flex items-center gap-2 px-3 py-1.5 mb-2">
            <Zap size={11} className="text-white/30" />
            <span className="text-white/30 text-[10px]">Firebase • TensorFlow.js</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <LogOut size={16} />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 max-w-full transition-all duration-300 ${sidebarOpen ? 'lg:pl-[16rem]' : 'lg:pl-0'}`}>
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 h-16" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center gap-2 h-full px-3 sm:gap-3 sm:px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <Menu size={20} />
            </button>
            <button
              onClick={() => setSidebarOpen(prev => !prev)}
              className="hidden lg:inline-flex w-9 h-9 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
              aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-gray-900 text-sm truncate">
                {currentItem?.label || 'SmartAttend'}
              </h2>
              <p className="text-gray-400 text-xs hidden sm:block">
                {greeting}, {user?.name?.split(' ')[0]}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <NotificationBell />

              {/* Avatar */}
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-white text-sm font-bold overflow-hidden`}>
                {user?.profile_photo
                  ? <img src={user.profile_photo} alt="" className="w-full h-full object-cover" />
                  : initial}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 min-w-0 overflow-y-auto mt-16 p-3 sm:p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
