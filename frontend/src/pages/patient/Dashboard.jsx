import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Pill,
  FileText,
  TestTube,
  CreditCard,
  PlusCircle,
  Stethoscope,
  AlertCircle,
  CheckCircle2,
  CheckCheck,
  User,
  Bell,
  Clock,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Check,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { formatCurrency, formatTime } from '../../utils/formatters';

// Shared Dashboard Foundation Components
import {
  DashboardHeader,
  StatCard,
  DashboardSection,
  QuickActionCard,
  StatusBadge,
} from '../../components/dashboard';

const formatNotificationTime = (isoString) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch (e) {
    return String(isoString);
  }
};

export const PatientDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [patientProfile, setPatientProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [updatingNotifId, setUpdatingNotifId] = useState(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      // 1. Fetch patient profile
      let currentPatient = null;
      try {
        const profileRes = await apiClient.get('/patients/');
        const profiles = Array.isArray(profileRes.data) ? profileRes.data : [];
        currentPatient = profiles.length > 0 ? profiles[0] : null;

        // Auto-provision profile if newly registered patient profile record missing
        if (!currentPatient && currentUser?.id) {
          try {
            const createRes = await apiClient.post('/patients/', { user_id: currentUser.id });
            currentPatient = createRes.data;
          } catch (e) {
            // Profile provisioning fallback
          }
        }
      } catch (err) {
        console.warn('Patient profile load warning:', err);
      }

      // 2. Concurrently fetch all patient resources independently via Promise.allSettled
      const results = await Promise.allSettled([
        apiClient.get('/appointments/', { params: { limit: 20, sort_by: 'appointment_date', sort_order: 'desc' } }),
        apiClient.get('/prescriptions/', { params: { limit: 5, sort_by: 'created_at', sort_order: 'desc' } }),
        apiClient.get('/lab-reports/', { params: { limit: 5, sort_by: 'created_at', sort_order: 'desc' } }),
        apiClient.get('/medical-records/', { params: { limit: 5, sort_by: 'created_at', sort_order: 'desc' } }),
        apiClient.get('/invoices/', { params: { limit: 5, sort_by: 'created_at', sort_order: 'desc' } }),
        apiClient.get('/notifications/', { params: { limit: 5, sort_by: 'created_at', sort_order: 'desc' } }),
      ]);

      setPatientProfile(currentPatient);
      setAppointments(results[0].status === 'fulfilled' && Array.isArray(results[0].value.data) ? results[0].value.data : []);
      setPrescriptions(results[1].status === 'fulfilled' && Array.isArray(results[1].value.data) ? results[1].value.data : []);
      setLabReports(results[2].status === 'fulfilled' && Array.isArray(results[2].value.data) ? results[2].value.data : []);
      setMedicalRecords(results[3].status === 'fulfilled' && Array.isArray(results[3].value.data) ? results[3].value.data : []);
      setInvoices(results[4].status === 'fulfilled' && Array.isArray(results[4].value.data) ? results[4].value.data : []);
      setNotifications(results[5].status === 'fulfilled' && Array.isArray(results[5].value.data) ? results[5].value.data : []);
    } catch (err) {
      const detail = err.detail || err.message || 'Failed to load patient health dashboard data.';
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to connect to backend server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser]);

  const handleMarkAsRead = async (notifId, e) => {
    if (e) e.stopPropagation();
    setUpdatingNotifId(notifId);
    try {
      const response = await apiClient.put(`/notifications/${notifId}?is_read=true`);
      const updatedItem = response.data;
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: updatedItem.is_read } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    } finally {
      setUpdatingNotifId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    try {
      await Promise.all(
        unread.map((n) => apiClient.put(`/notifications/${n.id}?is_read=true`))
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  // Find upcoming active appointments (SCHEDULED, CONFIRMED, IN_PROGRESS)
  const activeUpcomingAppointments = appointments.filter((a) => {
    const s = String(a.status || '').toUpperCase();
    return s === 'SCHEDULED' || s === 'CONFIRMED' || s === 'IN_PROGRESS';
  });

  const nextUpcomingApt = activeUpcomingAppointments.length > 0 ? activeUpcomingAppointments[0] : null;

  // Calculate stats
  const upcomingCount = activeUpcomingAppointments.length;
  const recordsCount = medicalRecords.length;
  const prescriptionsCount = prescriptions.length;
  const pendingInvoices = invoices.filter(
    (i) => String(i.payment_status || i.paymentStatus || '').toUpperCase() !== 'PAID'
  );
  const pendingBillsCount = pendingInvoices.length;

  const patientName = currentUser?.full_name || currentUser?.name || 'Patient';
  const medicalRecordId = patientProfile?.id ? `PAT-${patientProfile.id}` : `PAT-USER-${currentUser?.id || '0'}`;

  // Loading Skeleton View
  if (isLoading) {
    return (
      <div className="space-y-6 text-left animate-pulse">
        <div className="h-36 rounded-3xl bg-slate-200 w-full"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-24 rounded-2xl bg-slate-200"></div>
          <div className="h-24 rounded-2xl bg-slate-200"></div>
          <div className="h-24 rounded-2xl bg-slate-200"></div>
          <div className="h-24 rounded-2xl bg-slate-200"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-48 rounded-2xl bg-slate-200"></div>
            <div className="h-48 rounded-2xl bg-slate-200"></div>
          </div>
          <div className="h-96 rounded-2xl bg-slate-200"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
          <Button size="sm" variant="outline" icon={RotateCcw} onClick={fetchDashboardData}>
            Retry
          </Button>
        </div>
      )}

      {/* DASHBOARD HERO HEADER */}
      <DashboardHeader
        title={`Welcome back, ${patientName}!`}
        subtitle="Track your clinical consultations, digital prescriptions, lab reports, and billing status."
        badgeText={`Patient Portal • Medical Record ID: ${medicalRecordId}`}
        variant="sky"
        action={
          <Link to="/patient/book-appointment">
            <Button
              variant="outline"
              icon={PlusCircle}
              className="bg-white text-slate-900 border-white hover:bg-slate-100 hover:text-slate-900 font-bold shadow-md"
            >
              Book Appointment
            </Button>
          </Link>
        }
      />

      {/* STAT CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Upcoming Appointments"
          value={upcomingCount}
          subtitle={upcomingCount > 0 ? 'Next consultation scheduled' : 'No pending slots'}
          icon={Calendar}
          variant="sky"
          onClick={() => navigate('/patient/appointments')}
        />
        <StatCard
          title="Medical Records"
          value={recordsCount}
          subtitle="Clinical reports & history"
          icon={FileText}
          variant="teal"
          onClick={() => navigate('/patient/medical-records')}
        />
        <StatCard
          title="Active Prescriptions"
          value={prescriptionsCount}
          subtitle="Digital e-Prescriptions"
          icon={Pill}
          variant="amber"
          onClick={() => navigate('/patient/prescriptions')}
        />
        <StatCard
          title="Pending Invoices"
          value={pendingBillsCount}
          subtitle={pendingBillsCount > 0 ? 'Unpaid balance pending' : 'All bills settled'}
          change={pendingBillsCount > 0 ? 'Action required' : 'Paid'}
          changeType={pendingBillsCount > 0 ? 'negative' : 'positive'}
          icon={CreditCard}
          variant="purple"
          onClick={() => navigate('/patient/invoices')}
        />
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN (8 cols): Next Appointment & Healthcare Summaries */}
        <div className="lg:col-span-8 space-y-6">
          {/* NEXT UPCOMING APPOINTMENT */}
          <DashboardSection
            title="Next Upcoming Appointment"
            subtitle="Your nearest scheduled healthcare consultation"
            action={
              <Link to="/patient/appointments" className="text-xs font-bold text-sky-600 hover:underline">
                View All Appointments &rarr;
              </Link>
            }
          >
            {nextUpcomingApt ? (
              <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-900">
                      {nextUpcomingApt.doctor?.user?.full_name || nextUpcomingApt.doctorName || `Doctor #${nextUpcomingApt.doctor_id}`}
                    </h4>
                    <span className="text-xs font-bold text-sky-600">
                      {nextUpcomingApt.doctor?.specialization || nextUpcomingApt.specialty || 'General Medicine'}
                      {nextUpcomingApt.doctor?.room_no ? ` • Room ${nextUpcomingApt.doctor.room_no}` : ''}
                    </span>
                    <p className="text-xs text-slate-600 mt-1">{nextUpcomingApt.reason || 'Routine Consultation'}</p>
                  </div>
                </div>

                <div className="text-right sm:border-l sm:border-sky-200 sm:pl-4 self-end sm:self-center">
                  <span className="block text-sm font-bold text-slate-900">
                    {nextUpcomingApt.appointment_date || nextUpcomingApt.appointmentDate}
                  </span>
                  <span className="text-xs text-slate-500 font-medium block">
                    {formatTime(nextUpcomingApt.start_time || nextUpcomingApt.appointmentTime)}
                  </span>
                  <div className="mt-1">
                    <StatusBadge status={nextUpcomingApt.status} />
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Calendar}
                title="No upcoming appointments"
                description="You don't have any scheduled appointments coming up. Book a slot with our specialist doctors."
                action={
                  <Link to="/patient/book-appointment">
                    <Button variant="primary" size="sm" icon={PlusCircle}>
                      Book Appointment Now
                    </Button>
                  </Link>
                }
              />
            )}
          </DashboardSection>

          {/* RECENT APPOINTMENTS */}
          <DashboardSection
            title="Recent Consultations"
            action={
              <Link to="/patient/appointments" className="text-xs font-bold text-sky-600 hover:underline">
                Full History &rarr;
              </Link>
            }
          >
            {appointments.length > 0 ? (
              <div className="space-y-3">
                {appointments.slice(0, 3).map((apt) => (
                  <div
                    key={apt.id}
                    className="p-3.5 rounded-xl border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <Calendar className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900">
                          {apt.doctor?.user?.full_name || apt.doctorName || `Doctor #${apt.doctor_id}`}
                        </h5>
                        <span className="text-[11px] text-slate-500 block">
                          {apt.appointment_date || apt.appointmentDate} &bull; {apt.reason || 'Consultation'}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={apt.status} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Calendar}
                title="No appointment history"
                description="Your past consultation records will appear here."
              />
            )}
          </DashboardSection>

          {/* RECENT PRESCRIPTIONS */}
          <DashboardSection
            title="Recent Digital Prescriptions"
            action={
              <Link to="/patient/prescriptions" className="text-xs font-bold text-sky-600 hover:underline">
                View All e-Rx &rarr;
              </Link>
            }
          >
            {prescriptions.length > 0 ? (
              <div className="space-y-3">
                {prescriptions.slice(0, 3).map((rx) => (
                  <div
                    key={rx.id}
                    className="p-3.5 rounded-xl border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Pill className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900">{rx.diagnosis || 'Clinical e-Prescription'}</h5>
                        <span className="text-[11px] text-slate-500 block">
                          Prescribed on {rx.created_at ? formatNotificationTime(rx.created_at) : 'Recent'}
                        </span>
                      </div>
                    </div>
                    <Badge variant="emerald">
                      {Array.isArray(rx.items) ? rx.items.length : 1} Medication(s)
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Pill}
                title="No digital prescriptions"
                description="Prescriptions issued by your attending doctors will appear here."
              />
            )}
          </DashboardSection>

          {/* RECENT LAB REPORTS */}
          <DashboardSection
            title="Recent Lab Diagnostic Reports"
            action={
              <Link to="/patient/lab-reports" className="text-xs font-bold text-sky-600 hover:underline">
                View All Reports &rarr;
              </Link>
            }
          >
            {labReports.length > 0 ? (
              <div className="space-y-3">
                {labReports.slice(0, 3).map((lab) => (
                  <div
                    key={lab.id}
                    className="p-3.5 rounded-xl border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <TestTube className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900">{lab.test_name || lab.testName || 'Lab Diagnostic Test'}</h5>
                        <span className="text-[11px] text-slate-500 block">
                          Report Date: {lab.created_at ? formatNotificationTime(lab.created_at) : 'Recent'}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={lab.status || 'COMPLETED'} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={TestTube}
                title="No lab reports available"
                description="Your laboratory diagnostic test results will be published here."
              />
            )}
          </DashboardSection>
        </div>

        {/* RIGHT COLUMN (4 cols): Billing, Notifications & Quick Actions */}
        <div className="lg:col-span-4 space-y-6">
          {/* BILLING & INVOICE SUMMARY */}
          <DashboardSection
            title="Billing & Invoices"
            action={
              <Link to="/patient/invoices" className="text-xs font-bold text-sky-600 hover:underline">
                View Bills &rarr;
              </Link>
            }
          >
            {invoices.length > 0 ? (
              <div className="space-y-3">
                {invoices.slice(0, 3).map((inv) => {
                  const isPaid = String(inv.payment_status || inv.paymentStatus || '').toUpperCase() === 'PAID';
                  return (
                    <div
                      key={inv.id}
                      className="p-3 rounded-xl border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          Invoice #{inv.id}
                        </span>
                        <span className="text-[11px] font-extrabold text-slate-800 block">
                          {formatCurrency(inv.total_amount || inv.totalAmount || 0)}
                        </span>
                      </div>
                      <Badge variant={isPaid ? 'emerald' : 'rose'}>
                        {isPaid ? 'Paid' : 'Unpaid'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={CreditCard}
                title="No billing records"
                description="Your consultation invoices and payment receipts will appear here."
              />
            )}
          </DashboardSection>

          {/* NOTIFICATIONS WIDGET */}
          <DashboardSection
            title="Notifications"
            action={
              notifications.filter((n) => !n.is_read).length > 0 ? (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-[11px] font-bold text-sky-600 hover:underline cursor-pointer"
                >
                  Mark all read
                </button>
              ) : (
                <Link to="/patient/notifications" className="text-xs font-bold text-sky-600 hover:underline">
                  All &rarr;
                </Link>
              )
            }
          >
            {notifications.length > 0 ? (
              <div className="space-y-2.5 divide-y divide-slate-100">
                {notifications.slice(0, 3).map((notif) => {
                  const isUnread = !notif.is_read;
                  return (
                    <div
                      key={notif.id}
                      onClick={() => isUnread && handleMarkAsRead(notif.id)}
                      className={`pt-2.5 first:pt-0 flex items-start justify-between gap-2 cursor-pointer transition-colors ${
                        isUnread ? 'font-medium' : 'opacity-80'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h5 className={`text-xs ${isUnread ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
                            {notif.title}
                          </h5>
                          {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{notif.message}</p>
                        <span className="text-[10px] text-slate-400 font-medium block mt-1">
                          {formatNotificationTime(notif.created_at)}
                        </span>
                      </div>
                      {isUnread && (
                        <button
                          onClick={(e) => handleMarkAsRead(notif.id, e)}
                          className="p-1 text-slate-400 hover:text-sky-600 rounded-md shrink-0 cursor-pointer"
                          title="Mark read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={Bell}
                title="No notifications"
                description="Important healthcare alerts and updates will appear here."
              />
            )}
          </DashboardSection>

          {/* QUICK ACTIONS GRID */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-left px-1">
              Quick Patient Actions
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              <QuickActionCard
                title="Book New Appointment"
                description="Schedule consultation slot"
                icon={PlusCircle}
                to="/patient/book-appointment"
                variant="sky"
              />
              <QuickActionCard
                title="My Appointments"
                description="View scheduled consultations"
                icon={Calendar}
                to="/patient/appointments"
                variant="teal"
              />
              <QuickActionCard
                title="Medical Records"
                description="Access history & records"
                icon={FileText}
                to="/patient/medical-records"
                variant="purple"
              />
              <QuickActionCard
                title="Prescriptions"
                description="Download digital e-Prescriptions"
                icon={Pill}
                to="/patient/prescriptions"
                variant="amber"
              />
              <QuickActionCard
                title="My Profile"
                description="View & update profile"
                icon={User}
                to="/patient/profile"
                variant="sky"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
