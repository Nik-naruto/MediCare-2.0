import React from 'react';
import { Card } from '../common/Card';

export const StatCard = ({
  title,
  value,
  subtitle,
  change,
  changeType = 'positive',
  icon: Icon,
  variant = 'sky',
  onClick,
  className = '',
}) => {
  const variantStyles = {
    sky: {
      bg: 'bg-sky-50',
      text: 'text-sky-600',
    },
    teal: {
      bg: 'bg-teal-50',
      text: 'text-teal-600',
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-600',
    },
  };

  const style = variantStyles[variant] || variantStyles.sky;

  return (
    <Card
      onClick={onClick}
      className={`p-5 flex items-center gap-4 transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      } ${className}`}
    >
      {Icon && (
        <div className={`w-12 h-12 rounded-2xl ${style.bg} ${style.text} flex items-center justify-center font-bold shrink-0`}>
          <Icon className="w-6 h-6" />
        </div>
      )}
      <div className="flex-1 min-w-0 text-left">
        <span className="block text-2xl font-black text-slate-900 tracking-tight">{value}</span>
        <span className="text-xs text-slate-500 font-medium truncate block">{title}</span>
        {subtitle && <span className="text-[11px] text-slate-400 font-medium mt-0.5 block">{subtitle}</span>}
      </div>
      {change && (
        <span
          className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
            changeType === 'positive'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : changeType === 'negative'
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : 'bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          {change}
        </span>
      )}
    </Card>
  );
};
