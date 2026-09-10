import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Stethoscope,
  Calendar,
  CreditCard,
  ShieldAlert,
  AlertCircle,
  RotateCcw,
  Building2,
  UserCheck,
  ChevronRight,
  Bell,
  Search,
  Activity,
  FileText,
  Settings,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  PlusCircle,
  User,
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
import { formatCurrency } from '../../utils/formatters';

const sanitizeDetails = (detailsVal) => {
  if (!detailsVal) return 'System audit action recorded.';
  let str = typeof detailsVal === 'object' ? JSON.stringify(detailsVal) : String(detailsVal);
  str = str.replace(/(password|hashed_password|token|access_token|refresh_token|secret|hash)=[^&\s]+/gi, '$1=***');
  return str;
};

const mapAuditLog = (log) => {
  const userName = log.user_name || log.user?.full_name || `User #${log.user_id || ''}`;
  const role = log.role || log.user?.role || 'System';
  const action = log.action || 'SECURITY_EVENT';
  const details = sanitizeDetails(log.details || log.resource || 'System audit action recorded.');

  let timestamp = '--';
  if (log.created_at) {
    try {
      const d = new Date(log.created_at);
      if (!isNaN(d.getTime())) {
        timestamp = d.toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    } catch (e) {
      timestamp = String(log.created_at);
    }
  }

  const ipAddress = log.ip_address || '127.0.0.1';

  return {
    id: log.id,
    action,
    userName,
    role,
    details,
    timestamp,
    ipAddress,
  };
};

const getLocalTodayDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const AdminDashboard = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const [stats, setStats] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchAdminDashboardData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      const todayStr = getLocalTodayDate();

      const [
        patientsRes,
        doctorsRes,
        usersRes,
        aptsRes,
        deptsRes,
        invsRes,
        logsRes,
        notifsRes,
      ] = await Promise.allSettled([
        apiClient.get('/patients/', { params: { page: 1, page_size: 1 } }),
        apiClient.get('/doctors/', { params: { page: 1, page_size: 1 } }),
        apiClient.get('/users/', { params: { page: 1, page_size: 100 } }),
        apiClient.get('/appointments/', { params: { date_from: todayStr, date_to: todayStr, page: 1, page_size: 100 } }),
        apiClient.get('/departments/', { params: { page: 1, page_size: 10 } }),
        apiClient.get('/invoices/', { params: { payment_status: 'Paid', page_size: 1000 } }),
        apiClient.get('/audit-logs/', { params: { page: 1, page_size: 5, sort_by: 'created_at', sort_order: 'desc' } }),
        apiClient.get('/notifications/'),
      ]);

      // 1. Total Patients Count
      let totalPatients = 0;
      if (patientsRes.status === 'fulfilled') {
        const countHeader = parseInt(patientsRes.value.headers?.['x-total-count'] || '0', 10);
        const dataArr = Array.isArray(patientsRes.value.data) ? patientsRes.value.data : [];
        totalPatients = !isNaN(countHeader) && countHeader > 0 ? countHeader : dataArr.length;
      }

      // 2. Total Doctors Count
      let totalDoctors = 0;
      if (doctorsRes.status === 'fulfilled') {
        const countHeader = parseInt(doctorsRes.value.headers?.['x-total-count'] || '0', 10);
        const dataArr = Array.isArray(doctorsRes.value.data) ? doctorsRes.value.data : [];
        totalDoctors = !isNaN(countHeader) && countHeader > 0 ? countHeader : dataArr.length;
      }

      // 3. User Roster & Staff Count
      let staffCount = 0;
      let usersList = [];
      if (usersRes.status === 'fulfilled') {
        const rawUsers = Array.isArray(usersRes.value.data) ? usersRes.value.data : [];
        usersList = rawUsers;
        staffCount = rawUsers.filter(
          (u) => (u.role && String(u.role).toLowerCase() === 'receptionist') || String(u.role).toLowerCase() === 'admin'
        ).length;
      }
      setRecentUsers(usersList.slice(0, 5));

      // 4. Today's Appointments & Status Breakdown
      let todayCount = 0;
      let aptBreakdown = { scheduled: 0, checkedIn: 0, inConsultation: 0, completed: 0, cancelled: 0 };
      if (aptsRes.status === 'fulfilled') {
        const rawApts = Array.isArray(aptsRes.value.data) ? aptsRes.value.data : [];
        const countHeader = parseInt(aptsRes.value.headers?.['x-total-count'] || '0', 10);
        todayCount = !isNaN(countHeader) && countHeader > 0 ? countHeader : rawApts.length;

        rawApts.forEach((a) => {
          const s = String(a.status || '').toUpperCase();
          if (s === 'SCHEDULED') aptBreakdown.scheduled++;
          else if (s === 'CHECKED_IN' || s === 'CHECKED IN') aptBreakdown.checkedIn++;
          else if (s === 'IN_CONSULTATION' || s === 'IN CONSULTATION') aptBreakdown.inConsultation++;
          else if (s === 'COMPLETED') aptBreakdown.completed++;
          else if (s === 'CANCELLED') aptBreakdown.cancelled++;
        });
      }

      // 5. Departments Roster
      if (deptsRes.status === 'fulfilled') {
        const rawDepts = Array.isArray(deptsRes.value.data) ? deptsRes.value.data : [];
        setDepartments(rawDepts);
      }

      // 6. Paid Revenue Calculation
      let totalRevenue = 0;
      if (invsRes.status === 'fulfilled') {
        const rawInvs = Array.isArray(invsRes.value.data) ? invsRes.value.data : [];
        totalRevenue = rawInvs.reduce(
          (sum, i) => sum + (Number(i.total_amount || i.totalAmount) || 0),
          0
        );
      }

      // 7. Audit Logs
      if (logsRes.status === 'fulfilled') {
        const rawLogs = Array.isArray(logsRes.value.data) ? logsRes.value.data : [];
        setAuditLogs(rawLogs.map(mapAuditLog));
      }

      // 8. Notifications
      if (notifsRes.status === 'fulfilled') {
        const rawNotifs = Array.isArray(notifsRes.value.data) ? notifsRes.value.data : [];
        setNotifications(rawNotifs);
      }

      setStats({
        totalPatients,
        totalDoctors,
        staffCount,
        todayCount,
        totalRevenue,
        departmentsCount: departments.length,
        aptBreakdown,
      });
    } catch (err) {
      const detail = err.detail || err.message || 'Failed to load system administration metrics.';
      setErrorMsg(typeof detail === 'string' ? detail : 'Server connection error.');
    } finally {
      setIsLoading(false);
    }
  }, [departments.length]);

  useEffect(() => {
    fetchAdminDashboardData();
  }, [fetchAdminDashboardData]);

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

  const adminName = currentUser?.full_name || currentUser?.name || 'Super Admin';

  if (isLoading && !stats) {
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
        title={`Welcome, ${adminName}`}
        subtitle="Hospital Management, Analytics & Governance Suite"
        badgeText="System Administration Center"
        variant="purple"
        icon={ShieldCheck}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/admin/users">
              <Button
                variant="outline"
                icon={Users}
                className="bg-white text-slate-900 border-white hover:bg-slate-100 font-bold shadow-xs text-xs"
              >
                User Management
              </Button>
            </Link>
            <Link to="/admin/reports">
              <Button
                variant="primary"
                icon={Activity}
                className="bg-purple-950 hover:bg-black text-white font-bold shadow-xs text-xs border border-purple-800"
              >
                Analytics & Reports
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
          <Button size="sm" variant="outline" icon={RotateCcw} onClick={fetchAdminDashboardData}>
            Retry
          </Button>
        </div>
      )}

      {/* KPI Metrics Grid */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Registered Patients"
            value={stats.totalPatients}
            subtitle="Clinical Registry"
            icon={Users}
            variant="sky"
          />

          <StatCard
            title="Active Specialists"
            value={stats.totalDoctors}
            subtitle="Doctor Roster"
            icon={Stethoscope}
            variant="teal"
          />

          <StatCard
            title="Front Desk & Admin Staff"
            value={stats.staffCount}
            subtitle="Operational Staff"
            icon={UserCheck}
            variant="amber"
          />

          <StatCard
            title="Today's Consultations"
            value={stats.todayCount}
            subtitle={`Gross Revenue: ${formatCurrency(stats.totalRevenue)}`}
            icon={Calendar}
            variant="purple"
          />
        </div>
      )}

      {/* Main Grid: Systems Overview & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Operations Breakdown, Departments & Audit Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Operations & Queue Breakdown */}
          <DashboardSection
            title="Today's Hospital Operations Roster"
            subtitle="Consultation status distribution across departments"
            action={
              <Link to="/admin/appointments" className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1">
                Master Roster <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-left">
                <span className="text-xs font-semibold text-amber-700 block">Scheduled</span>
                <span className="text-2xl font-black text-amber-900 mt-1 block">
                  {stats?.aptBreakdown?.scheduled ?? 0}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200/80 text-left">
                <span className="text-xs font-semibold text-sky-700 block">Checked In</span>
                <span className="text-2xl font-black text-sky-900 mt-1 block">
                  {stats?.aptBreakdown?.checkedIn ?? 0}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 text-left">
                <span className="text-xs font-semibold text-purple-700 block">In Consultation</span>
                <span className="text-2xl font-black text-purple-900 mt-1 block">
                  {stats?.aptBreakdown?.inConsultation ?? 0}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 text-left">
                <span className="text-xs font-semibold text-emerald-700 block">Completed</span>
                <span className="text-2xl font-black text-emerald-900 mt-1 block">
                  {stats?.aptBreakdown?.completed ?? 0}
                </span>
              </div>
            </div>
          </DashboardSection>

          {/* Hospital Departments */}
          <DashboardSection
            title="Hospital Clinical Departments"
            subtitle="Clinical divisions and medical department heads"
            action={
              <Link to="/admin/departments" className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1">
                Manage Departments <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {departments.length > 0 ? (
              <div className="space-y-3">
                {departments.slice(0, 5).map((dept) => (
                  <div
                    key={dept.id}
                    className="p-3.5 rounded-2xl border border-slate-100 bg-white flex items-center justify-between gap-4 hover:border-slate-200 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 text-xs font-bold flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-sm font-extrabold text-slate-900">{dept.name}</h5>
                        <p className="text-xs text-slate-500 max-w-sm truncate">
                          Code: <span className="font-semibold text-slate-700">{dept.code || `DEPT-${dept.id}`}</span> &bull; {dept.description || 'Clinical department'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="emerald">Active</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Building2 className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <p className="text-xs font-semibold text-slate-600">No active departments found.</p>
              </div>
            )}
          </DashboardSection>

          {/* Real-Time Security & Audit Activity */}
          <DashboardSection
            title="Real-Time Security & Audit Trail"
            subtitle="System events, authentication logs & data access governance"
            action={
              <Link to="/admin/audit-logs" className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1">
                Full Audit Trail <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {auditLogs.length > 0 ? (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-2xl border border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-200 transition-all text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 font-bold">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900">{log.action}</span>
                          <Badge variant="purple">{log.role}</Badge>
                        </div>
                        <p className="text-slate-600 font-medium mt-0.5 max-w-md truncate">
                          Actor: <span className="font-bold text-slate-800">{log.userName}</span> &bull; {log.details}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block font-semibold text-slate-700">{log.timestamp}</span>
                      <span className="text-slate-400 font-mono text-[10px]">{log.ipAddress}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <ShieldAlert className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <p className="text-xs font-semibold text-slate-600">No recent security audit activity.</p>
              </div>
            )}
          </DashboardSection>
        </div>

        {/* Right Column (1 Col): Quick Actions, User Management Roster & Notifications */}
        <div className="space-y-6">
          {/* Quick Actions Grid */}
          <DashboardSection title="Governance Quick Actions">
            <div className="grid grid-cols-1 gap-3">
              <QuickActionCard
                title="Manage Users"
                description="RBAC permissions & accounts"
                icon={Users}
                to="/admin/users"
                variant="purple"
              />
              <QuickActionCard
                title="Doctor Management"
                description="Specialists & room assignments"
                icon={Stethoscope}
                to="/admin/doctors"
                variant="teal"
              />
              <QuickActionCard
                title="Patient Registry"
                description="Master patient database"
                icon={UserCheck}
                to="/admin/patients"
                variant="sky"
              />
              <QuickActionCard
                title="Hospital Departments"
                description="Departments & medical divisions"
                icon={Building2}
                to="/admin/departments"
                variant="amber"
              />
              <QuickActionCard
                title="Master Roster"
                description="Appointments audit & override"
                icon={Calendar}
                to="/admin/appointments"
                variant="purple"
              />
              <QuickActionCard
                title="Audit Trail Logs"
                description="Security & compliance events"
                icon={ShieldAlert}
                to="/admin/audit-logs"
                variant="sky"
              />
              <QuickActionCard
                title="Analytics & Reports"
                description="Hospital performance reports"
                icon={Activity}
                to="/admin/reports"
                variant="amber"
              />
              <QuickActionCard
                title="System Settings"
                description="Global parameters & banners"
                icon={Settings}
                to="/admin/settings"
                variant="teal"
              />
            </div>
          </DashboardSection>

          {/* Recent System Users */}
          <DashboardSection
            title="Recent Users Roster"
            subtitle="Platform user accounts"
            action={
              <Link to="/admin/users" className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {recentUsers.length > 0 ? (
              <div className="space-y-3">
                {recentUsers.map((u) => {
                  const name = u.full_name || u.name || `User #${u.id}`;
                  const role = u.role || 'User';
                  const initials = name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <div
                      key={u.id}
                      className="p-3 rounded-2xl border border-slate-100 bg-white flex items-center justify-between gap-3 hover:border-slate-200 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-900 text-xs font-bold flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-900">{name}</h5>
                          <p className="text-[11px] text-slate-500">
                            {u.email}
                          </p>
                        </div>
                      </div>
                      <Badge variant={role.toLowerCase() === 'admin' ? 'purple' : role.toLowerCase() === 'doctor' ? 'teal' : 'sky'}>
                        {role}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Users className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <p className="text-xs font-semibold text-slate-600">No user accounts found.</p>
              </div>
            )}
          </DashboardSection>

          {/* System Notifications */}
          <DashboardSection
            title="Governance Alerts"
            icon={Bell}
            subtitle="System notifications & warnings"
          >
            {notifications.length > 0 ? (
              <div className="space-y-2.5">
                {notifications.slice(0, 4).map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-2xl border transition-all text-xs ${
                      !n.is_read ? 'bg-purple-50/40 border-purple-200' : 'bg-white border-slate-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="font-bold text-slate-900">{n.title}</h5>
                      {!n.is_read && (
                        <button
                          onClick={() => handleMarkNotificationRead(n.id)}
                          className="text-[10px] font-bold text-purple-700 hover:underline shrink-0"
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
                <p className="text-xs font-semibold text-slate-600">No recent governance alerts.</p>
              </div>
            )}
          </DashboardSection>
        </div>
      </div>
    </div>
  );
};


