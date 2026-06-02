import React from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';

export default function Toast({ message, type = 'success' }) {
  return (
    <div className={`fixed top-4 right-4 z-50 inline-flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl shadow-lg ${type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
      {type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
      <span>{message}</span>
    </div>
  );
}
