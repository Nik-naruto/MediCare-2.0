import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, PlusCircle, UserCheck, AlertCircle, RotateCcw, Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { formatTime } from '../../utils/formatters';

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

const normalizePaymentStatus = (status) => {
  if (!status) return 'Unpaid';
  const s = String(status).trim().toUpperCase();
  if (s === 'PAID') return 'Paid';
  if (s === 'UNPAID') return 'Unpaid';
  if (s === 'REFUNDED') return 'Refunded';
  return status;
};

const formatAppointmentTime = (dateStr, startTimeStr, endTimeStr) => {
  let datePart = dateStr || '';
  if (dateStr) {
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        datePart = d.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      }
    } catch (e) {
      datePart = dateStr;
    }
  }

  const formattedStart = formatTime(startTimeStr);
  const formattedEnd = formatTime(endTimeStr);

  const timePart = startTimeStr
    ? endTimeStr
      ? `${formattedStart} - ${formattedEnd}`
      : formattedStart
    : '';

  if (datePart && timePart) return `${datePart} • ${timePart}`;
  return datePart || timePart || '--';
};

const mapAppointment = (apt) => {
  const patientName =
    apt.patient?.user?.full_name || apt.patient_name || apt.patientName || 'Unknown Patient';

  const tokenNo = apt.token_no || apt.token || apt.tokenNo || '--';

  const doctorName =
    apt.doctor?.user?.full_name || apt.doctor_name || apt.doctorName || '--';

  const specialty =
    apt.doctor?.specialization || apt.doctor?.specialty || apt.specialty || '--';

  const roomNo =
    apt.doctor?.room_no || apt.doctor?.roomNo || apt.roomNo || '--';

  const appointmentTime = formatAppointmentTime(
    apt.appointment_date || apt.appointmentDate,
    apt.start_time || apt.appointmentTime,
    apt.end_time || apt.endTime
  );

  const status = normalizeStatus(apt.status);
  const rawPayment = apt.payment_status || apt.paymentStatus;
  const paymentStatus = rawPayment ? normalizePaymentStatus(rawPayment) : '--';

  return {
    id: apt.id,
    patientName,
    tokenNo,
    doctorName,
    specialty,
    roomNo,
    appointmentTime,
    status,
    paymentStatus,
    rawDate: apt.appointment_date || apt.appointmentDate || '',
    rawTime: apt.start_time || apt.appointmentTime || '',
  };
};

export const ReceptionistAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
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
      const detail = err.detail || err.message || 'Failed to load desk master appointment roster.';
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to connect to server.');
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

  const columns = [
    {
      header: 'Token & Patient Name',
      key: 'patientName',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block">{row.patientName}</span>
          <span className="text-xs text-slate-500">Token: {row.tokenNo}</span>
        </div>
      ),
    },
    {
      header: 'Doctor Specialist',
      key: 'doctorName',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block">{row.doctorName}</span>
          <span className="text-xs text-sky-600 font-semibold">{row.specialty} &bull; Room {row.roomNo}</span>
        </div>
      ),
    },
    {
      header: 'Appointment Time',
      key: 'appointmentTime',
      render: (row) => <span className="text-xs font-semibold text-slate-800">{row.appointmentTime}</span>,
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => <Badge status={row.status} />,
    },
    {
      header: 'Payment Status',
      key: 'paymentStatus',
      render: (row) => <Badge status={row.paymentStatus} />,
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
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Desk Master Appointment Roster</h1>
            {totalCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-sky-100 text-sky-700 border border-sky-200">
                {totalCount} Total
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Monitor all online and walk-in appointment slots</p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
          <Button size="sm" variant="outline" icon={RotateCcw} onClick={fetchAppointments}>
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
            placeholder="Search patient, doctor, reason..."
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
              Showing {startItemIndex} - {endItemIndex} of {totalCount} appointments
            </span>
          </div>
        </div>
      </div>

      {/* Main Table */}
      {!isLoading && appointments.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">
            {hasActiveFilters ? 'No appointments match your search/filter criteria.' : 'No appointments found.'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {hasActiveFilters ? 'Try adjusting your filters or search term.' : 'Scheduled online and walk-in appointments will appear here.'}
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

