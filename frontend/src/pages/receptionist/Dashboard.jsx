import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  UserCheck,
  PlusCircle,
  CreditCard,
  Clock,
  Users,
  AlertCircle,
  RotateCcw,
  Calendar,
  ChevronRight,
  Stethoscope,
  Bell,
  Search,
  CheckCircle2,
  FileText,
  User,
  Check,
  ExternalLink,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { DashboardHeader } from '../../components/dashboard/DashboardHeader';
import { StatCard } from '../../components/dashboard/StatCard';
import { DashboardSection } from '../../components/dashboard/DashboardSection';
import { QuickActionCard } from '../../components/dashboard/QuickActionCard';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { formatTime } from '../../utils/formatters';

const getTodayISTDate = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

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

const mapQueueAppointment = (apt) => {
  const patientName =
    apt.patient?.user?.full_name || apt.patient_name || apt.patientName || `Patient #${apt.patient_id || ''}`;
  const doctorName =
    apt.doctor?.user?.full_name || apt.doctor_name || apt.doctorName || 'Assigned Specialist';
  const specialty = apt.doctor?.specialty || apt.doctor?.specialization || 'OPD';
  const roomNo = apt.doctor?.room_no || apt.doctor?.roomNo || '101';
  const tokenNo = apt.token_no || apt.token || apt.tokenNo || '—';
  const timeStr = apt.start_time || apt.appointmentTime || '';

  return {
    id: apt.id,
    tokenNo,
    patientId: apt.patient_id || apt.patient?.id,
    patientName,
    doctorName,
    specialty,
    roomNo,
    appointmentDate: apt.appointment_date || '',
    appointmentTime: formatTime(timeStr) || 'Scheduled Slot',
    status: normalizeStatus(apt.status),
    rawStatus: apt.status,
    paymentStatus: normalizePaymentStatus(apt.payment_status || apt.paymentStatus),
    raw: apt,
  };
};

export const ReceptionistDashboard = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const [dashboardData, setDashboardData] = useState(null);
  const [doctorsList, setDoctorsList] = useState([]);
  const [recentPatients, setRecentPatients] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [updatingAptId, setUpdatingAptId] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      const todayIST = getTodayISTDate();
      const [dashResult, docsResult, patientsResult, notifsResult] = await Promise.allSettled([
        apiClient.get('/appointments/receptionist-dashboard', { params: { target_date: todayIST } }),
        apiClient.get('/doctors/'),
        apiClient.get('/patients/', { params: { limit: 5, sort_by: 'id', sort_order: 'desc' } }),
        apiClient.get('/notifications/'),
      ]);

      // 1. Dashboard Metrics & Queue
      if (dashResult.status === 'fulfilled') {
        setDashboardData(dashResult.value.data);
      } else if (dashResult.status === 'rejected') {
        throw new Error('Failed to load front-desk dashboard metrics.');
      }

      // 2. Doctors Roster & Availability
      if (docsResult.status === 'fulfilled') {
        const rawDocs = Array.isArray(docsResult.value.data) ? docsResult.value.data : [];
        setDoctorsList(rawDocs);
      }

      // 3. Recent Registered Patients
      if (patientsResult.status === 'fulfilled') {
        const rawPatients = Array.isArray(patientsResult.value.data) ? patientsResult.value.data : [];
        setRecentPatients(rawPatients);
      }

      // 4. Notifications
      if (notifsResult.status === 'fulfilled') {
        const rawNotifs = Array.isArray(notifsResult.value.data) ? notifsResult.value.data : [];
        setNotifications(rawNotifs);
      }
    } catch (err) {
      const detail = err.response?.data?.detail || err.detail || err.message || 'Failed to load front-desk metrics.';
      setErrorMsg(typeof detail === 'string' ? detail : 'Server connection error.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Check In Patient Handler
  const handleCheckIn = async (aptId) => {
    setUpdatingAptId(aptId);
    try {
      await apiClient.put(`/appointments/${aptId}`, { status: 'Checked In' });
      addToast('Patient marked as Checked In successfully!', 'success');
      await fetchDashboardData();
    } catch (err) {
      const detail = err.response?.data?.detail || err.detail || err.message || 'Failed to check in patient.';
      addToast(typeof detail === 'string' ? detail : 'Check-in failed', 'error');
    } finally {
      setUpdatingAptId(null);
    }
  };

  // Mark Notification Read
  const handleMarkNotificationRead = async (notifId) => {
    try {
      await apiClient.put(`/notifications/${notifId}?is_read=true`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      // silent fallback
    }
  };

  const queue = (dashboardData?.queue || []).map(mapQueueAppointment);
  const receptionistName = currentUser?.full_name || currentUser?.name || 'Front Desk Coordinator';
  const todayIST = getTodayISTDate();

  if (isLoading && !dashboardData) {
    return (
      <div className="space-y-6 text-left animate-pulse">
        <div className="h-36 rounded-3xl bg-slate-200" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-24 rounded-2xl bg-slate-200" />
          <div className="h-24 rounded-2xl bg-slate-200" />
          <div className="h-24 rounded-2xl bg-slate-200" />
          <div className="h-24 rounded-2xl bg-slate-200" />
        </div>
        <div className="h-64 rounded-3xl bg-slate-200" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* Header Banner */}
      <DashboardHeader
        title={`Front Desk Workspace`}
        subtitle={`Coordinator: ${receptionistName} • Counter Desk-01 • IST Date: ${todayIST}`}
        badgeText="Front Desk Operations Workspace"
        variant="amber"
        icon={UserCheck}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/receptionist/walk-in">
              <Button
                variant="outline"
                icon={PlusCircle}
                className="bg-white text-slate-900 border-white hover:bg-slate-100 font-bold shadow-xs text-xs"
              >
                New Walk-in Patient
              </Button>
            </Link>
            <Link to="/receptionist/billing">
              <Button
                variant="primary"
                icon={CreditCard}
                className="bg-amber-900 hover:bg-amber-950 text-white font-bold shadow-xs text-xs border border-amber-800"
              >
                Payment Counter
              </Button>
            </Link>
          </div>
        }
      />

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
          <Button size="sm" variant="outline" icon={RotateCcw} onClick={fetchDashboardData}>
            Retry
          </Button>
        </div>
      )}

      {/* Operational Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Total Patients"
          value={dashboardData?.today_total_patients ?? 0}
          subtitle={`Date: ${todayIST}`}
          icon={Users}
          variant="amber"
        />

        <StatCard
          title="Waiting / Checked-In"
          value={dashboardData?.checked_in_waiting_count ?? 0}
          subtitle="Arrivals Logged"
          icon={UserCheck}
          variant="teal"
        />

        <StatCard
          title="Upcoming Arrivals"
          value={dashboardData?.upcoming_arrivals_count ?? 0}
          subtitle="Scheduled Slots Today"
          icon={Clock}
          variant="sky"
        />

        <StatCard
          title="Collected Cash Revenue"
          value={dashboardData?.formatted_collected_revenue ?? '₹0'}
          subtitle="Today's Billing Counter"
          icon={CreditCard}
          variant="purple"
        />
      </div>

      {/* Main Grid: Front Desk Queue & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Front Desk Patient Queue & Doctor Availability */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Front Desk Queue */}
          <DashboardSection
            title="Today's Front Desk Patient Queue"
            subtitle={`Live arrival and check-in roster for ${todayIST}`}
            action={
              <Link to="/receptionist/queue" className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1">
                Manage Queue <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {queue.length > 0 ? (
              <div className="space-y-3">
                {queue.map((apt) => (
                  <div
                    key={apt.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      apt.status === 'Checked In'
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : apt.status === 'In Consultation'
                        ? 'bg-purple-50/40 border-purple-200'
                        : 'bg-white border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left: Token & Patient Info */}
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs border border-amber-200">
                          {apt.tokenNo}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-extrabold text-slate-900">{apt.patientName}</h4>
                            <StatusBadge status={apt.status} />
                            <Badge variant={apt.paymentStatus === 'Paid' ? 'emerald' : 'rose'}>
                              {apt.paymentStatus}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {apt.doctorName} ({apt.specialty}) &bull; Room {apt.roomNo} &bull; Slot: {apt.appointmentTime}
                          </p>
                        </div>
                      </div>

                      {/* Right: Check In Button */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        {apt.status === 'Scheduled' ? (
                          <Button
                            size="sm"
                            variant="primary"
                            icon={UserCheck}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                            isLoading={updatingAptId === apt.id}
                            onClick={() => handleCheckIn(apt.id)}
                          >
                            Mark Checked In
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-500 font-semibold px-3 py-1 bg-slate-100 rounded-lg">
                            {apt.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <Users className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">No patients in today's queue.</p>
                <p className="text-xs text-slate-500">Walk-in registrations and scheduled arrivals for today will appear here.</p>
              </div>
            )}
          </DashboardSection>

          {/* Doctor Roster & OPD Availability */}
          <DashboardSection
            title="Doctor Roster & OPD Availability"
            subtitle="Real-time shift schedules and OPD consultation rooms"
            action={
              <Link to="/receptionist/walk-in" className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1">
                Book Walk-in <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {doctorsList.length > 0 ? (
              <div className="space-y-3">
                {doctorsList.map((doc) => {
                  const name = doc.user?.full_name || `Dr. #${doc.id}`;
                  const specialty = doc.specialty || doc.specialization || 'General Practice';
                  const room = doc.room_no || doc.roomNo ? `Room ${doc.room_no || doc.roomNo}` : 'OPD Room';
                  const isAvailable = doc.is_available ?? true;

                  return (
                    <div
                      key={doc.id}
                      className="p-3.5 rounded-2xl border border-slate-100 bg-white flex items-center justify-between gap-4 hover:border-slate-200 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-800 text-xs font-bold flex items-center justify-center shrink-0">
                          <Stethoscope className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="text-sm font-extrabold text-slate-900">{name}</h5>
                          <p className="text-xs text-slate-500">
                            {specialty} &bull; <span className="font-semibold text-slate-700">{room}</span> &bull; Fee ₹{doc.consultation_fee || 500}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={isAvailable ? 'emerald' : 'rose'}>
                          {isAvailable ? 'Available' : 'On Leave'}
                        </Badge>
                        <Link to={`/receptionist/walk-in`}>
                          <Button size="sm" variant="outline" className="text-xs">
                            Book
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Stethoscope className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <p className="text-xs font-semibold text-slate-600">No doctor availability records found.</p>
              </div>
            )}
          </DashboardSection>
        </div>

        {/* Right Column (1 Col): Quick Actions, Recent Patients & Notifications */}
        <div className="space-y-6">
          {/* Quick Actions Grid */}
          <DashboardSection title="Front Desk Quick Actions">
            <div className="grid grid-cols-1 gap-3">
              <QuickActionCard
                title="New Walk-in Patient"
                description="Fast-track OPD registration"
                icon={PlusCircle}
                to="/receptionist/walk-in"
                variant="amber"
              />
              <QuickActionCard
                title="Check-In Queue"
                description="Log room arrivals"
                icon={UserCheck}
                to="/receptionist/queue"
                variant="teal"
              />
              <QuickActionCard
                title="Billing Counter"
                description="Issue receipts & collect cash"
                icon={CreditCard}
                to="/receptionist/billing"
                variant="purple"
              />
              <QuickActionCard
                title="Patient Directory"
                description="Search patient records"
                icon={Search}
                to="/receptionist/patients"
                variant="sky"
              />
              <QuickActionCard
                title="Master Roster"
                description="View all appointment slots"
                icon={Calendar}
                to="/receptionist/appointments"
                variant="amber"
              />
              <QuickActionCard
                title="My Profile"
                description="Receptionist account info"
                icon={User}
                to="/receptionist/profile"
                variant="teal"
              />
            </div>
          </DashboardSection>

          {/* Recent Registered Patients */}
          <DashboardSection
            title="Recent Patients"
            subtitle="Registered hospital registry"
            action={
              <Link to="/receptionist/patients" className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1">
                View Index <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {recentPatients.length > 0 ? (
              <div className="space-y-3">
                {recentPatients.slice(0, 5).map((p) => {
                  const patientName = p.user?.full_name || p.name || `Patient #${p.id}`;
                  const phone = p.user?.phone || p.phone || 'N/A';
                  const initials = patientName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <div
                      key={p.id}
                      className="p-3 rounded-2xl border border-slate-100 bg-white flex items-center justify-between gap-3 hover:border-slate-200 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-900">{patientName}</h5>
                          <p className="text-[11px] text-slate-500">
                            ID: #{p.id} &bull; Ph: {phone}
                          </p>
                        </div>
                      </div>
                      <Link to={`/receptionist/patients`}>
                        <Button size="sm" variant="ghost" icon={ExternalLink} className="text-slate-400 hover:text-amber-600" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Users className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <p className="text-xs font-semibold text-slate-600">No recent patients found.</p>
              </div>
            )}
          </DashboardSection>

          {/* Notifications */}
          <DashboardSection
            title="Front Desk Notifications"
            icon={Bell}
            subtitle="Arrival & system alerts"
          >
            {notifications.length > 0 ? (
              <div className="space-y-2.5">
                {notifications.slice(0, 4).map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-2xl border transition-all text-xs ${
                      !n.is_read ? 'bg-amber-50/40 border-amber-200' : 'bg-white border-slate-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="font-bold text-slate-900">{n.title}</h5>
                      {!n.is_read && (
                        <button
                          onClick={() => handleMarkNotificationRead(n.id)}
                          className="text-[10px] font-bold text-amber-700 hover:underline shrink-0"
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">{n.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Bell className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <p className="text-xs font-semibold text-slate-600">No recent notifications.</p>
              </div>
            )}
          </DashboardSection>
        </div>
      </div>
    </div>
  );
};

