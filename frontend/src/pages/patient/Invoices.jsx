import React, { useState, useEffect } from 'react';
import { CreditCard, Download, AlertCircle, Search, RotateCcw, ArrowLeft, ArrowRight, Eye } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { formatCurrency } from '../../utils/formatters';

const mapInvoiceData = (inv) => {
  const formattedId =
    typeof inv.id === 'number' ? `INV-${String(inv.id).padStart(4, '0')}` : inv.id || 'INV-000';

  const rawAmount = inv.total_amount ?? inv.totalAmount ?? 0;
  const numAmount = typeof rawAmount === 'number' ? rawAmount : parseFloat(rawAmount) || 0;

  const dateStr =
    inv.invoice_date ||
    inv.invoiceDate ||
    (inv.created_at ? String(inv.created_at).split('T')[0] : 'N/A');

  return {
    id: formattedId,
    rawId: inv.id,
    invoiceDate: dateStr,
    totalAmount: numAmount,
    paymentStatus: inv.payment_status || inv.paymentStatus || 'Unpaid',
    paymentMethod: inv.payment_method || inv.paymentMethod || 'Pending',
    transactionId: inv.transaction_id || 'N/A',
    documentUrl: inv.document_url || inv.documentUrl || null,
    raw: inv,
  };
};

export const PatientInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeInvoice, setActiveInvoice] = useState(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Sorting state
  const [sortOption, setSortOption] = useState('created_at:desc');

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

  // 2. Fetch Invoices from Backend
  const fetchInvoices = async () => {
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
        params.append('payment_status', statusFilter);
      }

      if (sortOption) {
        const [sortBy, sortOrder] = sortOption.split(':');
        if (sortBy) {
          params.append('sort_by', sortBy);
          params.append('sort_order', sortOrder || 'desc');
        }
      }

      const response = await apiClient.get(`/invoices/?${params.toString()}`);
      const rawData = Array.isArray(response.data) ? response.data : [];

      const mapped = rawData.map(mapInvoiceData);
      setInvoices(mapped);

      // Parse pagination headers
      const countHeader = response.headers['x-total-count'];
      const pagesHeader = response.headers['x-total-pages'];
      const parsedCount = countHeader !== undefined ? parseInt(countHeader, 10) : rawData.length;
      const parsedPages = pagesHeader !== undefined ? parseInt(pagesHeader, 10) : 1;

      setTotalCount(isNaN(parsedCount) ? rawData.length : parsedCount);
      setTotalPages(isNaN(parsedPages) ? 1 : Math.max(1, parsedPages));
    } catch (err) {
      const detail = err.detail || err.message || 'Failed to load billing invoices.';
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to connect to server.');
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, pageSize, debouncedSearch, statusFilter, sortOption]);

  const handleReset = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('');
    setSortOption('created_at:desc');
    setPage(1);
  };

  const columns = [
    {
      header: 'Invoice ID & Date',
      key: 'id',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block">{row.id}</span>
          <span className="text-xs text-slate-500">{row.invoiceDate}</span>
        </div>
      ),
    },
    {
      header: 'Total Amount',
      key: 'totalAmount',
      render: (row) => <span className="font-extrabold text-slate-900">{formatCurrency(row.totalAmount)}</span>,
    },
    {
      header: 'Payment Status',
      key: 'paymentStatus',
      render: (row) => <Badge status={row.paymentStatus} />,
    },
    {
      header: 'Payment Method',
      key: 'paymentMethod',
      render: (row) => (
        <div>
          <span className="text-xs text-slate-700 font-medium block">{row.paymentMethod}</span>
          <span className="text-[11px] text-slate-400">Txn: {row.transactionId}</span>
        </div>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <Button size="sm" variant="outline" icon={Eye} onClick={() => setActiveInvoice(row)}>
          View Slip
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Billing & Invoices</h1>
        <p className="text-xs text-slate-500">View payment receipts and consultation fee invoices</p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
          <Button size="sm" variant="outline" icon={RotateCcw} onClick={fetchInvoices}>
            Retry
          </Button>
        </div>
      )}

      {/* Control Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
          <Input
            placeholder="Search invoice ID, payment method..."
            icon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <Select
            options={[
              { label: 'All Payment Statuses', value: '' },
              { label: 'Paid', value: 'Paid' },
              { label: 'Unpaid', value: 'Unpaid' },
              { label: 'Refunded', value: 'Refunded' },
            ]}
            placeholder="Payment Status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          />

          <Select
            options={[
              { label: 'Newest First', value: 'created_at:desc' },
              { label: 'Oldest First', value: 'created_at:asc' },
              { label: 'Amount: High to Low', value: 'total_amount:desc' },
              { label: 'Amount: Low to High', value: 'total_amount:asc' },
              { label: 'Status', value: 'payment_status:asc' },
            ]}
            placeholder="Sort Invoices"
            value={sortOption}
            onChange={(e) => {
              setSortOption(e.target.value);
              setPage(1);
            }}
          />

          <div className="flex justify-end">
            {(searchTerm || statusFilter || sortOption !== 'created_at:desc') && (
              <Button size="sm" variant="outline" icon={RotateCcw} onClick={handleReset}>
                Reset Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Table view or empty state */}
      {!isLoading && invoices.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <CreditCard className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No invoices found.</p>
          <p className="text-xs text-slate-500 mt-1">
            Consultation fee receipts and billing invoices will appear here after appointments.
          </p>
          {(searchTerm || statusFilter || sortOption !== 'created_at:desc') && (
            <div className="mt-4">
              <Button size="sm" variant="outline" icon={RotateCcw} onClick={handleReset}>
                Reset Search Filters
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Table columns={columns} data={invoices} isLoading={isLoading} />
      )}

      {/* Pagination Footer */}
      {!isLoading && invoices.length > 0 && (
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
              Showing {invoices.length} of {totalCount} billing records
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

      {/* Invoice Detail Slip Modal */}
      <Modal isOpen={!!activeInvoice} onClose={() => setActiveInvoice(null)} title="Billing Invoice Receipt" size="md">
        {activeInvoice && (
          <div className="space-y-6 text-xs text-left">
            <div className="p-4 rounded-xl bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h4 className="font-bold text-base">MediCare 2.0 Official Receipt</h4>
                <span>Invoice ID: {activeInvoice.id} &bull; Date: {activeInvoice.invoiceDate}</span>
              </div>
              <Badge status={activeInvoice.paymentStatus} />
            </div>

            <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-slate-500 block">Total Amount:</span>
                <strong className="text-slate-900 text-lg font-black">{formatCurrency(activeInvoice.totalAmount)}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Payment Method:</span>
                <strong className="text-slate-900">{activeInvoice.paymentMethod}</strong>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-500 block">Transaction Reference ID:</span>
              <strong className="font-mono text-slate-800 text-xs">{activeInvoice.transactionId}</strong>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              {activeInvoice.documentUrl ? (
                <a href={activeInvoice.documentUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="primary" icon={Download}>
                    Download Invoice PDF
                  </Button>
                </a>
              ) : (
                <Button variant="primary" icon={Download} onClick={() => setActiveInvoice(null)}>
                  Download Invoice Receipt
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

