import React from 'react';
import { EmptyState } from './EmptyState';
import { LoadingSpinner } from './LoadingSpinner';

export const Table = ({
  columns = [],
  data = [],
  isLoading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items matching your criteria.',
}) => {
  if (isLoading) {
    return <LoadingSpinner label="Fetching records..." />;
  }

  if (!data || data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/70 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.03)]">
      <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 border-collapse">
        <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-200/70 dark:border-slate-800">
          <tr>
            {columns.map((col, idx) => (
              <th key={col.key || idx} className={`px-5 py-3.5 whitespace-nowrap min-w-max ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {data.map((row, rowIdx) => (
            <tr key={row.id || rowIdx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
              {columns.map((col, colIdx) => (
                <td key={col.key || colIdx} className={`px-5 py-3.5 whitespace-nowrap min-w-max ${col.cellClassName || ''}`}>
                  {col.render ? col.render(row, rowIdx) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
