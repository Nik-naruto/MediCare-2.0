import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ label = 'Loading healthcare data...', size = 'md' }) => {
  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <Loader2 className={`${sizes[size]} text-sky-600 animate-spin mb-3`} />
      {label && <p className="text-sm font-medium text-slate-500">{label}</p>}
    </div>
  );
};
