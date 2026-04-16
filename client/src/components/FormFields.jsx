import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

const baseIconClass =
  'absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none flex-shrink-0';

const toggleClass =
  'absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30';

export function InputField({
  icon: Icon,
  as: Component = 'input',
  className = '',
  inputClassName = '',
  children,
  ...props
}) {
  return (
    <div className={`relative min-w-0 w-full ${className}`}>
      {Icon && <Icon size={18} className={baseIconClass} />}
      <Component
        className={`input-field w-full ${Icon ? '!pl-10' : ''} ${inputClassName}`}
        {...props}
      >
        {children}
      </Component>
    </div>
  );
}

export function PasswordField({
  icon: Icon,
  visible,
  onToggleVisible,
  className = '',
  inputClassName = '',
  toggleLabel = 'Toggle password visibility',
  ...props
}) {
  return (
    <div className={`relative min-w-0 w-full ${className}`}>
      {Icon && <Icon size={18} className={baseIconClass} />}
      <input
        type={visible ? 'text' : 'password'}
        className={`input-field w-full ${Icon ? '!pl-10' : ''} !pr-11 ${inputClassName}`}
        {...props}
      />
      <button
        type="button"
        onClick={onToggleVisible}
        className={toggleClass}
        aria-label={toggleLabel}
        tabIndex={-1}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
