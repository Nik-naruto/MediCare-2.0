import React, { useState, useEffect, useCallback } from 'react';
import { UserCheck, Clock, AlertCircle, RotateCcw, Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { useToast } from '../../context/ToastContext';

const normalizeStatus = (status) => {
  if (!status) return 'Scheduled';
  const s = String(status).trim().toUpperCase();
  if (s === 'SCHEDULED') return 'Scheduled';
  if (s === 'CHECKED_IN' || s === 'CHECKED IN') return 'Checked In';
  if (s === 'IN_CONSULTATION' || s === 'IN CONSULTATION') return 'In Consultation';
  if (s === 'COMPLETED') return 'Completed';
  if (s === 'CANCELLED') return 'Cancelled';
  if (s === 'NO_SHOW' || s === 'NO SHOW') return 'No Show';
  return status;
};

const mapAppointment = (apt) => {
  const patientName =
    apt.patient?.user?.full_name || apt.patient_name || apt.patientName || '--';

  const tokenNo = apt.token_no || apt.token || apt.tokenNo || '--';

  const doctorName =
    apt.doctor?.user?.full_name || apt.doctor_name || apt.doctorName || '--';

  const roomNo =
    apt.doctor?.room_no || apt.doctor?.roomNo || apt.roomNo || '--';

  return {
    id: apt.id,
    tokenNo,
    patientName,
    doctorName,
    roomNo,
    status: normalizeStatus(apt.status),
    rawDate: apt.appointment_date || apt.appointmentDate || '',
    rawTime: apt.start_time || apt.appointmentTime || '',
  };
};

export const CheckInQueue = () => {
  const { addToast } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Pagination, Search, Filter & Sort States
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

  // Debounce search input (~300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchQueueAppointments = useCallback(async () => {
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
      const rawList = Array.isArray(response.data) ? response.data : [];
      const mapped = rawList.map(mapAppointment);

      setAppointments(mapped);

      // Parse pagination headers from response
      const headers = response.headers || {};
      const total = parseInt(headers['x-total-count'] || '0', 10);
      const pages = parseInt(headers['x-total-pages'] || '1', 10);

      setTotalCount(isNaN(total) ? mapped.length : total);
      setTotalPages(isNaN(pages) || pages < 1 ? 1 : pages);
    } catch (err) {
      const detail = err.detail || err.message || 'Failed to load check-in queue.';
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to connect to server.');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, statusFilter, debouncedSearch, sortBy, sortOrder]);

  useEffect(() => {
    fetchQueueAppointments();
  }, [fetchQueueAppointments]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('');
    setSortBy('appointment_date');
    setSortOrder('desc');
    setPage(1);
  };

  const handleMarkArrival = async (aptId) => {
    if (updatingId === aptId) return;

    setUpdatingId(aptId);
    try {
      const res = await apiClient.put(`/appointments/${aptId}`, {
        status: 'Checked In',
      });

      const newStatus = normalizeStatus(res.data?.status || 'Checked In');
      setAppointments((prev) =>
        prev.map((a) => (a.id === aptId ? { ...a, status: newStatus } : a))
      );
      addToast('Patient marked as Checked In!', 'success');
    } catch (e) {
      const detail = e.detail || e.message || 'Failed to update patient arrival status.';
      const msg = typeof detail === 'string' ? detail : 'Failed to update status.';
      addToast(msg, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const columns = [
    {
      header: 'Queue Token',
      key: 'tokenNo',
      render: (row) => (
        <span className="font-extrabold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
          {row.tokenNo}
        </span>
      ),
    },
    {
      header: 'Patient Name',
      key: 'patientName',
      render: (row) => <span className="font-bold text-slate-900">{row.patientName}</span>,
    },
    {
      header: 'Assigned Doctor & Room',
      key: 'doctorName',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block">{row.doctorName}</span>
          <span className="text-xs text-sky-600 font-semibold">Room {row.roomNo}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => <Badge status={row.status} />,
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) =>
        row.status === 'Scheduled' ? (
          <Button
            size="sm"
            variant="primary"
            icon={UserCheck}
            isLoading={updatingId === row.id}
            disabled={updatingId === row.id}
            onClick={() => handleMarkArrival(row.id)}
          >
            Mark Arrived
          </Button>
        ) : (
          <span className="text-xs text-slate-500 font-semibold">Arrival Logged</span>
        ),
    },
  ];

  const hasActiveFilters = Boolean(
    searchTerm.trim() || statusFilter || sortBy !== 'appointment_date' || sortOrder !== 'desc'
  );

  const startItemIndex = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItemIndex = totalCount > 0 ? Math.min(page * pageSize, totalCount) : 0;

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Live Patient Arrival & Queue Controller
            </h1>
            {totalCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-sky-100 text-sky-700 border border-sky-200">
                {totalCount} Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Log patient room check-ins and track active waiting rooms
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
          <Button size="sm" variant="outline" icon={RotateCcw} onClick={fetchQueueAppointments}>
            Retry
          </Button>
        </div>
      )}

      {/* Control Bar */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <Input
            icon={Search}
            placeholder="Search patient or doctor..."
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
              { label: 'Appointment ID', value: 'id' },
              { label: 'Status', value: 'status' },
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
              { label: 'Newest / Descending', value: 'desc' },
              { label: 'Oldest / Ascending', value: 'asc' },
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
              Showing {startItemIndex} - {endItemIndex} of {totalCount} queue items
            </span>
          </div>
        </div>
      </div>

      {/* Main Table */}
      {!isLoading && appointments.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">
            {hasActiveFilters ? 'No queue items match your criteria.' : 'No patients in queue.'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {hasActiveFilters ? 'Try adjusting your filters or search term.' : 'Check-in arrival queue items will appear here.'}
          </p>
        </div>
      ) : (
        <Table columns={columns} data={appointments} isLoading={isLoading} />
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

