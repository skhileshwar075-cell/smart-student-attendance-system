import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Monitor, RefreshCw, Smartphone, Tablet, ExternalLink } from 'lucide-react';

const DEVICES = [
  { key: 'small', label: 'Small Mobile', width: 320, height: 640, icon: Smartphone },
  { key: 'mobile', label: 'Mobile', width: 375, height: 720, icon: Smartphone },
  { key: 'tablet', label: 'Tablet', width: 768, height: 900, icon: Tablet },
  { key: 'desktop', label: 'Desktop', width: 1024, height: 768, icon: Monitor },
];

const QUICK_PATHS = [
  { label: 'Login', path: '/login' },
  { label: 'Admin Dashboard', path: '/admin' },
  { label: 'Students', path: '/admin/students' },
  { label: 'Teachers', path: '/admin/teachers' },
  { label: 'Classes', path: '/admin/classes' },
  { label: 'Subjects', path: '/admin/subjects' },
  { label: 'Reports', path: '/admin/reports' },
  { label: 'Analytics', path: '/admin/attendance-analytics' },
  { label: 'Notifications', path: '/admin/notifications' },
];

function normalizePath(value) {
  const trimmed = value.trim();
  if (!trimmed) return '/login';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export default function DevicePreview() {
  const [deviceKey, setDeviceKey] = useState('mobile');
  const [path, setPath] = useState('/login');
  const [draftPath, setDraftPath] = useState('/login');
  const [frameKey, setFrameKey] = useState(0);
  const [scale, setScale] = useState(1);
  const previewRef = useRef(null);

  const device = useMemo(
    () => DEVICES.find(item => item.key === deviceKey) || DEVICES[1],
    [deviceKey]
  );

  useEffect(() => {
    const updateScale = () => {
      const width = previewRef.current?.clientWidth || device.width;
      setScale(Math.min(1, Math.max(0.35, (width - 24) / device.width)));
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [device.width]);

  const frameSrc = `${path}${path.includes('?') ? '&' : '?'}devicePreview=1`;

  const applyPath = (nextPath = draftPath) => {
    const clean = normalizePath(nextPath);
    setDraftPath(clean);
    setPath(clean);
    setFrameKey(key => key + 1);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="attendance-card space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Device Preview</h2>
            <p className="text-sm text-gray-500">
              Check pages at common mobile, tablet, and desktop sizes.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {DEVICES.map(item => {
              const Icon = item.icon;
              const active = item.key === deviceKey;
              return (
                <button
                  key={item.key}
                  onClick={() => setDeviceKey(item.key)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                    active
                      ? 'border-purple-600 bg-purple-600 text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={14} />
                  <span>{item.label}</span>
                  <span className={active ? 'text-white/70' : 'text-gray-400'}>
                    {item.width}px
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <label className="label">Preview Route</label>
            <div className="flex gap-2">
              <input
                value={draftPath}
                onChange={e => setDraftPath(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyPath()}
                className="input-field min-w-0 flex-1"
                placeholder="/admin/students"
              />
              <button onClick={() => applyPath()} className="btn-primary shrink-0">
                Load
              </button>
              <button
                onClick={() => setFrameKey(key => key + 1)}
                className="btn-secondary shrink-0 px-3"
                title="Refresh preview"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          <a
            href={path}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary self-end"
          >
            <ExternalLink size={15} />
            Open Page
          </a>
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_PATHS.map(item => (
            <button
              key={item.path}
              onClick={() => applyPath(item.path)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                path === item.path
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="attendance-card">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800">{device.label}</p>
            <p className="text-xs text-gray-400">
              {device.width} × {device.height}px viewport, scaled to fit this screen
            </p>
          </div>
          <p className="text-xs font-medium text-gray-400">{Math.round(scale * 100)}% scale</p>
        </div>

        <div ref={previewRef} className="overflow-auto rounded-2xl bg-slate-900 p-3">
          <div
            className="mx-auto origin-top overflow-hidden rounded-[1.5rem] bg-white shadow-2xl ring-4 ring-slate-700"
            style={{
              width: device.width,
              height: device.height,
              transform: `scale(${scale})`,
              marginBottom: `${device.height * (scale - 1)}px`,
            }}
          >
            <iframe
              key={`${frameKey}-${device.key}`}
              src={frameSrc}
              title={`${device.label} preview`}
              className="h-full w-full border-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}