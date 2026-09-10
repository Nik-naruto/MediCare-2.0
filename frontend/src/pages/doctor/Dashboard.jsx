import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Clock,
  Calendar,
  CheckCircle2,
  Stethoscope,
  PlayCircle,
  AlertCircle,
  RotateCcw,
  FileText,
  Pill,
  Bell,
  ChevronRight,
  Activity,
  User,
  Check,
  ExternalLink,
  PlusCircle,
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

const getTodayDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const mapAppointment = (apt) => {
  const patientName =
    apt.patient?.user?.full_name || apt.patient_name || apt.patientName || `Patient #${apt.patient_id || ''}`;
  const tokenNo = apt.token_no || apt.token || apt.tokenNo || '—';
  const dateStr = apt.appointment_date || apt.appointmentDate || '';
  const timeStr = apt.start_time || apt.appointmentTime || '';

  return {
    id: apt.id,
    tokenNo,
    patientId: apt.patient_id || apt.patient?.id,
    patientName,
    reason: apt.reason || 'General Consultation',
    appointmentDate: dateStr,
    appointmentTime: formatTime(timeStr) || 'Scheduled Time',
    status: normalizeStatus(apt.status),
    rawStatus: apt.status,
    patientGender: apt.patient?.gender || '',
    patientBloodGroup: apt.patient?.blood_group || '',
    raw: apt,
  };
};

export const DoctorDashboard = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [doctorProfile, setDoctorProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [connectedPatients, setConnectedPatients] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [updatingAptId, setUpdatingAptId] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      const [docsResult, aptsResult, patientsResult, notifsResult] = await Promise.allSettled([
        apiClient.get('/doctors/'),
        apiClient.get('/appointments/'),
        apiClient.get('/patients/'),
        apiClient.get('/notifications/'),
      ]);

      // 1. Doctor Profile
      if (docsResult.status === 'fulfilled') {
        const docsList = Array.isArray(docsResult.value.data) ? docsResult.value.data : [];
        const matchedProfile = docsList.find(
          (d) => d.user_id === currentUser?.id || d.user?.id === currentUser?.id
        );
        setDoctorProfile(matchedProfile || null);
      }

      // 2. Appointments
      if (aptsResult.status === 'fulfilled') {
        const rawApts = Array.isArray(aptsResult.value.data) ? aptsResult.value.data : [];
        setAppointments(rawApts.map(mapAppointment));
      } else if (aptsResult.status === 'rejected') {
        throw new Error('Failed to fetch appointment queue.');
      }

      // 3. Connected Patients
      if (patientsResult.status === 'fulfilled') {
        const rawPatients = Array.isArray(patientsResult.value.data) ? patientsResult.value.data : [];
        setConnectedPatients(rawPatients);
      }

      // 4. Notifications
      if (notifsResult.status === 'fulfilled') {
        const rawNotifs = Array.isArray(notifsResult.value.data) ? notifsResult.value.data : [];
        setNotifications(rawNotifs);
      }
    } catch (err) {
      const detail = err.detail || err.message || 'Failed to load doctor workspace data.';
      setErrorMsg(typeof detail === 'string' ? detail : 'Server connection error.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Appointment Status Transition Handler
  const handleUpdateStatus = async (appointmentId, newStatus) => {
    setUpdatingAptId(appointmentId);
    try {
      await apiClient.put(`/appointments/${appointmentId}/status`, { status: newStatus });
      const statusLabel = newStatus.replace('_', ' ');
      addToast(`Appointment status updated to ${statusLabel}.`, 'success');
      
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointmentId
            ? { ...apt, rawStatus: newStatus, status: normalizeStatus(newStatus) }
            : apt
        )
      );
    } catch (err) {
      const detail = err.detail || err.message || 'Failed to update consultation status.';
      addToast(typeof detail === 'string' ? detail : 'Update failed', 'error');
    } finally {
      setUpdatingAptId(null);
    }
  };

  // Mark single notification read
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

  const todayStr = getTodayDateStr();

  // Filter Today vs Upcoming
  const todayAppointments = appointments.filter((apt) => {
    const aptDate = apt.appointmentDate ? String(apt.appointmentDate).split('T')[0] : '';
    return aptDate === todayStr;
  });

  const upcomingAppointments = appointments.filter((apt) => {
    const aptDate = apt.appointmentDate ? String(apt.appointmentDate).split('T')[0] : '';
    return aptDate > todayStr && apt.status !== 'Cancelled';
  });

  // Today Queue Counts
  const todayTotal = todayAppointments.length;
  const waitingQueue = todayAppointments.filter(
    (a) => a.status === 'Scheduled' || a.status === 'Checked In'
  );
  const inConsultationQueue = todayAppointments.filter((a) => a.status === 'In Consultation');
  const completedToday = todayAppointments.filter((a) => a.status === 'Completed');

  // Doctor Details
  const docName = doctorProfile?.user?.full_name || currentUser?.full_name || 'Dr. Specialist';
  const docSpecialty = doctorProfile?.specialty || doctorProfile?.specialization || 'General OPD';
  const docQualification = doctorProfile?.qualification || 'MBBS, MD';
  const docRoom = doctorProfile?.room_no || doctorProfile?.roomNo ? `Room ${doctorProfile.room_no || doctorProfile.roomNo}` : 'OPD Room 102';

  // Derived distinct connected patient list if endpoint returns partial
  const uniquePatients = connectedPatients.length > 0 ? connectedPatients : Array.from(
    new Map(
      appointments.map((a) => [
        a.patientId,
        {
          id: a.patientId,
          user: { full_name: a.patientName },
          gender: a.patientGender,
          blood_group: a.patientBloodGroup,
        },
      ])
    ).values()
  ).filter((p) => p.id);

  if (isLoading) {
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
        title={`Welcome, ${docName}`}
        subtitle={`${docSpecialty} • ${docQualification} • ${docRoom}`}
        badgeText="Doctor Daily Practice Workspace"
        variant="teal"
        icon={Stethoscope}
        action={
          <div className="flex items-center gap-3">
            <Link to="/doctor/schedule">
              <Button
                variant="outline"
                icon={Calendar}
                className="bg-white text-slate-900 border-white hover:bg-slate-100 font-bold shadow-xs text-xs"
              >
                My Schedule
              </Button>
            </Link>
            <Link to="/doctor/appointments">
              <Button
                variant="primary"
                icon={Users}
                className="bg-teal-900 hover:bg-teal-950 text-white font-bold shadow-xs text-xs border border-teal-800"
              >
                Appointments Roster
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

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Appointments"
          value={todayTotal}
          subtitle={`Date: ${todayStr}`}
          icon={Calendar}
          variant="teal"
        />

        <StatCard
          title="Waiting Queue"
          value={waitingQueue.length}
          subtitle={`${todayAppointments.filter((a) => a.status === 'Checked In').length} Checked In`}
          icon={Clock}
          variant="amber"
        />

        <StatCard
          title="Completed Today"
          value={completedToday.length}
          subtitle={`${inConsultationQueue.length} In Progress`}
          icon={CheckCircle2}
          variant="sky"
        />

        <StatCard
          title="Connected Patients"
          value={uniquePatients.length}
          subtitle="Clinical Registry"
          icon={Users}
          variant="purple"
        />
      </div>

      {/* Main Grid: Queue & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Today's Patient Queue */}
        <div className="lg:col-span-2 space-y-6">
          <DashboardSection
            title="Today's Patient Queue"
            subtitle={`Consultation management for today (${todayStr})`}
            action={
              <Link to="/doctor/appointments" className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1">
                View Roster <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {todayAppointments.length > 0 ? (
              <div className="space-y-3">
                {todayAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      apt.status === 'In Consultation'
                        ? 'bg-purple-50/50 border-purple-200 ring-1 ring-purple-200'
                        : apt.status === 'Checked In'
                        ? 'bg-teal-50/30 border-teal-200'
                        : 'bg-white border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left: Patient info */}
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {apt.tokenNo}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-extrabold text-slate-900">{apt.patientName}</h4>
                            <StatusBadge status={apt.status} />
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Slot: <span className="font-semibold text-slate-700">{apt.appointmentTime}</span> &bull; Reason: {apt.reason}
                          </p>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        {apt.status === 'Checked In' || apt.status === 'Scheduled' ? (
                          <Button
                            size="sm"
                            variant="primary"
                            icon={PlayCircle}
                            className="bg-teal-600 hover:bg-teal-700 text-white font-bold"
                            isLoading={updatingAptId === apt.id}
                            onClick={() => handleUpdateStatus(apt.id, 'IN_CONSULTATION')}
                          >
                            Start Consultation
                          </Button>
                        ) : apt.status === 'In Consultation' ? (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            icon={Check}
                            isLoading={updatingAptId === apt.id}
                            onClick={() => handleUpdateStatus(apt.id, 'COMPLETED')}
                          >
                            Complete
                          </Button>
                        ) : null}

                        <Link to={`/doctor/consultation/${apt.id}`}>
                          <Button size="sm" variant="outline" icon={Stethoscope} className="font-semibold">
                            Consultation Room
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <Users className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">No patients in today's consultation queue.</p>
                <p className="text-xs text-slate-500">Scheduled patient consultations for today will appear here.</p>
              </div>
            )}
          </DashboardSection>

          {/* Upcoming Appointments */}
          <DashboardSection
            title="Upcoming Appointments"
            subtitle="Consultations scheduled after today"
            action={
              <Link to="/doctor/appointments" className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {upcomingAppointments.length > 0 ? (
              <div className="space-y-3">
                {upcomingAppointments.slice(0, 5).map((apt) => (
                  <div
                    key={apt.id}
                    className="p-3.5 rounded-2xl border border-slate-100 bg-white flex items-center justify-between gap-4 hover:border-slate-200 transition-all"
                  >
                    <div>
                      <h5 className="text-sm font-bold text-slate-900">{apt.patientName}</h5>
                      <p className="text-xs text-slate-500">
                        Date: <span className="font-semibold text-slate-700">{apt.appointmentDate}</span> &bull; Time: {apt.appointmentTime}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={apt.status} />
                      <Link to={`/doctor/consultation/${apt.id}`}>
                        <Button size="sm" variant="ghost" icon={ExternalLink} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Calendar className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <p className="text-xs font-semibold text-slate-600">No upcoming appointments scheduled.</p>
              </div>
            )}
          </DashboardSection>
        </div>

        {/* Right Column (1 Col): Quick Actions, Connected Patients & Notifications */}
        <div className="space-y-6">
          {/* Quick Actions Grid */}
          <DashboardSection title="Quick Actions">
            <div className="grid grid-cols-1 gap-3">
              <QuickActionCard
                title="Today's Appointments"
                description="Manage queue and consultations"
                icon={Calendar}
                to="/doctor/appointments"
                variant="teal"
              />
              <QuickActionCard
                title="Patient List"
                description="Clinical patient directory"
                icon={Users}
                to="/doctor/patients"
                variant="sky"
              />
              <QuickActionCard
                title="Prescriptions"
                description="Issue and view prescriptions"
                icon={Pill}
                to="/doctor/prescriptions"
                variant="amber"
              />
              <QuickActionCard
                title="My Schedule"
                description="Configure working days & slots"
                icon={Clock}
                to="/doctor/schedule"
                variant="purple"
              />
              <QuickActionCard
                title="My Profile"
                description="Doctor clinical profile"
                icon={User}
                to="/doctor/profile"
                variant="teal"
              />
            </div>
          </DashboardSection>

          {/* Connected Patients */}
          <DashboardSection
            title="Connected Patients"
            subtitle="Active clinical registry"
            action={
              <Link to="/doctor/patients" className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {uniquePatients.length > 0 ? (
              <div className="space-y-3">
                {uniquePatients.slice(0, 5).map((p) => {
                  const patientName = p.user?.full_name || p.full_name || `Patient #${p.id}`;
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
                        <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-900">{patientName}</h5>
                          <p className="text-[11px] text-slate-500">
                            ID: #{p.id} {p.gender ? `• ${p.gender}` : ''} {p.blood_group ? `• ${p.blood_group}` : ''}
                          </p>
                        </div>
                      </div>
                      <Link to={`/doctor/patients/${p.id}`}>
                        <Button size="sm" variant="ghost" icon={ExternalLink} className="text-slate-400 hover:text-teal-600" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Users className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <p className="text-xs font-semibold text-slate-600">No connected patients found.</p>
              </div>
            )}
          </DashboardSection>

          {/* Notifications */}
          <DashboardSection
            title="Recent Notifications"
            icon={Bell}
            subtitle="Clinical & schedule alerts"
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

