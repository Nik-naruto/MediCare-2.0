import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle,
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
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { formatTime } from '../../utils/formatters';

export const PatientAppointments = () => {
  const { addToast } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAptId, setSelectedAptId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Pagination, Filtering, Search & Sorting States
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('appointment_date');
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

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      const params = {
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      if (statusFilter) {
        params.status = statusFilter;
      }

      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      const response = await apiClient.get('/appointments/', { params });

      const data = Array.isArray(response.data) ? response.data : [];
      setAppointments(data);

      // Parse pagination headers from response
      const headers = response.headers || {};
      const total = parseInt(headers['x-total-count'] || '0', 10);
      const pages = parseInt(headers['x-total-pages'] || '1', 10);

      setTotalCount(isNaN(total) ? data.length : total);
      setTotalPages(isNaN(pages) || pages < 1 ? 1 : pages);
    } catch (err) {
      const detail = err.detail || err.message || 'Failed to load appointments.';
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to connect to backend.');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, statusFilter, debouncedSearch, sortBy, sortOrder]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('');
    setSortBy('appointment_date');
    setSortOrder('desc');
    setPage(1);
  };

  const handleCancelConfirm = async () => {
    if (!selectedAptId) return;
    try {
      await apiClient.delete(`/appointments/${selectedAptId}`);
      addToast('Appointment cancelled successfully', 'success');

      // Re-fetch appointments after cancellation
      await fetchAppointments();
    } catch (err) {
      const detail = err.detail || err.message || 'Failed to cancel appointment.';
      addToast(typeof detail === 'string' ? detail : 'Cancellation failed.', 'error');
    } finally {
      setSelectedAptId(null);
    }
  };

  const columns = [
    {
      header: 'Doctor & Specialty',
      key: 'doctorName',
      render: (row) => {
        const doctorName = row.doctor?.user?.full_name || row.doctorName || `Doctor #${row.doctor_id}`;
        const specialty = row.doctor?.specialization || row.doctor?.specialty || row.specialty || 'General Medicine';
        const roomNo = row.doctor?.room_no || row.roomNo || '101';
        return (
          <div>
            <span className="font-bold text-slate-900 dark:text-slate-100 block">{doctorName}</span>
            <span className="text-xs text-sky-600 dark:text-sky-400">{specialty} &bull; Room {roomNo}</span>
          </div>
        );
      },
    },
    {
      header: 'Date & Time',
      key: 'appointmentDate',
      render: (row) => {
        const dateStr = row.appointment_date || row.appointmentDate;
        const timeStr = row.start_time || row.appointmentTime;
        return (
          <div>
            <span className="font-bold text-slate-900 dark:text-slate-100 block">{dateStr}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{formatTime(timeStr)}</span>
          </div>
        );
      },
    },
    {
      header: 'Reason',
      key: 'reason',
      render: (row) => <span className="text-xs text-slate-600 dark:text-slate-300 max-w-xs block truncate">{row.reason || 'Consultation'}</span>,
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => <Badge status={row.status} />,
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => {
        const isCancellable = row.status === 'Scheduled' || row.status === 'SCHEDULED' || row.status === 'CONFIRMED';
        return isCancellable ? (
          <Button variant="danger" size="sm" onClick={() => setSelectedAptId(row.id)}>
            Cancel Slot
          </Button>
        ) : (
          <span className="text-xs text-slate-400 dark:text-slate-500">N/A</span>
        );
      },
    },
  ];

  const hasActiveFilters = Boolean(
    searchTerm.trim() || statusFilter || sortBy !== 'appointment_date' || sortOrder !== 'desc'
  );

  const startItemIndex = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItemIndex = totalCount > 0 ? Math.min(page * pageSize, totalCount) : 0;

  return (
    <div className="space-y-6 text-left">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">My Appointments</h1>
            {totalCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                {totalCount} Total
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Track and manage your scheduled consultations</p>
        </div>
        <Link to="/patient/book-appointment">
          <Button variant="primary" icon={PlusCircle}>
            Book New Slot
          </Button>
        </Link>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>{errorMsg}</span>
          </div>
          <Button size="sm" variant="outline" icon={RotateCcw} onClick={fetchAppointments}>
            Retry
          </Button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <Input
            icon={Search}
            placeholder="Search reason or doctor..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />

          {/* Status Filter */}
          <Select
            placeholder="All Statuses"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { label: 'Scheduled', value: 'Scheduled' },
              { label: 'Checked In', value: 'Checked In' },
              { label: 'In Consultation', value: 'In Consultation' },
              { label: 'Completed', value: 'Completed' },
              { label: 'Cancelled', value: 'Cancelled' },
              { label: 'No Show', value: 'No Show' },
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
              { label: 'Appointment Date', value: 'appointment_date' },
              { label: 'Status', value: 'status' },
              { label: 'Created Date', value: 'created_at' },
              { label: 'Appointment ID', value: 'id' },
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
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span>
              {totalCount <= 10
                ? `${totalCount} ${totalCount === 1 ? 'appointment' : 'appointments'}`
                : `Showing ${startItemIndex} - ${endItemIndex} of ${totalCount} appointments`}
            </span>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <Table columns={columns} data={appointments} isLoading={isLoading} />

      {/* Pagination Footer - Only shown when totalCount > 10 */}
      {!isLoading && totalCount > 10 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 font-medium">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
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

      {/* Cancellation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!selectedAptId}
        onClose={() => setSelectedAptId(null)}
        onConfirm={handleCancelConfirm}
        title="Cancel Appointment Slot"
        message="Are you sure you want to cancel this consultation slot? This action cannot be undone."
      />
    </div>
  );
};
