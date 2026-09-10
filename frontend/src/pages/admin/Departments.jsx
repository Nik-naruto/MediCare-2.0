import React, { useState, useEffect, useCallback } from 'react';
import { Building2, PlusCircle, AlertCircle, RotateCcw, X, Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { useToast } from '../../context/ToastContext';

export const DepartmentManagement = () => {
  const { addToast } = useToast();
  const [departments, setDepartments] = useState([]);
  const [candidateDoctors, setCandidateDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Pagination, Search & Sort States
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Metadata headers state
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    description: '',
    headDoctorId: '',
  });

  // Debounce search input (~300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchDepartments = useCallback(async () => {
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

      const deptRes = await apiClient.get('/departments/', { params });
      const rawDepts = Array.isArray(deptRes.data) ? deptRes.data : [];

      // Parse pagination headers
      const headers = deptRes.headers || {};
      const total = parseInt(headers['x-total-count'] || '0', 10);
      const pages = parseInt(headers['x-total-pages'] || '1', 10);

      setTotalCount(isNaN(total) ? rawDepts.length : total);
      setTotalPages(isNaN(pages) || pages < 1 ? 1 : pages);

      // Fetch accurate doctor count per department from backend DB header counts
      const doctorCountPromises = rawDepts.map(async (d) => {
        try {
          const countRes = await apiClient.get('/doctors/', {
            params: { department_id: d.id, page: 1, page_size: 1 },
          });
          const cnt = parseInt(countRes.headers?.['x-total-count'] || '0', 10);
          return { deptId: d.id, count: cnt };
        } catch (e) {
          return { deptId: d.id, count: 0 };
        }
      });

      const countResults = await Promise.all(doctorCountPromises);
      const docCountMap = {};
      countResults.forEach((r) => {
        docCountMap[r.deptId] = r.count;
      });

      // Fetch head doctor profile details for department rows
      const headDocIds = rawDepts.map((d) => d.head_doctor_id).filter(Boolean);
      const headDocMap = {};

      if (headDocIds.length > 0) {
        const headDocPromises = headDocIds.map(async (docId) => {
          try {
            const docRes = await apiClient.get(`/doctors/${docId}`);
            if (docRes.data) {
              headDocMap[docId] = docRes.data.user?.full_name || `Dr. #${docId}`;
            }
          } catch (e) {
            headDocMap[docId] = '--';
          }
        });
        await Promise.all(headDocPromises);
      }

      const mapped = rawDepts.map((d) => ({
        id: d.id,
        name: d.name,
        location: d.location || 'N/A',
        description: d.description || '',
        headDoctorId: d.head_doctor_id,
        headDoctor: d.head_doctor_id && headDocMap[d.head_doctor_id] ? headDocMap[d.head_doctor_id] : '--',
        totalDoctors: docCountMap[d.id] || 0,
      }));

      setDepartments(mapped);
    } catch (err) {
      const detail = err.detail || err.message || 'Failed to load department records.';
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to connect to server.');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, debouncedSearch, sortBy, sortOrder]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // Load candidate doctors for select dropdown when modal opens
  const fetchCandidateDoctors = async () => {
    setIsLoadingDoctors(true);
    try {
      const response = await apiClient.get('/doctors/', { params: { page: 1, page_size: 100 } });
      const raw = Array.isArray(response.data) ? response.data : [];
      setCandidateDoctors(raw);
    } catch (e) {
      setCandidateDoctors([]);
    } finally {
      setIsLoadingDoctors(false);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    fetchCandidateDoctors();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSortBy('name');
    setSortOrder('asc');
    setPage(1);
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!formData.name.trim()) {
      addToast('Please enter department name', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        location: formData.location.trim() || null,
        description: formData.description.trim() || null,
        head_doctor_id: formData.headDoctorId ? parseInt(formData.headDoctorId, 10) : null,
      };

      await apiClient.post('/departments/', payload);

      addToast('Department created successfully.', 'success');
      setIsModalOpen(false);
      setFormData({
        name: '',
        location: '',
        description: '',
        headDoctorId: '',
      });
      await fetchDepartments();
    } catch (err) {
      const detail = err.detail || err.message;
      let msg = 'Failed to create department.';
      if (err.status === 409 || (typeof detail === 'string' && detail.toLowerCase().includes('already exists'))) {
        msg = 'Department with this name already exists.';
      } else if (typeof detail === 'string') {
        msg = detail;
      }
      addToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Department Name & ID',
      key: 'name',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block">{row.name}</span>
          <span className="text-xs text-slate-500">ID: {row.id} &bull; {row.location}</span>
        </div>
      ),
    },
    {
      header: 'Head of Department',
      key: 'headDoctor',
      render: (row) => <span className="font-semibold text-slate-800">{row.headDoctor}</span>,
    },
    {
      header: 'Total Staff Doctors',
      key: 'totalDoctors',
      render: (row) => <Badge variant="slate">{row.totalDoctors} Doctors</Badge>,
    },
  ];

  const hasActiveFilters = Boolean(
    searchTerm.trim() || sortBy !== 'name' || sortOrder !== 'asc'
  );

  const startItemIndex = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItemIndex = totalCount > 0 ? Math.min(page * pageSize, totalCount) : 0;

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Clinical Department Setup</h1>
            {totalCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-teal-100 text-teal-700 border border-teal-200">
                {totalCount} Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Configure medical departments, clinical heads, and campus locations</p>
        </div>
        <Button variant="primary" icon={PlusCircle} onClick={handleOpenModal}>
          Add Department
        </Button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
          <Button size="sm" variant="outline" icon={RotateCcw} onClick={fetchDepartments}>
            Retry
          </Button>
        </div>
      )}

      {/* Control Bar */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <Input
            icon={Search}
            placeholder="Search department name or description..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
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
              { label: 'Department Name', value: 'name' },
              { label: 'Department ID', value: 'id' },
              { label: 'Creation Date', value: 'created_at' },
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
              { label: 'Ascending (A-Z)', value: 'asc' },
              { label: 'Descending (Z-A)', value: 'desc' },
            ]}
          />

          {/* Reset Button Column */}
          <div className="flex items-center">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                icon={RotateCcw}
                onClick={handleResetFilters}
                className="w-full justify-center text-xs text-rose-600 hover:text-rose-700 border-rose-200"
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>

        {/* Filter Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Showing {startItemIndex} - {endItemIndex} of {totalCount} clinical departments
            </span>
          </div>
        </div>
      </div>

      {/* Main Table */}
      {!isLoading && departments.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">
            {hasActiveFilters ? 'No departments match your search criteria.' : 'No departments found.'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {hasActiveFilters ? 'Try adjusting your search terms or filters.' : 'Clinical departments will appear here.'}
          </p>
        </div>
      ) : (
        <Table columns={columns} data={departments} isLoading={isLoading} />
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
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
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

      {/* Add Department Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-100 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-600" />
                <h3 className="text-lg font-bold text-slate-900">Add Clinical Department</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDepartment} className="space-y-4">
              <Input
                label="Department Name"
                required
                placeholder="e.g. Cardiology"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />

              <Input
                label="Campus Location"
                placeholder="e.g. Building A, Floor 2"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />

              <Input
                label="Description"
                placeholder="e.g. Heart and vascular care"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />

              <Select
                label="Head of Department (Optional)"
                disabled={isLoadingDoctors}
                options={[
                  { label: 'None / Select Head Doctor', value: '' },
                  ...candidateDoctors.map((doc) => ({
                    label: doc.user?.full_name || doc.name || `Dr. #${doc.id}`,
                    value: String(doc.id),
                  })),
                ]}
                placeholder={isLoadingDoctors ? 'Loading doctors list...' : 'Select Head Doctor'}
                value={formData.headDoctorId}
                onChange={(e) => setFormData({ ...formData, headDoctorId: e.target.value })}
              />

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
                  Save Department
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


