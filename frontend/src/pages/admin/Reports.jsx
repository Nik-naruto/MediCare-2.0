import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Download, AlertCircle, RotateCcw, Filter, DollarSign, Users } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useToast } from '../../context/ToastContext';

const MONTH_NAMES = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export const Reports = () => {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Filters State
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Data State
  const [departmentsList, setDepartmentsList] = useState([]);
  const [reportData, setReportData] = useState(null);

  // Fetch departments list for the filter dropdown
  const fetchDepartments = async () => {
    try {
      const res = await apiClient.get('/departments/');
      const raw = Array.isArray(res.data) ? res.data : [];
      setDepartmentsList(raw);
    } catch (err) {
      console.error('Failed to fetch departments list for reports filter:', err);
    }
  };

  // Fetch backend DB-aggregated report payload
  const fetchReportsData = async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      const params = {};
      if (monthFilter) params.month = Number(monthFilter);
      if (yearFilter) params.year = Number(yearFilter);
      if (deptFilter) params.department_id = Number(deptFilter);

      const res = await apiClient.get('/reports/summary', { params });
      setReportData(res.data);
    } catch (err) {
      const detail = err.response?.data?.detail || err.detail || err.message || 'Failed to load report analytics data.';
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchReportsData();
  }, [monthFilter, yearFilter, deptFilter]);

  const handleResetFilters = () => {
    setMonthFilter('');
    setYearFilter('');
    setDeptFilter('');
  };

  const handleExportCSV = () => {
    if (!reportData) {
      addToast('No report data available to export.', 'error');
      return;
    }

    const escapeCsv = (str) => `"${String(str || '').replace(/"/g, '""')}"`;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `${escapeCsv('HOSPITAL FINANCIAL & OPERATIONAL MASTER ANALYTICS REPORT')}\n`;
    csvContent += `${escapeCsv('Period Label:')},${escapeCsv(reportData.filter_info?.period_label)}\n`;
    csvContent += `${escapeCsv('Total Paid Revenue:')},${escapeCsv(reportData.formatted_total_revenue)}\n`;
    csvContent += `${escapeCsv('Total Consultations:')},${reportData.total_consultations}\n\n`;

    csvContent += `${escapeCsv('REVENUE BREAKDOWN BY DEPARTMENT')}\n`;
    csvContent += 'Department,Revenue (INR),Percentage (%)\n';
    (reportData.revenue_breakdown || []).forEach((r) => {
      csvContent += `${escapeCsv(r.name)},${r.amount},${r.percentage}%\n`;
    });

    csvContent += `\n${escapeCsv('PEAK CONSULTATION HOURS')}\n`;
    csvContent += 'Time Slot,Total Consultations\n';
    (reportData.peak_hours || []).forEach((p) => {
      csvContent += `${escapeCsv(p.label)},${p.count}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hospital_master_analytics_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast('Master CSV report downloaded successfully.', 'success');
  };

  const revenueBreakdown = reportData?.revenue_breakdown || [];
  const peakHours = reportData?.peak_hours || [];
  const periodLabel = reportData?.filter_info?.period_label || 'Revenue Breakdown by Department';

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Financial & Operational Analytics</h1>
          <p className="text-xs text-slate-500">Database-accurate revenue aggregations, consultation footfall, and operational metrics</p>
        </div>
        <Button variant="primary" icon={Download} onClick={handleExportCSV} disabled={isLoading || !reportData}>
          Export Master CSV Report
        </Button>
      </div>

      {/* Filter Controls Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-700">
          <Filter className="w-4 h-4 text-sky-600" />
          <span>Report Period & Department Filters:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Selector */}
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
          >
            <option value="">All Months</option>
            {MONTH_NAMES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          {/* Year Selector */}
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
          >
            <option value="">All Years</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>

          {/* Department Selector */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none max-w-[200px] truncate"
          >
            <option value="">All Departments</option>
            {departmentsList.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>

          {/* Reset Filters */}
          {(monthFilter || yearFilter || deptFilter) && (
            <Button size="sm" variant="outline" icon={RotateCcw} onClick={handleResetFilters}>
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
          <Button size="sm" variant="outline" icon={RotateCcw} onClick={fetchReportsData}>
            Retry
          </Button>
        </div>
      )}

      {/* Overview Cards Bar */}
      {reportData && !isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-700">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-emerald-800 font-medium">Total Paid Revenue</p>
                <p className="text-lg font-black text-emerald-950 tracking-tight">{reportData.formatted_total_revenue}</p>
              </div>
            </div>
            <Badge variant="emerald">Database Accurate</Badge>
          </div>

          <div className="p-4 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-700">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-sky-800 font-medium">Total Consultations</p>
                <p className="text-lg font-black text-sky-950 tracking-tight">{reportData.total_consultations}</p>
              </div>
            </div>
            <Badge variant="sky">Non-Cancelled</Badge>
          </div>
        </div>
      )}

      {/* Main Reports Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title={periodLabel}>
          {isLoading ? (
            <div className="p-4 text-center text-xs text-slate-400">Loading department revenue data...</div>
          ) : revenueBreakdown.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">No revenue data available for the selected period.</div>
          ) : (
            <div className="space-y-4 text-xs">
              {revenueBreakdown.map((dept, index) => (
                <div
                  key={dept.name}
                  className={`flex justify-between items-center ${
                    index < revenueBreakdown.length - 1 ? 'pb-2 border-b border-slate-100' : ''
                  }`}
                >
                  <span className="font-semibold text-slate-700">{dept.name}</span>
                  <strong className="text-slate-900">
                    {dept.formatted_amount} ({dept.percentage}%)
                  </strong>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Peak Consultation Hours">
          {isLoading ? (
            <div className="p-4 text-center text-xs text-slate-400">Loading consultation volume data...</div>
          ) : peakHours.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">No sufficient consultation data available.</div>
          ) : (
            <div className="space-y-3 text-xs">
              {peakHours.map((peak, idx) => {
                const variant = idx === 0 ? 'sky' : idx === 1 ? 'teal' : 'indigo';
                const bgClass = idx === 0 ? 'bg-sky-50 border-sky-100' : idx === 1 ? 'bg-teal-50 border-teal-100' : 'bg-slate-50 border-slate-100';
                const textClass = idx === 0 ? 'text-sky-900' : idx === 1 ? 'text-teal-900' : 'text-slate-800';

                return (
                  <div key={peak.label} className={`p-3 rounded-xl border flex justify-between items-center ${bgClass}`}>
                    <span className={`font-bold ${textClass}`}>{peak.label}</span>
                    <Badge variant={variant}>{peak.count} Consultations</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
