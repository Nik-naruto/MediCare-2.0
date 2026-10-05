import React from 'react';

export const DashboardHeader = ({
  title,
  subtitle,
  badgeText,
  action,
  icon: Icon,
  variant = 'sky',
}) => {
  const variantGradients = {
    sky: 'from-sky-600 to-teal-600',
    teal: 'from-teal-700 to-sky-700',
    amber: 'from-amber-600 to-amber-700',
    purple: 'from-purple-900 to-indigo-900',
  };

  const gradient = variantGradients[variant] || variantGradients.sky;

  return (
    <div className={`rounded-2xl sm:rounded-3xl bg-gradient-to-r ${gradient} p-5 sm:p-6 lg:p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 shadow-md text-left`}>
      <div className="space-y-1 w-full md:w-auto">
        {badgeText && (
          <span className="inline-block px-2.5 sm:px-3 py-1 rounded-full bg-white/10 text-[11px] sm:text-xs font-semibold text-white/90 mb-1 max-w-full truncate">
            {badgeText}
          </span>
        )}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {Icon && (
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
          )}
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">{title}</h1>
        </div>
        {subtitle && <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">{subtitle}</p>}
      </div>

      {action && <div className="shrink-0 w-full md:w-auto [&>button]:w-full md:[&>button]:w-auto [&>a]:w-full md:[&>a]:w-auto">{action}</div>}
    </div>
  );
};
