import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Stethoscope, Building2, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { apiClient } from '../../api/client';

export const SearchModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setDoctors([]);
      setDepartments([]);
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
    }
  }, [isOpen]);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch search results from backend APIs with debouncing
  useEffect(() => {
    if (!query.trim()) {
      setDoctors([]);
      setDepartments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const [docsRes, deptsRes] = await Promise.all([
          apiClient.get(`/doctors/?search=${encodeURIComponent(query)}&page_size=6`).catch(() => ({ data: [] })),
          apiClient.get('/departments/').catch(() => ({ data: [] })),
        ]);

        const rawDocs = Array.isArray(docsRes.data) ? docsRes.data : [];
        const rawDepts = Array.isArray(deptsRes.data) ? deptsRes.data : [];

        // Filter departments client-side by query
        const qLower = query.toLowerCase();
        const filteredDepts = rawDepts.filter(
          (d) => d.name?.toLowerCase().includes(qLower) || d.description?.toLowerCase().includes(qLower)
        );

        setDoctors(rawDocs);
        setDepartments(filteredDepts);
      } catch (err) {
        console.error('Failed searching MediCare directory:', err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const handleSelectDoctor = (doc) => {
    onClose();
    const docName = doc.user?.full_name || doc.name || `Dr. #${doc.id}`;
    navigate(`/doctors?search=${encodeURIComponent(docName)}`);
  };

  const handleSelectDepartment = (deptName) => {
    onClose();
    navigate(`/doctors?search=${encodeURIComponent(deptName)}`);
  };

  const handleQuickTagClick = (tag) => {
    setQuery(tag);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onClose();
      navigate(`/doctors?search=${encodeURIComponent(query.trim())}`);
    }
  };

  const quickTags = ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Dermatology', 'General Medicine'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden transition-all text-left flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="MediCare Global Search"
      >
        {/* Top Search Input Header */}
        <form onSubmit={handleSubmit} className="relative p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search doctors, specialties, departments..."
            className="w-full bg-transparent text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
          />
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400 shrink-0" />}
          {query && !isLoading && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </form>

        {/* Search Results / Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Quick Filter Tags when search input is empty */}
          {!query.trim() && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Popular Specialties & Departments
              </div>
              <div className="flex flex-wrap gap-2">
                {quickTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleQuickTagClick(tag)}
                    className="px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-900 hover:text-white dark:hover:bg-slate-100 dark:hover:text-slate-900 text-xs font-medium transition-all cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Department Matches */}
          {departments.length > 0 && (
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-2.5 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" /> Departments ({departments.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {departments.map((dept) => (
                  <div
                    key={dept.id}
                    onClick={() => handleSelectDepartment(dept.name)}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-sky-600 transition-colors">
                        {dept.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 font-sans mt-0.5">
                        {dept.description || 'Specialized clinical care'}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Doctor Matches */}
          {doctors.length > 0 && (
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-2.5 flex items-center gap-2">
                <Stethoscope className="w-3.5 h-3.5" /> Specialists ({doctors.length})
              </h3>
              <div className="space-y-2">
                {doctors.map((doc) => {
                  const name = doc.user?.full_name || doc.name || `Dr. #${doc.id}`;
                  const specialty = doc.specialty || doc.specialization || 'General Medicine';
                  return (
                    <div
                      key={doc.id}
                      onClick={() => handleSelectDoctor(doc)}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs flex items-center justify-center shrink-0 font-mono">
                          {name.replace(/^Dr\.\s*/i, '').charAt(0) || 'D'}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-sky-600 transition-colors">
                            {name}
                          </h4>
                          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            {specialty} {doc.qualification ? `· ${doc.qualification}` : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                          ₹{doc.consultation_fee || doc.consultationFee || 500}
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No Results Fallback */}
          {query.trim() && !isLoading && doctors.length === 0 && departments.length === 0 && (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <p className="text-sm font-medium">No direct matches found for "{query}"</p>
              <p className="text-xs mt-1 text-slate-400">Press Enter or click below to search full doctor directory.</p>
              <button
                type="button"
                onClick={handleSubmit}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-all cursor-pointer"
              >
                Search Directory for "{query}" <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        {query.trim() && (doctors.length > 0 || departments.length > 0) && (
          <div className="p-3 px-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">ESC</kbd> to exit</span>
            <button
              type="button"
              onClick={handleSubmit}
              className="text-xs font-semibold text-slate-900 dark:text-slate-100 hover:underline flex items-center gap-1"
            >
              View all results in Doctor Directory <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
