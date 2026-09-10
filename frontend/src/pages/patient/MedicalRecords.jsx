import React, { useState, useEffect } from 'react';
import { FileText, Download, Eye, AlertCircle, X, Search, RotateCcw, ArrowLeft, ArrowRight } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';

export const MedicalRecords = () => {
  const { addToast } = useToast();
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Sorting state
  const [sortOption, setSortOption] = useState('record_date:desc');

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

  // 2. Main backend fetch function
  const fetchRecords = async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('page_size', pageSize);

      if (debouncedSearch.trim()) {
        params.append('search', debouncedSearch.trim());
      }

      if (categoryFilter) {
        params.append('category', categoryFilter);
      }

      if (sortOption) {
        const [sortBy, sortOrder] = sortOption.split(':');
        if (sortBy) {
          params.append('sort_by', sortBy);
          params.append('sort_order', sortOrder || 'desc');
        }
      }

      const response = await apiClient.get(`/medical-records/?${params.toString()}`);
      const rawData = Array.isArray(response.data) ? response.data : [];

      setRecords(rawData);

      // Parse pagination response headers
      const countHeader = response.headers['x-total-count'];
      const pagesHeader = response.headers['x-total-pages'];
      const parsedCount = countHeader !== undefined ? parseInt(countHeader, 10) : rawData.length;
      const parsedPages = pagesHeader !== undefined ? parseInt(pagesHeader, 10) : 1;

      setTotalCount(isNaN(parsedCount) ? rawData.length : parsedCount);
      setTotalPages(isNaN(parsedPages) ? 1 : Math.max(1, parsedPages));
    } catch (err) {
      const detail = err.detail || err.message || 'Failed to load medical records.';
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to connect to backend.');
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [page, pageSize, debouncedSearch, categoryFilter, sortOption]);

  const handleReset = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setCategoryFilter('');
    setSortOption('record_date:desc');
    setPage(1);
  };

  const handleViewRecord = async (recordId) => {
    try {
      const response = await apiClient.get(`/medical-records/${recordId}`);
      setSelectedRecord(response.data);
    } catch (err) {
      const detail = err.detail || err.message || 'Failed to fetch record details.';
      addToast(typeof detail === 'string' ? detail : 'Record lookup failed.', 'error');
    }
  };

  const columns = [
    {
      header: 'Document Title & Category',
      key: 'title',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block">{row.title}</span>
          <span className="text-xs text-sky-600 font-semibold">{row.category}</span>
        </div>
      ),
    },
    {
      header: 'Prescribing Doctor',
      key: 'doctorName',
      render: (row) => (
        <span className="text-xs font-medium text-slate-800">
          {row.doctor_name || row.doctorName || 'Attending Physician'}
        </span>
      ),
    },
    {
      header: 'Record Date',
      key: 'date',
      render: (row) => <span className="text-xs text-slate-600">{row.record_date || row.date}</span>,
    },
    {
      header: 'Clinical Summary',
      key: 'summary',
      render: (row) => (
        <span className="text-xs text-slate-500 max-w-xs block truncate">
          {row.summary || 'Consultation record summary'}
        </span>
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
            icon={Eye}
            onClick={() => handleViewRecord(row.id)}
          >
            View
          </Button>
          {row.document_url ? (
            <a href={row.document_url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" icon={Download}>
                PDF
              </Button>
            </a>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Electronic Medical Records (EHR)</h1>
        <p className="text-xs text-slate-500">Centralized history of clinical consultations and medical documents</p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
          <Button size="sm" variant="outline" icon={RotateCcw} onClick={fetchRecords}>
            Retry
          </Button>
        </div>
      )}

      {/* Control Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
          <Input
            placeholder="Search record title, doctor, diagnosis..."
            icon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <Select
            options={[
              { label: 'All Categories', value: '' },
              { label: 'Consultation', value: 'Consultation' },
              { label: 'General', value: 'General' },
              { label: 'Lab Report', value: 'Lab Report' },
              { label: 'Discharge Summary', value: 'Discharge Summary' },
            ]}
            placeholder="Category Filter"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
          />

          <Select
            options={[
              { label: 'Newest Record First', value: 'record_date:desc' },
              { label: 'Oldest Record First', value: 'record_date:asc' },
              { label: 'Title (A-Z)', value: 'title:asc' },
              { label: 'Category (A-Z)', value: 'category:asc' },
            ]}
            placeholder="Sort Records"
            value={sortOption}
            onChange={(e) => {
              setSortOption(e.target.value);
              setPage(1);
            }}
          />

          <div className="flex justify-end">
            {(searchTerm || categoryFilter || sortOption !== 'record_date:desc') && (
              <Button size="sm" variant="outline" icon={RotateCcw} onClick={handleReset}>
                Reset Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Table view or Empty state */}
      {!isLoading && records.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No medical records found.</p>
          <p className="text-xs text-slate-500 mt-1">Clinical records and diagnostic documents will appear here when issued.</p>
          {(searchTerm || categoryFilter || sortOption !== 'record_date:desc') && (
            <div className="mt-4">
              <Button size="sm" variant="outline" icon={RotateCcw} onClick={handleReset}>
                Reset Search Filters
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Table columns={columns} data={records} isLoading={isLoading} />
      )}

      {/* Pagination Footer */}
      {!isLoading && records.length > 0 && (
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
              Showing {records.length} of {totalCount} medical records
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

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedRecord.title}</h3>
                <span className="text-xs text-sky-600 font-semibold">{selectedRecord.category}</span>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Doctor</span>
                <strong className="text-slate-900">{selectedRecord.doctor_name || 'Attending Physician'}</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Record Date</span>
                <strong className="text-slate-900">{selectedRecord.record_date}</strong>
              </div>
              <div className="py-2">
                <span className="text-slate-500 block mb-1 font-medium">Clinical Summary & Diagnosis:</span>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed">
                  {selectedRecord.summary || 'No detailed notes provided.'}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedRecord(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

