import React, { useState, useEffect } from 'react';
import { Users, AlertCircle, RotateCcw, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

const calculateAge = (dobString) => {
  if (!dobString) return null;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
};

const mapPatientData = (p) => {
  const name = p.user?.full_name || p.name || p.user?.name || `Patient #${p.id}`;
  const phone = p.user?.phone || p.emergency_contact || p.phone || '--';
  const rawGender = p.gender || '--';
  const gender = typeof rawGender === 'string' && rawGender.length > 0 && rawGender !== '--'
    ? rawGender.charAt(0).toUpperCase() + rawGender.slice(1).toLowerCase()
    : '--';
  const ageVal = calculateAge(p.date_of_birth);
  const ageStr = ageVal !== null ? `${ageVal} Yrs` : '--';
  const bloodGroup = p.blood_group || '--';
  const registeredDate = p.created_at
    ? String(p.created_at).split('T')[0]
    : '--';

  let allergiesDisplay = null;
  if (p.allergies) {
    if (Array.isArray(p.allergies)) {
      allergiesDisplay = p.allergies.length > 0 ? p.allergies.join(', ') : null;
    } else if (typeof p.allergies === 'string') {
      const trimmed = p.allergies.trim();
      allergiesDisplay = trimmed.length > 0 ? trimmed : null;
    }
  }

  const cleanName = name.replace(/^Patient\s*#/i, '');
  const initial = cleanName.charAt(0).toUpperCase() || 'P';

  return {
    id: p.id,
    name,
    avatar: p.avatar || null,
    initial,
    registeredDate,
    gender,
    age: ageStr,
    bloodGroup,
    phone,
    allergies: allergiesDisplay,
  };
};

export const PatientRegistry = () => {
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('');

  // Sorting State
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState('desc');

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchPatients = async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      const params = {
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }
      if (genderFilter) {
        params.gender = genderFilter;
      }
      if (bloodGroupFilter) {
        params.blood_group = bloodGroupFilter;
      }

      const response = await apiClient.get('/patients/', { params });
      const rawList = Array.isArray(response.data) ? response.data : [];
      setPatients(rawList.map(mapPatientData));

      // Parse pagination headers
      const headers = response.headers || {};
      const countHeader = parseInt(headers['x-total-count'], 10);
      const totalPagesHeader = parseInt(headers['x-total-pages'], 10);

      setTotalCount(!isNaN(countHeader) ? countHeader : rawList.length);
      setTotalPages(!isNaN(totalPagesHeader) ? totalPagesHeader : 1);
    } catch (err) {
      const detail = err.response?.data?.detail || err.detail || err.message || 'Failed to load master patient registry.';
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [page, pageSize, debouncedSearch, genderFilter, bloodGroupFilter, sortBy, sortOrder]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setGenderFilter('');
    setBloodGroupFilter('');
    setSortBy('id');
    setSortOrder('desc');
    setPage(1);
  };

  const columns = [
    {
      header: 'Patient Identity',
      key: 'name',
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.avatar ? (
            <img src={row.avatar} alt={row.name} className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <span className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0">
              {row.initial}
            </span>
          )}
          <div>
            <span className="font-bold text-slate-900 block">{row.name}</span>
            <span className="text-xs text-slate-500">ID: {row.id} &bull; Reg: {row.registeredDate}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Demographics',
      key: 'gender',
      render: (row) => (
        <span className="text-xs text-slate-700 font-medium">
          {row.gender}, {row.age} &bull; {row.bloodGroup}
        </span>
      ),
    },
    {
      header: 'Contact Info',
      key: 'phone',
      render: (row) => <span className="text-xs font-semibold text-slate-800">{row.phone}</span>,
    },
    {
      header: 'Allergies',
      key: 'allergies',
      render: (row) => (
        row.allergies ? (
          <Badge variant="rose">{row.allergies}</Badge>
        ) : (
          <span className="text-xs text-slate-400">None</span>
        )
      ),
    },
  ];

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Master Patient Database Registry</h1>
          <p className="text-xs text-slate-500">Central database registry of all registered hospital patients</p>
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[220px] flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search patient name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          {/* Gender Filter */}
          <select
            value={genderFilter}
            onChange={(e) => { setGenderFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
          >
            <option value="">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>

          {/* Blood Group Filter */}
          <select
            value={bloodGroupFilter}
            onChange={(e) => { setBloodGroupFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
          >
            <option value="">All Blood Groups</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>

          {/* Sort Controls */}
          <div className="flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="id">Sort by ID</option>
              <option value="created_at">Sort by Reg Date</option>
              <option value="date_of_birth">Sort by DOB</option>
              <option value="gender">Sort by Gender</option>
              <option value="blood_group">Sort by Blood Group</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-2 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>

          {/* Reset Button */}
          {(searchTerm || genderFilter || bloodGroupFilter || sortBy !== 'id' || sortOrder !== 'desc') && (
            <Button size="sm" variant="outline" icon={RotateCcw} onClick={handleResetFilters}>
              Reset Filters
            </Button>
          )}
        </div>

        {/* Page Size Selector */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="px-2 py-1 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
          <Button size="sm" variant="outline" icon={RotateCcw} onClick={fetchPatients}>
            Retry
          </Button>
        </div>
      )}

      {/* Table & Empty State */}
      {!isLoading && patients.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No patients found.</p>
          <p className="text-xs text-slate-500 mt-1">Try resetting your search or demographic filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Table columns={columns} data={patients} isLoading={isLoading} />

          {/* Pagination Footer */}
          {!isLoading && totalCount > 0 && (
            <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-500">
                Showing <strong className="text-slate-800">{(page - 1) * pageSize + 1}</strong> to{' '}
                <strong className="text-slate-800">{Math.min(page * pageSize, totalCount)}</strong> of{' '}
                <strong className="text-slate-800">{totalCount}</strong> master patient records
              </span>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  icon={ChevronLeft}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <span className="px-2 font-semibold text-slate-700">
                  Page {page} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  icon={ChevronRight}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
