import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Calendar, Stethoscope, User, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const MobileBottomNav = ({ onMenuClick }) => {
  const location = useLocation();
  const { role, isAuthenticated } = useAuth();
  const activeRole = role || 'Patient';

  const appointmentPath = isAuthenticated
    ? `/${activeRole.toLowerCase()}/appointments`
    : '/patient/book-appointment';

  const portalPath = isAuthenticated
    ? `/${activeRole.toLowerCase()}/dashboard`
    : '/login';

  const portalLabel = isAuthenticated
    ? `${activeRole}`
    : 'Account';

  const isPortalActive = isAuthenticated
    ? location.pathname.startsWith(`/${activeRole.toLowerCase()}`)
    : location.pathname === '/login' || location.pathname === '/register';

  const isAppointmentsActive =
    location.pathname.includes('/appointments') || location.pathname.includes('/book-appointment');
  const isDoctorsActive = location.pathname.startsWith('/doctors');
  const isHomeActive = location.pathname === '/';

  const navItems = [
    {
      label: 'Home',
      path: '/',
      icon: Home,
      isActive: isHomeActive,
    },
    {
      label: 'Doctors',
      path: '/doctors',
      icon: Stethoscope,
      isActive: isDoctorsActive,
    },
    {
      label: 'Appointments',
      path: appointmentPath,
      icon: Calendar,
      isActive: isAppointmentsActive,
    },
    {
      label: portalLabel,
      path: portalPath,
      icon: isAuthenticated ? LayoutDashboard : User,
      isActive: isPortalActive,
    },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FBF9F4]/95 dark:bg-[#0C0E12]/95 backdrop-blur-lg border-t border-[#E8E3D8] dark:border-slate-800/80 transition-colors shadow-lg"
      aria-label="Mobile Navigation"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-200 ${
                item.isActive
                  ? 'text-sky-600 dark:text-sky-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <div
                className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-transform ${
                  item.isActive ? 'bg-sky-50 dark:bg-sky-950/70 scale-105' : ''
                }`}
              >
                <Icon className={`w-5 h-5 ${item.isActive ? 'stroke-[2.2]' : 'stroke-[1.75]'}`} />
                {item.isActive && (
                  <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-sky-600 dark:bg-sky-400" />
                )}
              </div>
              <span className="text-[10px] tracking-tight leading-none mt-1 truncate max-w-[68px]">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
