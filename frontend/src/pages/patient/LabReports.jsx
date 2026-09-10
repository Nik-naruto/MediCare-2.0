import React, { useState, useEffect } from 'react';
import { TestTube, Download, AlertCircle, Search, RotateCcw, ArrowLeft, ArrowRight, Eye } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

const mapLabReportData = (report) => {
  return {
    id: report.id,
    testName: report.test_name || report.testName || 'Diagnostic Lab Test',
    prescribedBy: report.prescribed_by || report.prescribedBy || 'Attending Physician',
    labTechnician: report.lab_technician || report.labTechnician || 'Senior Pathologist',
    completionDate: report.completion_date || report.completionDate || null,
    requestDate: report.request_date || report.requestDate || null,
    status: report.status || 'Pending',
    resultsSummary: report.results_summary || report.resultsSummary || 'Diagnostic testing in process.',
    documentUrl: report.document_url || report.documentUrl || null,
    raw: report,
  };
};

export const LabReports = () => {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Sorting state
  const [sortOption, setSortOption] = useState('request_date:desc');

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // 1. Debounce search term (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 2. Fetch Lab Reports from Backend
  const fetchLabReports = async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('page_size', pageSize);

      if (debouncedSearch.trim()) {
        params.append('search', debouncedSearch.trim());
      }

      if (statusFilter) {
        params.append('status', statusFilter);
      }

      if (sortOption) {
        const [sortBy, sortOrder] = sortOption.split(':');
        if (sortBy) {
          params.append('sort_by', sortBy);
          params.append('sort_order', sortOrder || 'desc');
        }
      }

      const response = await apiClient.get(`/lab-reports/?${params.toString()}`);
      const rawData = Array.isArray(response.data) ? response.data : [];

      const mapped = rawData.map(mapLabReportData);
      setReports(mapped);

      // Parse pagination headers
      const countHeader = response.headers['x-total-count'];
      const pagesHeader = response.headers['x-total-pages'];
      const parsedCount = countHeader !== undefined ? parseInt(countHeader, 10) : rawData.length;
      const parsedPages = pagesHeader !== undefined ? parseInt(pagesHeader, 10) : 1;

      setTotalCount(isNaN(parsedCount) ? rawData.length : parsedCount);
      setTotalPages(isNaN(parsedPages) ? 1 : Math.max(1, parsedPages));
    } catch (err) {
      const detail = err.detail || err.message || 'Failed to load lab reports.';
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to connect to server.');
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLabReports();
  }, [page, pageSize, debouncedSearch, statusFilter, sortOption]);

  const handleReset = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('');
    setSortOption('request_date:desc');
    setPage(1);
  };

  const columns = [
    {
      header: 'Diagnostic Test Name',
      key: 'testName',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block">{row.testName}</span>
          <span className="text-xs text-slate-500">Ordered by {row.prescribedBy}</span>
        </div>
      ),
    },
    {
      header: 'Lab Technician',
      key: 'labTechnician',
      render: (row) => <span className="text-xs text-slate-700 font-medium">{row.labTechnician}</span>,
    },
    {
      header: 'Completion Date',
      key: 'completionDate',
      render: (row) => <span className="text-xs text-slate-600">{row.completionDate || 'In Progress'}</span>,
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
        const isReady =
          row.status === 'Ready' ||
          row.status === 'READY' ||
          row.status === 'Completed' ||
          row.status === 'COMPLETED';

        return (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" icon={Eye} onClick={() => setSelectedReport(row)}>
              Details
            </Button>
            {isReady && row.documentUrl ? (
              <a href={row.documentUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="primary" icon={Download}>
                  PDF
                </Button>
              </a>
            ) : isReady ? (
              <Button size="sm" variant="primary" icon={Download}>
                PDF
              </Button>
            ) : (
              <span className="text-xs text-slate-400 font-medium px-2">Processing...</span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pathology & Lab Reports</h1>
        <p className="text-xs text-slate-500">Diagnostic test outcomes, blood panels, and imaging reports</p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
          <Button size="sm" variant="outline" icon={RotateCcw} onClick={fetchLabReports}>
            Retry
          </Button>
        </div>
      )}

      {/* Control Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
          <Input
            placeholder="Search test name, doctor..."
            icon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <Select
            options={[
              { label: 'All Statuses', value: '' },
              { label: 'Pending', value: 'Pending' },
              { label: 'In Progress', value: 'In Progress' },
              { label: 'Ready', value: 'Ready' },
              { label: 'Cancelled', value: 'Cancelled' },
            ]}
            placeholder="Filter Status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          />

          <Select
            options={[
              { label: 'Newest Request Date', value: 'request_date:desc' },
              { label: 'Oldest Request Date', value: 'request_date:asc' },
              { label: 'Completion Date (Desc)', value: 'completion_date:desc' },
              { label: 'Test Name (A-Z)', value: 'test_name:asc' },
              { label: 'Status', value: 'status:asc' },
            ]}
            placeholder="Sort Reports"
            value={sortOption}
            onChange={(e) => {
              setSortOption(e.target.value);
              setPage(1);
            }}
          />

          <div className="flex justify-end">
            {(searchTerm || statusFilter || sortOption !== 'request_date:desc') && (
              <Button size="sm" variant="outline" icon={RotateCcw} onClick={handleReset}>
                Reset Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Table view or Empty state */}
      {!isLoading && reports.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <TestTube className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No lab reports found.</p>
          <p className="text-xs text-slate-500 mt-1">
            Diagnostic lab results and pathology reports will appear here when requested.
          </p>
          {(searchTerm || statusFilter || sortOption !== 'request_date:desc') && (
            <div className="mt-4">
              <Button size="sm" variant="outline" icon={RotateCcw} onClick={handleReset}>
                Reset Search Filters
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Table columns={columns} data={reports} isLoading={isLoading} />
      )}

      {/* Pagination Footer */}
      {!isLoading && reports.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-slate-500">
              Showing {reports.length} of {totalCount} lab reports
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              icon={ArrowLeft}
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </Button>
            <span className="font-bold text-slate-800 px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              icon={ArrowRight}
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Report Detail Modal */}
      <Modal isOpen={!!selectedReport} onClose={() => setSelectedReport(null)} title="Diagnostic Report Overview" size="md">
        {selectedReport && (
          <div className="space-y-6 text-xs text-left">
            <div className="p-4 rounded-xl bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h4 className="font-bold text-base">{selectedReport.testName}</h4>
                <span>Report ID: #{selectedReport.id} &bull; Requested: {selectedReport.requestDate || 'N/A'}</span>
              </div>
              <Badge status={selectedReport.status} />
            </div>

            <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-slate-500 block">Prescribed By:</span>
                <strong className="text-slate-900">{selectedReport.prescribedBy}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Lab Technician:</span>
                <strong className="text-slate-900">{selectedReport.labTechnician}</strong>
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-slate-800 block">Diagnostic Outcome & Summary:</span>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed">
                {selectedReport.resultsSummary}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              {selectedReport.documentUrl ? (
                <a href={selectedReport.documentUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="primary" icon={Download}>
                    Download Lab PDF
                  </Button>
                </a>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setSelectedReport(null)}>
                  Close
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

