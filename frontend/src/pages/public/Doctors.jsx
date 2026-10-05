import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Calendar, Star, Stethoscope, AlertCircle, RotateCcw, ArrowLeft, ArrowRight } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

import { DoctorAvatar } from '../../components/common/DoctorAvatar';

const mapDoctor = (d, deptMap = {}) => {
  const name = d.user?.full_name || d.name || `Dr. #${d.id}`;
  const resolvedDept = d.department_id ? deptMap[d.department_id] : null;
  const specialty = d.specialty || resolvedDept || 'General Medicine';
  const qualification = d.qualification || 'MBBS';
  const experienceYears = d.experience_years ?? d.experienceYears ?? 0;
  const consultationFee = Number(d.consultation_fee ?? d.consultationFee) || 0;
  const roomNo = d.room_no || d.roomNo || 'N/A';
  const bio = d.bio || 'Experienced medical specialist providing compassionate healthcare services.';
  const isAvailable = d.is_available ?? true;
  const rating = d.rating || '4.9';
  const reviewsCount = d.reviewsCount || 120;
  const cleanName = name.replace(/^Dr\.\s*/i, '');
  const initial = cleanName.charAt(0).toUpperCase() || 'D';
  const profilePhotoUrl = d.profile_photo_url || d.profilePhotoUrl || d.avatar || null;

  return {
    id: d.id,
    name,
    specialty,
    departmentName: resolvedDept || specialty,
    qualification,
    experienceYears,
    consultationFee,
    roomNo,
    bio,
    isAvailable,
    rating,
    reviewsCount,
    avatar: profilePhotoUrl,
    profilePhotoUrl,
    initial,
  };
};

export const Doctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');

  // Sorting State
  const [sortOption, setSortOption] = useState('');

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // 1. Fetch departments list on mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await apiClient.get('/departments/');
        setDepartments(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to load departments directory', err);
      }
    };
    fetchDepartments();
  }, []);

  // 2. Debounce search term (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 3. Main backend fetch function
  const fetchDoctors = async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('page_size', pageSize);

      if (debouncedSearch.trim()) {
        params.append('search', debouncedSearch.trim());
      }
      if (selectedDept) {
        params.append('department_id', selectedDept);
      }
      if (availabilityFilter) {
        params.append('is_available', availabilityFilter);
      }

      // Handle safe sorting options
      if (sortOption) {
        const [sortBy, sortOrder] = sortOption.split(':');
        if (sortBy) {
          params.append('sort_by', sortBy);
          params.append('sort_order', sortOrder || 'desc');
        }
      }

      const response = await apiClient.get(`/doctors/?${params.toString()}`);
      const rawDocs = Array.isArray(response.data) ? response.data : [];

      const deptMap = {};
      departments.forEach((d) => {
        deptMap[d.id] = d.name;
      });

      const mapped = rawDocs.map((doc) => mapDoctor(doc, deptMap));
      setDoctors(mapped);

      // Parse pagination response headers cleanly
      const countHeader = response.headers.get
        ? response.headers.get('x-total-count') || response.headers.get('X-Total-Count')
        : (response.headers['x-total-count'] || response.headers['X-Total-Count']);
      const pagesHeader = response.headers.get
        ? response.headers.get('x-total-pages') || response.headers.get('X-Total-Pages')
        : (response.headers['x-total-pages'] || response.headers['X-Total-Pages']);

      const parsedCount = countHeader !== undefined && countHeader !== null ? parseInt(countHeader, 10) : rawDocs.length;
      const parsedPages = pagesHeader !== undefined && pagesHeader !== null ? parseInt(pagesHeader, 10) : 1;

      setTotalCount(isNaN(parsedCount) ? rawDocs.length : parsedCount);
      setTotalPages(isNaN(parsedPages) ? 1 : Math.max(1, parsedPages));
    } catch (err) {
      const detail = err.detail || err.message || 'Failed to load specialist directory.';
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to connect to server.');
      setDoctors([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Re-fetch when dependencies change
  useEffect(() => {
    fetchDoctors();
  }, [page, pageSize, debouncedSearch, selectedDept, availabilityFilter, sortOption, departments.length]);

  const handleReset = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedDept('');
    setAvailabilityFilter('');
    setSortOption('');
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8 text-left">
      <div>
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 font-medium block mb-1">
          MEDICAL STAFF DIRECTORY
        </span>
        <h1 className="text-2xl sm:text-3xl font-light text-slate-900 dark:text-slate-100 tracking-tight">Doctors Directory</h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-sans">
          Browse qualifications, consultation fees, and real-time availability of our medical staff.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>{errorMsg}</span>
          </div>
          <Button size="sm" variant="outline" icon={RotateCcw} onClick={fetchDoctors}>
            Retry
          </Button>
        </div>
      )}

      {/* Filter & Control Bar */}
      <div className="bg-white dark:bg-slate-900/90 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.03)] space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
          <Input
            placeholder="Search by name, specialty..."
            icon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <Select
            options={departments.map((d) => ({ label: d.name, value: String(d.id) }))}
            placeholder="All Clinical Departments"
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setPage(1);
            }}
          />

          <Select
            options={[
              { label: 'All Availability', value: '' },
              { label: 'Available Now Only', value: 'true' },
            ]}
            placeholder="Filter Availability"
            value={availabilityFilter}
            onChange={(e) => {
              setAvailabilityFilter(e.target.value);
              setPage(1);
            }}
          />

          <Select
            options={[
              { label: 'Default Order', value: '' },
              { label: 'Fee: Low to High', value: 'consultation_fee:asc' },
              { label: 'Fee: High to Low', value: 'consultation_fee:desc' },
              { label: 'Experience: High to Low', value: 'experience_years:desc' },
              { label: 'Specialty (A-Z)', value: 'specialty:asc' },
              { label: 'Newest Added', value: 'created_at:desc' },
            ]}
            placeholder="Sort Specialists"
            value={sortOption}
            onChange={(e) => {
              setSortOption(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-mono text-slate-500 dark:text-slate-400">
          <span>
            Found <strong className="text-slate-900 dark:text-slate-100 font-sans">{totalCount}</strong> medical specialists
          </span>
          {(searchTerm || selectedDept || availabilityFilter || sortOption) && (
            <Button size="sm" variant="outline" icon={RotateCcw} onClick={handleReset} className="font-mono text-xs">
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Grid view */}
      {isLoading ? (
        <LoadingSpinner label="Loading specialist directory..." />
      ) : doctors.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <Stethoscope className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No doctors match your filters.</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Try resetting your search query or department selections.</p>
          <div className="mt-4">
            <Button size="sm" variant="outline" icon={RotateCcw} onClick={handleReset}>
              Reset All Filters
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {doctors.map((doc) => (
            <Card key={doc.id} className="p-0 overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <Link to={`/doctors/${doc.id}`} className="block relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                <DoctorAvatar
                  src={doc.profilePhotoUrl}
                  name={doc.name}
                  size="w-full h-48 sm:h-56 rounded-none text-4xl"
                  fallbackVariant="teal"
                  className="group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                  <Badge variant={doc.isAvailable ? 'emerald' : 'rose'} className="font-mono">
                    {doc.isAvailable ? 'Available Today' : 'Unavailable'}
                  </Badge>
                </div>
              </Link>
              <div className="p-5">
                <Link to={`/doctors/${doc.id}`} className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{doc.name}</h3>
                </Link>
                <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
                  {doc.specialty} &bull; Room {doc.roomNo}
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{doc.bio}</p>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Department:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{doc.departmentName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Qualification:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">{doc.qualification}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Experience:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">{doc.experienceYears} Years</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-500 dark:text-slate-400">Consultation Fee:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">₹{doc.consultationFee}</span>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Link to={`/doctors/${doc.id}`} className="w-full block">
                    <Button variant="secondary" size="sm" className="w-full text-xs">
                      View Profile
                    </Button>
                  </Link>
                  <Link to={`/patient/book-appointment?doctor_id=${doc.id}`} className="w-full block">
                    <Button variant="primary" size="sm" className="w-full text-xs" icon={Calendar}>
                      Book Now
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {!isLoading && doctors.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200/80 dark:border-slate-800 text-xs font-mono text-slate-600 dark:text-slate-400">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span>Show per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={60}>60</option>
            </select>
            <span className="text-slate-400">
              Showing {doctors.length} of {totalCount} specialists
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              icon={ArrowLeft}
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="text-xs font-mono"
            >
              Previous
            </Button>
            <span className="font-mono text-slate-800 dark:text-slate-200 px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              icon={ArrowRight}
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="text-xs font-mono"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};


