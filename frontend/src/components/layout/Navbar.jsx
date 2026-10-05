import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Search, ArrowRight, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { ThemeToggle } from '../common/ThemeToggle';
import { SearchModal } from '../common/SearchModal';

export const Navbar = () => {
  const location = useLocation();
  const { role, currentUser, isAuthenticated } = useAuth();
  const activeRole = role || 'Patient';
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Auto-close mobile menu when changing location
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { label: 'Home', path: '/', sectionId: 'home' },
    { label: 'About', path: '/about', sectionId: 'about' },
    { label: 'Doctors', path: '/doctors', sectionId: 'doctors' },
    { label: 'Services', path: '/services', sectionId: 'services' },
    { label: 'Contact', path: '/contact', sectionId: 'contact' },
  ];

  const handleNavClick = (e, link) => {
    if (location.pathname === '/' && link.sectionId) {
      e.preventDefault();
      if (link.sectionId === 'home') {
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        window.history.pushState(null, '', '/');
      } else {
        const el = document.getElementById(link.sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          window.history.pushState(null, '', `/#${link.sectionId}`);
        }
      }
    }
  };

  const getInitials = (nameStr) => {
    if (!nameStr) return 'U';
    const parts = nameStr.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return nameStr.slice(0, 2).toUpperCase();
  };

  const userDisplayName = currentUser?.name || currentUser?.full_name || currentUser?.email || 'My Account';
  const initials = getInitials(currentUser?.name || currentUser?.full_name || currentUser?.email);
  const profilePath = `/${activeRole.toLowerCase()}/profile`;

  return (
    <header className="sticky top-0 z-40 bg-[#FBF9F4]/90 dark:bg-[#0C0E12]/90 backdrop-blur-md border-b border-[#E8E3D8] dark:border-slate-800/80 transition-colors">
      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 lg:h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group">
          {/* Custom Sine Wave / Pulse Icon */}
          <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-slate-900 dark:text-slate-100">
            <svg className="w-7 h-7 sm:w-8 sm:h-8 stroke-current fill-none stroke-[2.5]" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h4l2.5-6 3.5 12 3-8 2 4h5" />
            </svg>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">MediCare</span>
              <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">2.0</span>
            </div>
            <span className="hidden sm:block font-mono text-[9px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 -mt-0.5 font-medium">
              Healthcare, Simplified
            </span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={(e) => handleNavClick(e, link)}
                className={`relative py-1 text-xs font-medium transition-all ${
                  isActive
                    ? 'text-slate-900 dark:text-slate-100 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {link.label}
                {isActive && (
                  <div className="absolute -bottom-1 left-0 right-0 flex flex-col items-center">
                    <span className="w-full h-[1.5px] bg-slate-900 dark:bg-slate-100 rounded-full"></span>
                    <span className="w-1 h-1 rounded-full bg-slate-900 dark:bg-slate-100 mt-0.5"></span>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search Icon Button */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Search MediCare directory"
            title="Search doctors, departments, specialties"
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Search Modal */}
          <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

          {/* Theme Toggle */}
          <ThemeToggle size="md" />

          {!isAuthenticated ? (
            <>
              <Link to="/login" className="hidden sm:inline-flex">
                <Button variant="outline" size="sm" className="px-4 py-2 text-xs">
                  Sign In
                </Button>
              </Link>
              <Link to="/patient/book-appointment" className="hidden sm:inline-flex shrink-0">
                <Button variant="primary" size="sm" icon={ArrowRight} iconPosition="right" className="px-4 py-2 text-xs shadow-xs whitespace-nowrap">
                  Book Appointment
                </Button>
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to={profilePath}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 border border-slate-200/70 dark:border-slate-700 transition-all group"
                aria-label={`View ${userDisplayName} Profile`}
              >
                {currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={userDisplayName}
                    className="w-6 h-6 rounded-full object-cover border border-slate-300 dark:border-slate-600 shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                    {initials}
                  </div>
                )}
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate max-w-[80px] xs:max-w-[100px] sm:max-w-[140px]">
                  {userDisplayName}
                </span>
              </Link>

              <Link to={`/${activeRole.toLowerCase()}/dashboard`}>
                <Button variant="primary" size="sm" className="hidden md:inline-flex px-4 py-2 text-xs">
                  {activeRole} Portal
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Navigation Toggle (Hamburger) */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            title={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            className="lg:hidden w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-[#E8E3D8] dark:border-slate-800/80 bg-[#FBF9F4] dark:bg-[#0C0E12] px-4 py-5 space-y-4 animate-fade-in shadow-lg">
          {/* Navigation Links */}
          <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={(e) => {
                    handleNavClick(e, link);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors flex items-center justify-between ${
                    isActive
                      ? 'bg-slate-200/70 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <span>{link.label}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-slate-100" />}
                </Link>
              );
            })}
          </nav>

          {/* Mobile Actions / Buttons */}
          <div className="pt-3 border-t border-[#E8E3D8] dark:border-slate-800/80 flex flex-col gap-2.5">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full"
                >
                  <Button variant="outline" size="sm" className="w-full py-2.5 text-xs justify-center">
                    Sign In
                  </Button>
                </Link>
                <Link
                  to="/patient/book-appointment"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full"
                >
                  <Button variant="primary" size="sm" icon={ArrowRight} iconPosition="right" className="w-full py-2.5 text-xs justify-center shadow-xs">
                    Book Appointment
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link
                  to={profilePath}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium"
                >
                  {currentUser?.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={userDisplayName}
                      className="w-7 h-7 rounded-full object-cover border border-slate-300 dark:border-slate-600 shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                      {initials}
                    </div>
                  )}
                  <div className="flex-1 truncate">
                    <span className="block font-bold truncate">{userDisplayName}</span>
                    <span className="text-[10px] text-slate-500 capitalize">{activeRole} Profile</span>
                  </div>
                </Link>
                <Link
                  to={`/${activeRole.toLowerCase()}/dashboard`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full"
                >
                  <Button variant="primary" size="sm" className="w-full py-2.5 text-xs justify-center shadow-xs">
                    Open {activeRole} Portal
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
