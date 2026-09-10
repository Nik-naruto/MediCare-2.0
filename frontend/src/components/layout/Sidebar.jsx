import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Activity,
  LayoutDashboard,
  Calendar,
  PlusCircle,
  FileText,
  Pill,
  TestTube,
  CreditCard,
  User,
  Users,
  Stethoscope,
  Clock,
  UserCheck,
  Building2,
  BarChart3,
  ShieldAlert,
  Settings,
  LogOut,
  Bell,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getMediaUrl } from '../../utils/media';

export const Sidebar = ({ isMobileOpen = false, onClose = () => {} }) => {
  const { role, logout, currentUser } = useAuth();
  const activeRole = role || 'Patient';

  // Role specific menu configs
  const menuConfig = {
    Patient: [
      { label: 'Dashboard', path: '/patient/dashboard', icon: LayoutDashboard },
      { label: 'Appointments', path: '/patient/appointments', icon: Calendar },
      { label: 'Book Appointment', path: '/patient/book-appointment', icon: PlusCircle },
      { label: 'Medical Records', path: '/patient/medical-records', icon: FileText },
      { label: 'Prescriptions', path: '/patient/prescriptions', icon: Pill },
      { label: 'Lab Reports', path: '/patient/lab-reports', icon: TestTube },
      { label: 'Invoices & Bills', path: '/patient/invoices', icon: CreditCard },
      { label: 'Notifications', path: '/patient/notifications', icon: Bell },
    ],
    Doctor: [
      { label: 'Dashboard', path: '/doctor/dashboard', icon: LayoutDashboard },
      { label: 'Appointments', path: '/doctor/appointments', icon: Calendar },
      { label: 'Patients', path: '/doctor/patients', icon: Users },
      { label: 'Prescriptions', path: '/doctor/prescriptions', icon: Pill },
      { label: 'My Schedule', path: '/doctor/schedule', icon: Clock },
    ],
    Receptionist: [
      { label: 'Dashboard', path: '/receptionist/dashboard', icon: LayoutDashboard },
      { label: 'Appointments', path: '/receptionist/appointments', icon: Calendar },
      { label: 'Patients', path: '/receptionist/patients', icon: Users },
      { label: 'Check-In / Queue', path: '/receptionist/queue', icon: UserCheck },
      { label: 'Walk-in Register', path: '/receptionist/walk-in', icon: PlusCircle },
      { label: 'Billing Counter', path: '/receptionist/billing', icon: CreditCard },
    ],
    Admin: [
      { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'My Profile', path: '/admin/profile', icon: User },
      { label: 'Users', path: '/admin/users', icon: Users },
      { label: 'Doctors', path: '/admin/doctors', icon: Stethoscope },
      { label: 'Patients', path: '/admin/patients', icon: User },
      { label: 'Departments', path: '/admin/departments', icon: Building2 },
      { label: 'Appointments', path: '/admin/appointments', icon: Calendar },
      { label: 'Audit Logs', path: '/admin/audit-logs', icon: ShieldAlert },
      { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
      { label: 'System Settings', path: '/admin/settings', icon: Settings },
    ],
  };


  const navItems = menuConfig[activeRole] || menuConfig.Patient;

  const roleActiveBg = {
    Patient: 'bg-sky-600',
    Doctor: 'bg-teal-600',
    Receptionist: 'bg-amber-600',
    Admin: 'bg-purple-600',
  };

  const roleColors = {
    Patient: 'from-sky-600 to-sky-700',
    Doctor: 'from-teal-600 to-teal-700',
    Receptionist: 'from-amber-600 to-amber-700',
    Admin: 'from-purple-600 to-purple-700',
  };

  const activeBg = roleActiveBg[activeRole] || roleActiveBg.Patient;

  const handleLogout = () => {
    onClose();
    logout();
  };

  const getInitials = (name) => {
    if (!name) return 'MC';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const userInitials = getInitials(currentUser?.name || currentUser?.full_name || currentUser?.email);

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation Drawer */}
      <aside
        className={`fixed md:relative top-0 left-0 z-50 md:z-30 w-64 bg-slate-900 text-slate-300 flex flex-col h-screen shrink-0 border-r border-slate-800 transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <Link to="/" onClick={onClose} className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${roleColors[activeRole] || roleColors.Patient} flex items-center justify-center text-white font-bold shadow-md`}>
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-black text-white tracking-tight">MediCare 2.0</span>
              <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                {activeRole} Portal
              </span>
            </div>
          </Link>

          {/* Close button for mobile drawer */}
          <button
            onClick={onClose}
            className="md:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clickable Top User Profile Section */}
        <NavLink
          to={activeRole === 'Doctor' ? '/doctor/profile' : activeRole === 'Receptionist' ? '/receptionist/profile' : activeRole === 'Admin' ? '/admin/profile' : '/patient/profile'}
          onClick={onClose}
          aria-label="View user profile"
          className="px-5 py-3.5 bg-slate-850/50 hover:bg-slate-800/70 border-b border-slate-800 flex items-center gap-3 transition-colors cursor-pointer group focus:outline-none focus:ring-1 focus:ring-slate-700"
        >

          {(currentUser?.avatar || currentUser?.doctor_profile?.profile_photo_url || currentUser?.profile_photo_url) ? (
            <img
              src={currentUser.avatar || getMediaUrl(currentUser?.doctor_profile?.profile_photo_url || currentUser?.profile_photo_url)}
              alt={currentUser?.name || 'User Avatar'}
              className="w-9 h-9 rounded-xl object-cover border border-slate-700 shrink-0 group-hover:border-slate-500 transition-colors"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-sky-400 font-bold text-xs flex items-center justify-center border border-slate-700 shrink-0 shadow-xs group-hover:border-slate-500 transition-colors">
              {userInitials}
            </div>
          )}
          <div className="overflow-hidden flex-1 min-w-0">
            <span className="block text-xs font-bold text-white truncate group-hover:text-sky-300 transition-colors">
              {currentUser?.name || 'Logged User'}
            </span>
            <span className="block text-[10px] text-slate-400 truncate">
              {currentUser?.email}
            </span>
          </div>
        </NavLink>



        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-slate-500">
            Navigation Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800 text-white font-semibold shadow-2xs border border-slate-700/60'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>


        {/* Footer / Logout */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Exit {role} View</span>
          </button>
        </div>
      </aside>
    </>
  );
};

