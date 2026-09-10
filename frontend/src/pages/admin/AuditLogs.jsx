import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Download, AlertCircle, RotateCcw, Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';

const formatTimestamp = (ts) => {
  if (!ts) return '--';
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts);
    return d.toLocaleString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch (e) {
    return String(ts);
  }
};

const sanitizeDetails = (detailsVal) => {
  if (!detailsVal) return '--';
  let str = typeof detailsVal === 'object' ? JSON.stringify(detailsVal) : String(detailsVal);
  // Redact sensitive credentials and token patterns
  str = str.replace(/(password|hashed_password|token|access_token|refresh_token|secret|hash)=[^&\s]+/gi, '$1=***');
  return str;
};

const mapAuditLogData = (log) => {
  const userName = log.user_name || (log.user_id ? `User #${log.user_id}` : 'System');
  const role = log.role || 'System';
  const action = log.action || '--';
  const resource = log.resource || '--';
  const details = sanitizeDetails(log.details);
  const ipAddress = log.ip_address || '--';
  const timestamp = formatTimestamp(log.created_at);

  return {
    id: log.id,
    timestamp,
    userName,
    role,
    action,
    resource,
    details,
    ipAddress,
    rawCreatedAt: log.created_at || '',
  };
};

export const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [dateValidationError, setDateValidationError] = useState('');

  // Pagination, Search, Filter & Sort States
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [userIdFilter, setUserIdFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
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

  const fetchAuditLogs = useCallback(async () => {
    // Validate date range
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setDateValidationError('Date From cannot be later than Date To.');
      return;
    }
    setDateValidationError('');

    setIsLoading(true);
    setErrorMsg('');

    try {
      const params = {
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      if (userIdFilter.trim()) {
        const uid = parseInt(userIdFilter.trim(), 10);
        if (!isNaN(uid)) {
          params.user_id = uid;
        }
      }

      if (actionFilter.trim()) {
        params.action = actionFilter.trim();
      }

      if (resourceFilter.trim()) {
        params.resource = resourceFilter.trim();
      }

      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      if (dateFrom) {
        params.date_from = dateFrom;
      }

      if (dateTo) {
        params.date_to = dateTo;
      }

      const response = await apiClient.get('/audit-logs/', { params });
      const rawList = Array.isArray(response.data) ? response.data : [];
      const mapped = rawList.map(mapAuditLogData);

      setLogs(mapped);

      // Parse pagination headers from response
      const headers = response.headers || {};
      const total = parseInt(headers['x-total-count'] || '0', 10);
      const pages = parseInt(headers['x-total-pages'] || '1', 10);

      setTotalCount(isNaN(total) ? mapped.length : total);
      setTotalPages(isNaN(pages) || pages < 1 ? 1 : pages);
    } catch (err) {
      const detail = err.detail || err.message || 'Failed to load security audit trail.';
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to connect to server.');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, userIdFilter, actionFilter, resourceFilter, debouncedSearch, dateFrom, dateTo, sortBy, sortOrder]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setUserIdFilter('');
    setActionFilter('');
    setResourceFilter('');
    setDateFrom('');
    setDateTo('');
    setDateValidationError('');
    setSortBy('created_at');
    setSortOrder('desc');
    setPage(1);
  };

  const columns = [
    {
      header: 'Timestamp',
      key: 'timestamp',
      render: (row) => <span className="font-mono text-xs font-semibold text-slate-800">{row.timestamp}</span>,
    },
    {
      header: 'User & Role',
      key: 'userName',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block">{row.userName}</span>
          <Badge variant="purple">{row.role}</Badge>
        </div>
      ),
    },
    {
      header: 'System Action',
      key: 'action',
      render: (row) => <span className="font-bold text-slate-900">{row.action}</span>,
    },
    {
      header: 'Resource & Details',
      key: 'details',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-800 block">{row.resource}</span>
          <span className="text-xs text-slate-500">{row.details}</span>
        </div>
      ),
    },
    {
      header: 'IP Address',
      key: 'ipAddress',
      render: (row) => <span className="font-mono text-xs text-slate-500">{row.ipAddress}</span>,
    },
  ];

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
      userIdFilter.trim() ||
      actionFilter.trim() ||
      resourceFilter.trim() ||
      dateFrom ||
      dateTo ||
      sortBy !== 'created_at' ||
      sortOrder !== 'desc'
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
              Security Audit & Activity Trail
            </h1>
            {totalCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-purple-100 text-purple-700 border border-purple-200">
                {totalCount} Logs
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable access logs monitoring patient record edits and administrative actions
          </p>
        </div>
        <Button variant="outline" icon={Download} disabled title="Backend export endpoint is not implemented">
          Export Compliance Trail
        </Button>
      </div>

      {dateValidationError && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>{dateValidationError}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
          <Button size="sm" variant="outline" icon={RotateCcw} onClick={fetchAuditLogs}>
            Retry
          </Button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <Input
            icon={Search}
            placeholder="Search action, resource, details..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />

          {/* User ID Filter */}
          <Input
            type="number"
            placeholder="Actor User ID..."
            value={userIdFilter}
            onChange={(e) => {
              setUserIdFilter(e.target.value);
              setPage(1);
            }}
          />

          {/* Action Filter */}
          <Input
            placeholder="Action (e.g. USER_REGISTER)..."
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
          />

          {/* Resource Filter */}
          <Input
            placeholder="Resource (e.g. User #1)..."
            value={resourceFilter}
            onChange={(e) => {
              setResourceFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Date From */}
          <div className="flex flex-col">
            <label className="text-[11px] font-semibold text-slate-500 mb-1">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Date To */}
          <div className="flex flex-col">
            <label className="text-[11px] font-semibold text-slate-500 mb-1">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Sort Field */}
          <div className="flex flex-col">
            <label className="text-[11px] font-semibold text-slate-500 mb-1">Sort Field</label>
            <Select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              options={[
                { label: 'Created At', value: 'created_at' },
                { label: 'Log ID', value: 'id' },
                { label: 'Action', value: 'action' },
                { label: 'Resource', value: 'resource' },
              ]}
            />
          </div>

          {/* Sort Direction & Reset */}
          <div className="flex flex-col justify-end gap-1">
            <label className="text-[11px] font-semibold text-slate-500">Sort Direction</label>
            <div className="flex items-center gap-2">
              <Select
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
            </div>
          </div>
        </div>

        {/* Filter Summary & Reset */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/60">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Showing {startItemIndex} - {endItemIndex} of {totalCount} compliance records
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

      {/* Table Display */}
      {!isLoading && logs.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <ShieldAlert className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">
            {hasActiveFilters ? 'No audit logs match your search/filter criteria.' : 'No audit logs found.'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {hasActiveFilters ? 'Try adjusting your date range or search terms.' : 'Security activity trail records will appear here.'}
          </p>
        </div>
      ) : (
        <Table columns={columns} data={logs} isLoading={isLoading} />
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
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
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


