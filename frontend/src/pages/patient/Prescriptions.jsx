import React, { useState, useEffect } from 'react';
import { Pill, Download, Eye, AlertCircle, Search, RotateCcw, ArrowLeft, ArrowRight } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

const mapPrescriptionData = (rx, currentUser) => {
  const dateStr = rx.created_at
    ? String(rx.created_at).split('T')[0]
    : rx.issued_date || rx.issuedDate || new Date().toISOString().split('T')[0];

  const docName =
    rx.doctor?.user?.full_name || rx.doctor_name || rx.doctorName || `Doctor #${rx.doctor_id || ''}`;

  const patName =
    rx.patient?.user?.full_name || currentUser?.full_name || currentUser?.name || 'Authenticated Patient';

  const mappedItems = Array.isArray(rx.items)
    ? rx.items.map((item) => ({
        medicineName: item.medicine_name || item.medicineName || 'Medication',
        dosage: item.dosage || 'As prescribed',
        frequency: item.frequency || 'Daily',
        durationDays: item.duration_days ?? item.durationDays ?? 5,
      }))
    : [];

  return {
    id: rx.id,
    diagnosis: rx.diagnosis || 'Clinical Prescription',
    doctorName: docName,
    patientName: patName,
    issuedDate: dateStr,
    notes: rx.notes || 'No special instructions provided.',
    items: mappedItems,
    created_at: rx.created_at,
  };
};

export const PatientPrescriptions = () => {
  const { currentUser } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeRx, setActiveRx] = useState(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Sorting state
  const [sortOption, setSortOption] = useState('created_at:desc');

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
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

  // 2. Fetch Prescriptions from Backend
  const fetchPrescriptions = async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('page_size', pageSize);

      if (debouncedSearch.trim()) {
        params.append('search', debouncedSearch.trim());
      }

      if (sortOption) {
        const [sortBy, sortOrder] = sortOption.split(':');
        if (sortBy) {
          params.append('sort_by', sortBy);
          params.append('sort_order', sortOrder || 'desc');
        }
      }

      const response = await apiClient.get(`/prescriptions/?${params.toString()}`);
      const rawData = Array.isArray(response.data) ? response.data : [];

      const mapped = rawData.map((rx) => mapPrescriptionData(rx, currentUser));
      setPrescriptions(mapped);

      // Parse pagination headers
      const countHeader = response.headers['x-total-count'];
      const pagesHeader = response.headers['x-total-pages'];
      const parsedCount = countHeader !== undefined ? parseInt(countHeader, 10) : rawData.length;
      const parsedPages = pagesHeader !== undefined ? parseInt(pagesHeader, 10) : 1;

      setTotalCount(isNaN(parsedCount) ? rawData.length : parsedCount);
      setTotalPages(isNaN(parsedPages) ? 1 : Math.max(1, parsedPages));
    } catch (err) {
      const detail = err.detail || err.message || 'Failed to load digital prescriptions.';
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to connect to server.');
      setPrescriptions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, [currentUser, page, pageSize, debouncedSearch, sortOption]);

  const handleReset = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSortOption('created_at:desc');
    setPage(1);
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Digital Prescriptions</h1>
        <p className="text-xs text-slate-500">Issued medication schedules and dosage guidelines</p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
          <Button size="sm" variant="outline" icon={RotateCcw} onClick={fetchPrescriptions}>
            Retry
          </Button>
        </div>
      )}

      {/* Control Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
          <Input
            placeholder="Search by diagnosis, doctor, medicine..."
            icon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <Select
            options={[
              { label: 'Newest First', value: 'created_at:desc' },
              { label: 'Oldest First', value: 'created_at:asc' },
              { label: 'Diagnosis (A-Z)', value: 'diagnosis:asc' },
              { label: 'Prescription ID (Desc)', value: 'id:desc' },
            ]}
            placeholder="Sort Prescriptions"
            value={sortOption}
            onChange={(e) => {
              setSortOption(e.target.value);
              setPage(1);
            }}
          />

          <div className="flex justify-end">
            {(searchTerm || sortOption !== 'created_at:desc') && (
              <Button size="sm" variant="outline" icon={RotateCcw} onClick={handleReset}>
                Reset Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Prescription Grid / Empty State */}
      {isLoading ? (
        <LoadingSpinner label="Fetching your digital prescriptions..." />
      ) : prescriptions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {prescriptions.map((rx) => (
            <Card key={rx.id} title={rx.diagnosis} subtitle={`Prescribed by ${rx.doctorName} on ${rx.issuedDate}`}>
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                  <span className="font-semibold text-slate-800 block">Doctor Notes:</span>
                  {rx.notes}
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Medication Schedule:</span>
                  {rx.items.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg border border-slate-200/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 block">{item.medicineName}</span>
                        <span className="text-slate-500">{item.dosage} &bull; {item.frequency}</span>
                      </div>
                      <Badge variant="sky">{item.durationDays} Days</Badge>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-end">
                  <Button size="sm" variant="outline" icon={Eye} onClick={() => setActiveRx(rx)}>
                    View Full Slip
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <Pill className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No prescriptions found.</p>
          <p className="text-xs text-slate-500 mt-1">Issued medication schedules will appear here after consultations.</p>
          {(searchTerm || sortOption !== 'created_at:desc') && (
            <div className="mt-4">
              <Button size="sm" variant="outline" icon={RotateCcw} onClick={handleReset}>
                Reset Search Filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Pagination Footer */}
      {!isLoading && prescriptions.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Show per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value={5}>5</option>
              <option value={6}>6</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
            <span className="text-slate-500">
              Showing {prescriptions.length} of {totalCount} prescriptions
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

      {/* Modal View */}
      <Modal isOpen={!!activeRx} onClose={() => setActiveRx(null)} title="Electronic Prescription Slip" size="md">
        {activeRx && (
          <div className="space-y-6 text-xs text-left">
            <div className="p-4 rounded-xl bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h4 className="font-bold text-base">MediCare 2.0 e-Rx Slip</h4>
                <span>Rx ID: #{activeRx.id} &bull; Date: {activeRx.issuedDate}</span>
              </div>
              <Badge variant="emerald">Signed Digitally</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-slate-500 block">Patient Name:</span>
                <strong className="text-slate-900">{activeRx.patientName}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Doctor:</span>
                <strong className="text-slate-900">{activeRx.doctorName}</strong>
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-800 block mb-2">Diagnosis:</span>
              <p className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-sky-900 font-medium">
                {activeRx.diagnosis}
              </p>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-slate-800 block">Rx Items:</span>
              {activeRx.items.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <strong className="text-slate-900 block">{item.medicineName}</strong>
                    <span className="text-slate-500">{item.dosage} - {item.frequency}</span>
                  </div>
                  <Badge variant="teal">{item.durationDays} Days</Badge>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button variant="primary" icon={Download} onClick={() => setActiveRx(null)}>
                Download PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

