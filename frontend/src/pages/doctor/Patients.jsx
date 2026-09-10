import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Eye,
  AlertCircle,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
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

const normalizeAllergies = (allergies) => {
  if (!allergies) return ['No Known Allergies'];
  if (Array.isArray(allergies)) return allergies.length > 0 ? allergies : ['No Known Allergies'];
  if (typeof allergies === 'string') {
    const trimmed = allergies.trim();
    if (!trimmed || trimmed.toLowerCase() === 'none' || trimmed.toLowerCase() === 'nil') {
      return ['No Known Allergies'];
    }
    return trimmed.split(',').map((a) => a.trim()).filter(Boolean);
  }
  return ['No Known Allergies'];
};

const mapPatientData = (p) => {
  const name = p.user?.full_name || `Patient #${p.id}`;
  const email = p.user?.email || 'N/A';
  const phone = p.user?.phone || 'N/A';
  const gender = p.gender || 'N/A';
  const calculatedAge = calculateAge(p.date_of_birth);
  const ageDisplay = calculatedAge !== null ? `${calculatedAge} Yrs` : 'Age N/A';
  const bloodGroup = p.blood_group || 'N/A';
  const allergies = normalizeAllergies(p.allergies);
  const avatar = p.avatar_url || null;

  return {
    id: p.id,
    name,
    email,
    phone,
    gender,
    ageDisplay,
    bloodGroup,
    allergies,
    avatar,
  };
};

export const DoctorPatients = () => {
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Pagination, Search, Filter & Sort States
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [genderFilter, setGenderFilter] = useState('');
  const [bloodFilter, setBloodFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState('desc');

  // Metadata headers state
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchConnectedPatients = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const params = {
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      if (genderFilter) {
        params.gender = genderFilter;
      }

      if (bloodFilter.trim()) {
        params.blood_group = bloodFilter.trim();
      }

      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      const response = await apiClient.get('/patients/', { params });
      const rawList = Array.isArray(response.data) ? response.data : [];
      const mapped = rawList.map(mapPatientData);

      setPatients(mapped);

      // Parse pagination headers from response
      const headers = response.headers || {};
      const total = parseInt(headers['x-total-count'] || '0', 10);
      const pages = parseInt(headers['x-total-pages'] || '1', 10);

      setTotalCount(isNaN(total) ? mapped.length : total);
      setTotalPages(isNaN(pages) || pages < 1 ? 1 : pages);
    } catch (err) {
      const detail = err.detail || err.message || 'Failed to load connected patients list.';
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to connect to server.');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, genderFilter, bloodFilter, debouncedSearch, sortBy, sortOrder]);

  useEffect(() => {
    fetchConnectedPatients();
  }, [fetchConnectedPatients]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setGenderFilter('');
    setBloodFilter('');
    setSortBy('id');
    setSortOrder('desc');
    setPage(1);
  };

  const columns = [
    {
      header: 'Patient Details',
      key: 'name',
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.avatar ? (
            <img src={row.avatar} alt={row.name} className="w-9 h-9 rounded-xl object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {row.name?.charAt(0)?.toUpperCase() || 'P'}
            </div>
          )}
          <div>
            <span className="font-bold text-slate-900 block">{row.name}</span>
            <span className="text-xs text-slate-500">
              {row.gender}, {row.ageDisplay} &bull; {row.bloodGroup}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Contact Info',
      key: 'phone',
      render: (row) => (
        <div>
          <span className="text-xs font-semibold text-slate-800 block">{row.phone}</span>
          <span className="text-xs text-slate-500">{row.email}</span>
        </div>
      ),
    },
    {
      header: 'Known Allergies',
      key: 'allergies',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.allergies.map((alg, i) => (
            <Badge key={i} variant={alg === 'No Known Allergies' ? 'slate' : 'rose'}>
              {alg}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <Link to={`/doctor/patients/${row.id}`}>
          <Button size="sm" variant="outline" icon={Eye}>
            View Chart
          </Button>
        </Link>
      ),
    },
  ];

  const hasActiveFilters = Boolean(
    searchTerm.trim() || genderFilter || bloodFilter.trim() || sortBy !== 'id' || sortOrder !== 'desc'
  );

  const startItemIndex = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItemIndex = totalCount > 0 ? Math.min(page * pageSize, totalCount) : 0;

  return (
    <div className="space-y-6 text-left">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Patient Directory & EHR Charts
            </h1>
            {totalCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-teal-100 text-teal-700 border border-teal-200">
                {totalCount} Total
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Access historical medical charts, vitals, and diagnostic histories
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
          <Button size="sm" variant="outline" icon={RotateCcw} onClick={fetchConnectedPatients}>
            Retry
          </Button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <Input
            icon={Search}
            placeholder="Search name, email, or phone..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />

          {/* Gender Filter */}
          <Select
            placeholder="All Genders"
            value={genderFilter}
            onChange={(e) => {
              setGenderFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { label: 'Male', value: 'Male' },
              { label: 'Female', value: 'Female' },
              { label: 'Other', value: 'Other' },
            ]}
          />

          {/* Blood Group Filter */}
          <Select
            placeholder="All Blood Groups"
            value={bloodFilter}
            onChange={(e) => {
              setBloodFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { label: 'O+', value: 'O+' },
              { label: 'O-', value: 'O-' },
              { label: 'A+', value: 'A+' },
              { label: 'A-', value: 'A-' },
              { label: 'B+', value: 'B+' },
              { label: 'B-', value: 'B-' },
              { label: 'AB+', value: 'AB+' },
              { label: 'AB-', value: 'AB-' },
            ]}
          />

          {/* Sort By */}
          <Select
            placeholder="Sort Field"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            options={[
              { label: 'Patient ID', value: 'id' },
              { label: 'Registration Date', value: 'created_at' },
              { label: 'Date of Birth', value: 'date_of_birth' },
              { label: 'Gender', value: 'gender' },
            ]}
          />

          {/* Sort Direction */}
          <Select
            placeholder="Sort Direction"
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value);
              setPage(1);
            }}
            options={[
              { label: 'Newest First (Desc)', value: 'desc' },
              { label: 'Oldest First (Asc)', value: 'asc' },
            ]}
          />
        </div>

        {/* Filter Summary & Clear Option */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Showing {startItemIndex} - {endItemIndex} of {totalCount} records
            </span>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      {!isLoading && patients.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No connected patients found.</p>
          <p className="text-xs text-slate-500 mt-1">
            Patients with active consultation appointments will appear here.
          </p>
        </div>
      ) : (
        <Table columns={columns} data={patients} isLoading={isLoading} />
      )}

      {/* Pagination Footer */}
      {!isLoading && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600">
              Page {page} of {totalPages}
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                icon={ChevronLeft}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1 || isLoading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={ChevronRight}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages || isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
