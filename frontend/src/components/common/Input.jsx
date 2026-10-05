import React from 'react';

export const Input = ({
  label,
  error,
  helperText,
  icon: Icon,
  endIcon,
  endAction,
  required = false,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1.5 w-full text-left">
      {label && (
        <label htmlFor={inputId} className="font-mono text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          id={inputId}
          className={`w-full rounded-xl border bg-white dark:bg-slate-900/90 px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400/40 ${
            Icon ? 'pl-10' : ''
          } ${
            (endIcon || endAction) ? 'pr-10' : ''
          } ${
            error
              ? 'border-rose-300 dark:border-rose-700'
              : 'border-slate-200/80 dark:border-slate-800/80 focus:border-slate-400'
          } ${className}`}
          {...props}
        />
        {(endIcon || endAction) && (
          <div className="absolute right-3.5 flex items-center">
            {endAction || (endIcon && React.createElement(endIcon, { className: 'w-4 h-4 text-slate-400' }))}
          </div>
        )}
      </div>
      {error && <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</span>}
      {helperText && !error && <span className="text-xs text-slate-500 dark:text-slate-400">{helperText}</span>}
    </div>
  );
};

