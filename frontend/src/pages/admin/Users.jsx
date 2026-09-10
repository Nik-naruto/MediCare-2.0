import React, { useState, useEffect } from 'react';
import { Users, PlusCircle, Key, AlertCircle, RotateCcw, X, Shield, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, UserCheck, UserX } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { useToast } from '../../context/ToastContext';

const mapUserData = (u) => {
  const name = u.full_name || u.email.split('@')[0];
  const role = u.role || 'Patient';
  const isActive = u.is_active !== false;

  return {
    id: u.id,
    name,
    email: u.email,
    phone: u.phone || '--',
    role,
    isActive,
    initial: name.charAt(0).toUpperCase(),
    created_at: u.created_at,
  };
};

export const UserManagement = () => {
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
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
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '', 'active', 'inactive'

  // Sorting State
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState('asc');

  // Status Action Loading State
  const [actionUserId, setActionUserId] = useState(null);

  // Create User Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'Patient',
  });

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchUsers = async () => {
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
      if (roleFilter) {
        params.role = roleFilter;
      }
      if (statusFilter === 'active') {
        params.is_active = true;
      } else if (statusFilter === 'inactive') {
        params.is_active = false;
      }

      const response = await apiClient.get('/users/', { params });
      const rawUsers = Array.isArray(response.data) ? response.data : [];
      setUsers(rawUsers.map(mapUserData));

      // Parse pagination headers
      const headers = response.headers || {};
      const countHeader = parseInt(headers['x-total-count'], 10);
      const totalPagesHeader = parseInt(headers['x-total-pages'], 10);

      setTotalCount(!isNaN(countHeader) ? countHeader : rawUsers.length);
      setTotalPages(!isNaN(totalPagesHeader) ? totalPagesHeader : 1);
    } catch (err) {
      const detail = err.response?.data?.detail || err.detail || err.message || 'Failed to load system user accounts.';
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, pageSize, debouncedSearch, roleFilter, statusFilter, sortBy, sortOrder]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setRoleFilter('');
    setStatusFilter('');
    setSortBy('id');
    setSortOrder('asc');
    setPage(1);
  };

  const handleToggleStatus = async (user) => {
    setActionUserId(user.id);
    const newStatus = !user.isActive;

    try {
      await apiClient.put(`/users/${user.id}/status`, { is_active: newStatus });
      addToast(`User ${user.name} ${newStatus ? 'activated' : 'deactivated'} successfully.`, 'success');
      await fetchUsers();
    } catch (err) {
      const detail = err.response?.data?.detail || err.detail || err.message || 'Failed to update user status.';
      addToast(typeof detail === 'string' ? detail : 'Status change failed.', 'error');
    } finally {
      setActionUserId(null);
    }
  };

  const handleResetPass = (name) => {
    addToast(`Password reset for ${name} requires user self-service or profile account settings.`, 'info');
  };

  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fullName.trim() || !formData.email.trim() || !formData.password.trim()) {
      addToast('Please fill in all required fields (Name, Email, Password)', 'error');
      return;
    }

    if (formData.password.length < 6) {
      addToast('Password must be at least 6 characters long', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/users/', {
        email: formData.email.trim(),
        password: formData.password,
        full_name: formData.fullName.trim(),
        phone: formData.phone.trim() || null,
        role: formData.role,
        is_active: true,
      });

      addToast('User account created successfully.', 'success');
      setIsModalOpen(false);
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        role: 'Patient',
      });
      await fetchUsers();
    } catch (err) {
      const detail = err.response?.data?.detail || err.detail || err.message || 'Failed to create user account.';
      const msg = typeof detail === 'string' ? detail : 'Account creation failed.';
      addToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Account Identity',
      key: 'name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
            {row.initial}
          </span>
          <div>
            <span className="font-bold text-slate-900 block">{row.name}</span>
            <span className="text-xs text-slate-500">{row.email}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Phone',
      key: 'phone',
      render: (row) => <span className="text-xs text-slate-600 font-medium">{row.phone}</span>,
    },
    {
      header: 'Assigned Role',
      key: 'role',
      render: (row) => <Badge status={row.role} />,
    },
    {
      header: 'Account Status',
      key: 'status',
      render: (row) => (
        <Badge variant={row.isActive ? 'emerald' : 'rose'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={row.isActive ? UserX : UserCheck}
            onClick={() => handleToggleStatus(row)}
            isLoading={actionUserId === row.id}
          >
            {row.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button size="sm" variant="outline" icon={Key} onClick={() => handleResetPass(row.name)}>
            Reset Password
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Account Management</h1>
          <p className="text-xs text-slate-500">Manage credentials, roles, and status controls across all user accounts</p>
        </div>
        <Button variant="primary" icon={PlusCircle} onClick={() => setIsModalOpen(true)}>
          Create User Account
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
              placeholder="Search name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
          >
            <option value="">All Roles</option>
            <option value="Patient">Patient</option>
            <option value="Doctor">Doctor</option>
            <option value="Receptionist">Receptionist</option>
            <option value="Admin">Admin</option>
          </select>

          {/* Active Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {/* Sort By */}
          <div className="flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="id">Sort by ID</option>
              <option value="full_name">Sort by Name</option>
              <option value="email">Sort by Email</option>
              <option value="role">Sort by Role</option>
              <option value="is_active">Sort by Status</option>
              <option value="created_at">Sort by Created</option>
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
          {(searchTerm || roleFilter || statusFilter || sortBy !== 'id' || sortOrder !== 'asc') && (
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
          <Button size="sm" variant="outline" icon={RotateCcw} onClick={fetchUsers}>
            Retry
          </Button>
        </div>
      )}

      {/* Table & Empty State */}
      {!isLoading && users.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No matching users found.</p>
          <p className="text-xs text-slate-500 mt-1">Try resetting your search or role filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Table columns={columns} data={users} isLoading={isLoading} />

          {/* Pagination Footer Controls */}
          {!isLoading && totalCount > 0 && (
            <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-500">
                Showing <strong className="text-slate-800">{(page - 1) * pageSize + 1}</strong> to{' '}
                <strong className="text-slate-800">{Math.min(page * pageSize, totalCount)}</strong> of{' '}
                <strong className="text-slate-800">{totalCount}</strong> user accounts
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

      {/* Create User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-100 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">Create New System Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              <Input
                label="Full Name"
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

              <Select
                label="Assigned System Role"
                options={['Patient', 'Doctor', 'Receptionist', 'Admin']}
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
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
                  Create Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
