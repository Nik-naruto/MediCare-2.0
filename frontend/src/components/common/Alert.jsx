import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export const Alert = ({ type = 'info', title, children, className = '' }) => {
  const styles = {
    info: 'bg-sky-50 text-sky-900 border-sky-200 icon-sky-600',
    success: 'bg-emerald-50 text-emerald-900 border-emerald-200 icon-emerald-600',
    warning: 'bg-amber-50 text-amber-900 border-amber-200 icon-amber-600',
    error: 'bg-rose-50 text-rose-900 border-rose-200 icon-rose-600',
  };

  const icons = {
    info: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    error: AlertCircle,
  };

  const Icon = icons[type] || Info;

  return (
    <div className={`flex gap-3 p-4 rounded-xl border text-sm ${styles[type]} ${className}`}>
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div>
        {title && <h5 className="font-bold mb-0.5">{title}</h5>}
        <div className="text-xs leading-relaxed opacity-90">{children}</div>
      </div>
    </div>
  );
};
