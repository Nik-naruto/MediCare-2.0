import React, { useState, useEffect } from 'react';
import { Stethoscope, PlusCircle, Building2, AlertCircle, RotateCcw, X, Shield, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { useToast } from '../../context/ToastContext';

import { DoctorAvatar } from '../../components/common/DoctorAvatar';

const mapDoctorData = (d, deptMap) => {
  const name = d.user?.full_name || d.name || `Doctor #${d.id}`;
  const deptName = d.department_id && deptMap[d.department_id] ? deptMap[d.department_id] : null;
  const specialty = d.specialty || d.specialization || deptName || '--';
  const qualification = d.qualification || '--';
  const consultationFee = Number(d.consultation_fee || d.consultationFee) || 0;
  const roomNo = d.room_no || d.roomNo || '--';
  const isAvailable = d.is_available !== false;

  return {
    id: d.id,
    rawId: d.id,
    userId: d.user_id,
    name,
    specialty,
    qualification,
    consultationFee,
    roomNo,
    isAvailable,
    status: isAvailable ? 'Available' : 'Unavailable',
    initial: name.replace(/^Dr\.\s*/i, '').charAt(0).toUpperCase() || 'D',
    profilePhotoUrl: d.profile_photo_url || d.profilePhotoUrl || d.user?.profile_photo_url || null,
    departmentId: d.department_id,
    deptName,
  };
};

export const DoctorManagement = () => {
  const { addToast } = useToast();
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
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
  const [deptFilter, setDeptFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState(''); // '', 'available', 'unavailable'

  // Sorting State
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState('asc');

  // Toggle Loading State
  const [togglingId, setTogglingId] = useState(null);

  // Onboard Doctor Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    specialty: 'Cardiology',
    qualification: 'MBBS, MD',
    experienceYears: '5',
    consultationFee: '800',
    roomNo: '101',
    departmentId: '',
  });

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchDoctorData = async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      const [docsRes, deptsRes] = await Promise.all([
        apiClient.get('/doctors/', {
          params: {
            page,
            page_size: pageSize,
            sort_by: sortBy,
            sort_order: sortOrder,
            ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
            ...(deptFilter && { department_id: Number(deptFilter) }),
            ...(availabilityFilter === 'available' && { is_available: true }),
            ...(availabilityFilter === 'unavailable' && { is_available: false }),
          },
        }),
        apiClient.get('/departments/'),
      ]);

      const rawDocs = Array.isArray(docsRes.data) ? docsRes.data : [];
      const rawDepts = Array.isArray(deptsRes.data) ? deptsRes.data : [];

      setDepartments(rawDepts);

      const deptMap = {};
      rawDepts.forEach((dept) => {
        deptMap[dept.id] = dept.name;
      });

      const mapped = rawDocs.map((d) => mapDoctorData(d, deptMap));
      setDoctors(mapped);

      // Parse pagination headers
      const headers = docsRes.headers || {};
      const countHeader = parseInt(headers['x-total-count'], 10);
      const totalPagesHeader = parseInt(headers['x-total-pages'], 10);

      setTotalCount(!isNaN(countHeader) ? countHeader : rawDocs.length);
      setTotalPages(!isNaN(totalPagesHeader) ? totalPagesHeader : 1);

      if (rawDepts.length > 0 && !formData.departmentId) {
        setFormData((prev) => ({ ...prev, departmentId: String(rawDepts[0].id) }));
      }
    } catch (err) {
      const detail = err.response?.data?.detail || err.detail || err.message || 'Failed to load specialist doctors roster.';
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorData();
  }, [page, pageSize, debouncedSearch, deptFilter, availabilityFilter, sortBy, sortOrder]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setDeptFilter('');
    setAvailabilityFilter('');
    setSortBy('id');
    setSortOrder('asc');
    setPage(1);
  };

  const handleToggleAvailability = async (doc) => {
    setTogglingId(doc.id);
    const newStatus = !doc.isAvailable;

    try {
      await apiClient.put(`/doctors/${doc.id}`, { is_available: newStatus });
      addToast(`Doctor ${doc.name} status updated to ${newStatus ? 'Available' : 'Unavailable'}.`, 'success');
      await fetchDoctorData();
    } catch (err) {
      const detail = err.response?.data?.detail || err.detail || err.message || 'Failed to update availability.';
      addToast(typeof detail === 'string' ? detail : 'Failed to update availability.', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleOnboardSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fullName.trim() || !formData.email.trim() || !formData.password.trim()) {
      addToast('Please fill in all required account fields (Name, Email, Password)', 'error');
      return;
    }

    if (formData.password.length < 6) {
      addToast('Password must be at least 6 characters long', 'error');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    let createdUser = null;
    try {
      // 1. Create Doctor User Account
      const userRes = await apiClient.post('/users/', {
        email: formData.email.trim(),
        password: formData.password,
        full_name: formData.fullName.trim(),
        phone: formData.phone.trim() || null,
        role: 'Doctor',
        is_active: true,
      });

      createdUser = userRes.data;

      // 2. Create Doctor Profile Entry
      const deptId = parseInt(formData.departmentId, 10) || (departments[0]?.id || 1);

      await apiClient.post('/doctors/', {
        user_id: createdUser.id,
        qualification: formData.qualification.trim() || 'MBBS',
        specialty: formData.specialty.trim() || 'General Medicine',
        experience_years: parseInt(formData.experienceYears, 10) || 0,
        consultation_fee: parseFloat(formData.consultationFee) || 500,
        room_no: formData.roomNo.trim() || '101',
        department_id: deptId,
        is_available: true,
      });

      addToast('Doctor onboarded successfully.', 'success');
      setIsModalOpen(false);
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        specialty: 'Cardiology',
        qualification: 'MBBS, MD',
        experienceYears: '5',
        consultationFee: '800',
        roomNo: '101',
        departmentId: departments[0] ? String(departments[0].id) : '',
      });
      await fetchDoctorData();
    } catch (err) {
      if (createdUser) {
        addToast('Doctor account created, but doctor profile could not be created.', 'error');
      } else {
        const detail = err.response?.data?.detail || err.detail || err.message || 'Failed to onboard doctor.';
        const msg = typeof detail === 'string' ? detail : 'Doctor onboarding failed.';
        addToast(msg, 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Specialist Name',
      key: 'name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <DoctorAvatar
            src={row.profilePhotoUrl}
            name={row.name}
            size="sm"
            fallbackVariant="teal"
          />
          <div>
            <span className="font-bold text-slate-900 block">{row.name}</span>
            <span className="text-xs text-sky-600 font-semibold">{row.specialty}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Qualification',
      key: 'qualification',
      render: (row) => <span className="text-xs font-medium text-slate-800">{row.qualification}</span>,
    },
    {
      header: 'Fee & Room',
      key: 'consultationFee',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block">₹{row.consultationFee}</span>
          <span className="text-xs text-slate-500">Room {row.roomNo}</span>
        </div>
      ),
    },
    {
      header: 'Current Status',
      key: 'status',
      render: (row) => <Badge status={row.status} />,
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <Button
          size="sm"
          variant="outline"
          icon={row.isAvailable ? XCircle : CheckCircle2}
          onClick={() => handleToggleAvailability(row)}
          isLoading={togglingId === row.id}
        >
          {row.isAvailable ? 'Mark Unavailable' : 'Mark Available'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Doctor Specialist Onboarding</h1>
          <p className="text-xs text-slate-500">Register new doctors, assign department rooms and consultation fees</p>
        </div>
        <Button variant="primary" icon={PlusCircle} onClick={() => setIsModalOpen(true)}>
          Onboard New Doctor
        </Button>
      </div>

      {/* Filter & Controls Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[220px] flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search doctor name, specialty, or qualification..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none max-w-[180px] truncate"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Availability Filter */}
          <select
            value={availabilityFilter}
            onChange={(e) => { setAvailabilityFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="available">Available Only</option>
            <option value="unavailable">Unavailable Only</option>
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
              <option value="specialty">Sort by Specialty</option>
              <option value="consultation_fee">Sort by Fee</option>
              <option value="experience_years">Sort by Experience</option>
              <option value="is_available">Sort by Status</option>
              <option value="created_at">Sort by Date</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-2 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>
          </div>

          {/* Reset Button */}
          {(searchTerm || deptFilter || availabilityFilter || sortBy !== 'id' || sortOrder !== 'asc') && (
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
          <Button size="sm" variant="outline" icon={RotateCcw} onClick={fetchDoctorData}>
            Retry
          </Button>
        </div>
      )}

      {/* Table & Empty State */}
      {!isLoading && doctors.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <Stethoscope className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No doctors found.</p>
          <p className="text-xs text-slate-500 mt-1">Try resetting your search or department filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Table columns={columns} data={doctors} isLoading={isLoading} />

          {/* Pagination Footer */}
          {!isLoading && totalCount > 0 && (
            <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-500">
                Showing <strong className="text-slate-800">{(page - 1) * pageSize + 1}</strong> to{' '}
                <strong className="text-slate-800">{Math.min(page * pageSize, totalCount)}</strong> of{' '}
                <strong className="text-slate-800">{totalCount}</strong> specialist doctors
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

      {/* Onboard New Doctor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-100 text-left max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-teal-600" />
                <h3 className="text-lg font-bold text-slate-900">Onboard New Specialist Doctor</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOnboardSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Doctor Full Name"
                  required
                  placeholder="e.g. Dr. Ananya Sen"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
                <Input
                  label="Email Address"
                  type="email"
                  required
                  placeholder="ananya@medicare.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Phone Number"
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
                <Input
                  label="Initial Password"
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Specialty"
                  required
                  placeholder="e.g. Cardiology"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                />
                <Input
                  label="Qualification"
                  required
                  placeholder="e.g. MBBS, MD"
                  value={formData.qualification}
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Experience (Yrs)"
                  type="number"
                  value={formData.experienceYears}
                  onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                />
                <Input
                  label="Fee (₹)"
                  type="number"
                  value={formData.consultationFee}
                  onChange={(e) => setFormData({ ...formData, consultationFee: e.target.value })}
                />
                <Input
                  label="Room No"
                  placeholder="102"
                  value={formData.roomNo}
                  onChange={(e) => setFormData({ ...formData, roomNo: e.target.value })}
                />
              </div>

              {departments.length > 0 && (
                <Select
                  label="Department"
                  options={departments.map((dept) => ({
                    label: dept.name,
                    value: String(dept.id),
                  }))}
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                />
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting}>
                  Complete Onboarding
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
