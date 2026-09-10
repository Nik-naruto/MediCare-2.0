import React from 'react';
import { ChevronDown } from 'lucide-react';

export const Select = ({
  label,
  options = [],
  error,
  required = false,
  placeholder = 'Select an option',
  className = '',
  id,
  disabled,
  ...props
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1.5 w-full text-left">
      {label && (
        <label htmlFor={selectId} className="font-mono text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative w-full flex items-center">
        <select
          id={selectId}
          disabled={disabled}
          className={`w-full appearance-none rounded-xl border bg-white dark:bg-slate-900/90 pl-3.5 pr-9 py-2.5 text-xs text-slate-900 dark:text-slate-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400/40 text-ellipsis overflow-hidden whitespace-nowrap ${
            disabled ? 'opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-800' : 'cursor-pointer'
          } ${
            error
              ? 'border-rose-300 dark:border-rose-700'
              : 'border-slate-200/80 dark:border-slate-800/80 focus:border-slate-400'
          } ${className}`}
          {...props}
        >
          {placeholder && <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">{placeholder}</option>}
          {options.map((opt) => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const lbl = typeof opt === 'object' ? opt.label : opt;
            return (
              <option key={val} value={val} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                {lbl}
              </option>
            );
          })}
        </select>
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 flex items-center justify-center">
          <ChevronDown className="w-4 h-4 shrink-0" />
        </div>
      </div>
      {error && <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</span>}
    </div>
  );
};
