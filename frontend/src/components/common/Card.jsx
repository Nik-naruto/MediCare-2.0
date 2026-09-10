import React from 'react';

export const Card = ({
  children,
  title,
  subtitle,
  action,
  className = '',
  headerClassName = '',
  bodyClassName = '',
}) => {
  return (
    <div className={`bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.03)] overflow-hidden transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 ${className}`}>
      {(title || action) && (
        <div className={`flex items-center justify-between px-6 py-4 border-b border-slate-100/80 dark:border-slate-800/80 ${headerClassName}`}>
          <div>
            {title && <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={`p-6 ${bodyClassName}`}>{children}</div>
    </div>
  );
};

