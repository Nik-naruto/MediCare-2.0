import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const ThemeToggle = ({ className = '', size = 'md' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const buttonSizes = {
    sm: 'p-1.5 rounded-lg',
    md: 'p-2 rounded-xl',
    lg: 'p-2.5 rounded-xl',
  };

  const iconSize = iconSizes[size] || iconSizes.md;
  const buttonSize = buttonSizes[size] || buttonSizes.md;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={`${buttonSize} transition-all duration-200 flex items-center justify-center cursor-pointer border ${
        isDark
          ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700 shadow-xs'
          : 'bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200 shadow-xs'
      } ${className}`}
    >
      {isDark ? (
        <Sun className={`${iconSize} shrink-0 transition-transform duration-300 rotate-0 hover:rotate-45`} />
      ) : (
        <Moon className={`${iconSize} shrink-0 transition-transform duration-300 rotate-0 hover:-rotate-12`} />
      )}
    </button>
  );
};
