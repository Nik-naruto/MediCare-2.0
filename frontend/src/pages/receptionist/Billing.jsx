import React, { useState, useEffect } from 'react';
import { CreditCard, Printer, AlertCircle, RotateCcw, FileText, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, X, CheckCircle, ShieldCheck } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { formatCurrency } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';

const normalizePaymentStatus = (status) => {
  if (!status) return 'Unpaid';
  const s = String(status).trim().toUpperCase();
  if (s === 'PAID') return 'Paid';
  if (s === 'UNPAID') return 'Unpaid';
  if (s === 'REFUNDED') return 'Refunded';
  return status;
};

const mapInvoiceData = (inv) => {
  const formattedId = typeof inv.id === 'number' ? `#INV-${String(inv.id).padStart(4, '0')}` : inv.id || 'INV-000';

  const dateStr = inv.invoice_date
    ? String(inv.invoice_date)
    : inv.created_at
    ? String(inv.created_at).split('T')[0]
    : '--';

  const patientName =
    inv.patient_name ||
    inv.patient?.user?.full_name ||
    (inv.patient_id ? `Patient #${inv.patient_id}` : '--');

  return {
    id: formattedId,
    rawId: inv.id,
    patientId: inv.patient_id,
    invoiceDate: dateStr,
    patientName,
    totalAmount: Number(inv.total_amount || inv.totalAmount) || 0,
    subtotal: Number(inv.subtotal) || 0,
    tax: Number(inv.tax) || 0,
    paymentStatus: normalizePaymentStatus(inv.payment_status || inv.paymentStatus),
    paymentMethod: inv.payment_method || inv.paymentMethod || '--',
    transactionId: inv.transaction_id || '--',
    items: Array.isArray(inv.items) ? inv.items : [],
    created_at: inv.created_at,
  };
};

export const Billing = () => {
  const { addToast } = useToast();
  const [invoices, setInvoices] = useState([]);
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
  const [statusFilter, setStatusFilter] = useState(''); // '', 'Unpaid', 'Paid', 'Refunded'

  // Sorting State
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modals & Collect Payment State
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [customTxnId, setCustomTxnId] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Printable Receipt Modal State
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchBillingInvoices = async () => {
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
      if (statusFilter) {
        params.payment_status = statusFilter;
      }

      const response = await apiClient.get('/invoices/', { params });
      const rawInvs = Array.isArray(response.data) ? response.data : [];
      setInvoices(rawInvs.map(mapInvoiceData));

      // Parse pagination headers
      const headers = response.headers || {};
      const countHeader = parseInt(headers['x-total-count'], 10);
      const totalPagesHeader = parseInt(headers['x-total-pages'], 10);

      setTotalCount(!isNaN(countHeader) ? countHeader : rawInvs.length);
      setTotalPages(!isNaN(totalPagesHeader) ? totalPagesHeader : 1);
    } catch (err) {
      const detail = err.response?.data?.detail || err.detail || err.message || 'Failed to load front-desk billing invoices.';
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingInvoices();
  }, [page, pageSize, debouncedSearch, statusFilter, sortBy, sortOrder]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('');
    setSortBy('created_at');
    setSortOrder('desc');
    setPage(1);
  };

  const handleOpenPaymentModal = (invoice) => {
    setSelectedInvoiceForPayment(invoice);
    setPaymentMethod('Cash');
    setCustomTxnId(`TXN-${Date.now().toString().slice(-6)}`);
  };

  const handleConfirmCollectPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoiceForPayment) return;

    setIsSubmittingPayment(true);
    const targetId = selectedInvoiceForPayment.rawId;

    try {
      const txnId = customTxnId.trim() || `TXN-${Date.now().toString().slice(-6)}`;
      await apiClient.put(`/invoices/${targetId}`, {
        payment_status: 'Paid',
        payment_method: paymentMethod,
        transaction_id: txnId,
      });

      addToast(`Payment of ${formatCurrency(selectedInvoiceForPayment.totalAmount)} collected successfully!`, 'success');
      setSelectedInvoiceForPayment(null);
      await fetchBillingInvoices();
    } catch (err) {
      const detail = err.response?.data?.detail || err.detail || err.message || 'Failed to record payment collection.';
      addToast(typeof detail === 'string' ? detail : 'Failed to collect payment.', 'error');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handlePrintReceipt = (invoice) => {
    setSelectedReceipt(invoice);
  };

  const triggerWindowPrint = () => {
    addToast(`Triggering print dialog for ${selectedReceipt?.id || 'Invoice'}...`, 'info');
    window.print();
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
      header: 'Patient Name',
      key: 'patientName',
      render: (row) => <span className="font-bold text-slate-900">{row.patientName}</span>,
    },
    {
      header: 'Total Charges',
      key: 'totalAmount',
      render: (row) => <span className="font-black text-slate-900">{formatCurrency(row.totalAmount)}</span>,
    },
    {
      header: 'Payment Status',
      key: 'paymentStatus',
      render: (row) => <Badge status={row.paymentStatus} />,
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) =>
        row.paymentStatus === 'Unpaid' ? (
          <Button
            size="sm"
            variant="primary"
            icon={CreditCard}
            onClick={() => handleOpenPaymentModal(row)}
          >
            Collect Payment
          </Button>
        ) : (
          <Button size="sm" variant="outline" icon={Printer} onClick={() => handlePrintReceipt(row)}>
            Print Receipt
          </Button>
        ),
    },
  ];

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Front-Desk Billing Counter</h1>
          <p className="text-xs text-slate-500">Collect consultation fees, issue physical cash receipts, and track unpaid bills</p>
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[220px] flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search invoice ID, patient name, TXN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          {/* Payment Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Paid">Paid</option>
            <option value="Refunded">Refunded</option>
          </select>

          {/* Sort Controls */}
          <div className="flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="created_at">Sort by Date Created</option>
              <option value="invoice_date">Sort by Invoice Date</option>
              <option value="total_amount">Sort by Total Amount</option>
              <option value="id">Sort by Invoice ID</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-2 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>

          {/* Reset Button */}
          {(searchTerm || statusFilter || sortBy !== 'created_at' || sortOrder !== 'desc') && (
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
          <Button size="sm" variant="outline" icon={RotateCcw} onClick={fetchBillingInvoices}>
            Retry
          </Button>
        </div>
      )}

      {/* Table & Empty State */}
      {!isLoading && invoices.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No invoices found.</p>
          <p className="text-xs text-slate-500 mt-1">Generated billing invoices will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Table columns={columns} data={invoices} isLoading={isLoading} />

          {/* Pagination Footer */}
          {!isLoading && totalCount > 0 && (
            <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-500">
                Showing <strong className="text-slate-800">{(page - 1) * pageSize + 1}</strong> to{' '}
                <strong className="text-slate-800">{Math.min(page * pageSize, totalCount)}</strong> of{' '}
                <strong className="text-slate-800">{totalCount}</strong> invoices
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

      {/* Collect Payment Modal */}
      {selectedInvoiceForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-100 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900">Collect Invoice Payment</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoiceForPayment(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between text-slate-700">
                <span>Invoice ID:</span>
                <strong className="text-slate-900">{selectedInvoiceForPayment.id}</strong>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Patient Name:</span>
                <strong className="text-slate-900">{selectedInvoiceForPayment.patientName}</strong>
              </div>
              <div className="flex justify-between text-slate-700 pt-1 border-t border-slate-200 font-bold">
                <span>Total Amount Due:</span>
                <strong className="text-emerald-700 text-sm">{formatCurrency(selectedInvoiceForPayment.totalAmount)}</strong>
              </div>
            </div>

            <form onSubmit={handleConfirmCollectPayment} className="space-y-4">
              <Select
                label="Payment Method"
                options={['Cash', 'Card', 'UPI', 'NetBanking', 'Insurance']}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />

              <Input
                label="Transaction Reference / Receipt ID"
                placeholder="TXN-CASH-123456"
                value={customTxnId}
                onChange={(e) => setCustomTxnId(e.target.value)}
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedInvoiceForPayment(null)}
                  disabled={isSubmittingPayment}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmittingPayment}>
                  Confirm Payment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-100 text-left">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-sky-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">MediCare 2.0 Official Receipt</h3>
                  <p className="text-xs text-slate-500">Hospital Front-Desk Billing Summary</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-slate-500 block">Receipt ID</span>
                  <strong className="text-slate-900">{selectedReceipt.id}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Date</span>
                  <strong className="text-slate-900">{selectedReceipt.invoiceDate}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Patient Name</span>
                  <strong className="text-slate-900">{selectedReceipt.patientName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Payment Method</span>
                  <strong className="text-slate-900">{selectedReceipt.paymentMethod}</strong>
                </div>
              </div>

              {selectedReceipt.items && selectedReceipt.items.length > 0 && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1.5">Line Items / Charges:</span>
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {selectedReceipt.items.map((item, idx) => (
                      <div key={idx} className="p-2 flex justify-between">
                        <span className="text-slate-700">{item.description}</span>
                        <strong className="text-slate-900">{formatCurrency(item.amount)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Paid Amount:</span>
                  <strong className="text-emerald-800 text-sm font-black">{formatCurrency(selectedReceipt.totalAmount)}</strong>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Transaction Ref:</span>
                  <span>{selectedReceipt.transactionId}</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-700 font-bold text-[11px] pt-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Official Payment Verified</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedReceipt(null)}>
                Close
              </Button>
              <Button size="sm" variant="primary" icon={Printer} onClick={triggerWindowPrint}>
                Print Receipt
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
