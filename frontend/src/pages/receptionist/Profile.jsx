import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Mail,
  Building2,
  ShieldCheck,
  UserCheck,
  Save,
  AlertCircle,
  RotateCcw,
  Edit3,
  X,
  CreditCard,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useToast } from '../../context/ToastContext';

const formatRegDate = (dateStr) => {
  if (!dateStr) return 'Registered N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return `Registered ${dateStr}`;
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const year = d.getFullYear();
    return `Registered ${month} ${year}`;
  } catch (e) {
    return `Registered ${dateStr}`;
  }
};

export const ReceptionistProfile = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const fetchProfile = async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      const response = await apiClient.get('/auth/me');
      const user = response.data;
      setUserData(user);

      const name = user?.full_name || currentUser?.full_name || currentUser?.name || '';
      const email = user?.email || currentUser?.email || '';
      const phone = user?.phone || currentUser?.phone || '';

      setFormData({ name, email, phone });
    } catch (err) {
      const detail = err.detail || err.message || 'Failed to load front desk operator profile.';
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleCancel = () => {
    if (userData || currentUser) {
      const name = userData?.full_name || currentUser?.full_name || currentUser?.name || '';
      const email = userData?.email || currentUser?.email || '';
      const phone = userData?.phone || currentUser?.phone || '';

      setFormData({ name, email, phone });
    }
    setIsEditing(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      addToast('Full name is required.', 'error');
      return;
    }

    const userId = userData?.id || currentUser?.id;
    if (!userId) {
      addToast('User ID missing. Unable to save profile changes.', 'error');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await apiClient.put(`/users/${userId}`, {
        full_name: formData.name.trim(),
        phone: formData.phone.trim() || null,
      });

      addToast('Receptionist profile details updated successfully', 'success');
      await fetchProfile();
      setIsEditing(false);
    } catch (err) {
      const detail = err.detail || err.message || 'Failed to update profile details.';
      const msg = typeof detail === 'string' ? detail : 'Update failed.';
      setErrorMsg(msg);
      addToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const userIdDisplay = (userData?.id || currentUser?.id)
    ? `REC-${String(userData?.id || currentUser?.id).padStart(5, '0')}`
    : 'REC-00000';
  const regDateDisplay = formatRegDate(userData?.created_at || currentUser?.created_at);
  const initial = (formData.name || currentUser?.name || 'R').charAt(0).toUpperCase();

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left pb-12">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Front Desk Operator Profile</h1>
          <p className="text-xs text-slate-500">View and manage front desk operator details and contact info</p>
        </div>

        <div>
          {!isEditing ? (
            <Button variant="primary" icon={Edit3} onClick={() => setIsEditing(true)}>
              Edit Profile
            </Button>
          ) : (
            <Button variant="outline" icon={X} onClick={handleCancel} disabled={isSubmitting}>
              Cancel Editing
            </Button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
          <Button size="sm" variant="outline" icon={RotateCcw} onClick={fetchProfile}>
            Retry
          </Button>
        </div>
      )}

      {isLoading ? (
        <Card className="p-12 text-center">
          <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-xs font-semibold text-slate-500">Loading front desk operator profile...</p>
        </Card>
      ) : (
        <>
          {/* Profile Overview Hero Card */}
          <Card className="shadow-md border-slate-200">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 text-white font-black text-3xl flex items-center justify-center shrink-0 shadow-md">
                {initial}
              </div>
              <div className="space-y-1.5 text-center sm:text-left flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                      {formData.name || 'Front Desk Operator'}
                    </h2>
                    <p className="text-xs font-semibold text-amber-700">Patient Reception & OPD Registration</p>
                  </div>
                  <div className="flex items-center gap-2 justify-center sm:justify-end">
                    <Badge variant="amber">{userIdDisplay}</Badge>
                    <Badge variant="emerald">Active Account</Badge>
                  </div>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-2 justify-center sm:justify-start">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formData.email}</span>
                  <span className="text-slate-300">&bull;</span>
                  <span>{regDateDisplay}</span>
                </p>
              </div>
            </div>
          </Card>

          {/* READ-ONLY VIEW MODE */}
          {!isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Account Details Card */}
              <Card className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <UserCheck className="w-5 h-5 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Account & Personal Details</h3>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <span className="block text-slate-400 font-medium mb-1">Full Name</span>
                    <span className="block font-semibold text-slate-800">{formData.name || 'Not Provided'}</span>
                  </div>

                  <div>
                    <span className="block text-slate-400 font-medium mb-1">Email Address</span>
                    <span className="block font-semibold text-slate-800 truncate">{formData.email || 'Not Provided'}</span>
                  </div>

                  <div>
                    <span className="block text-slate-400 font-medium mb-1">Phone Number</span>
                    <span className="block font-semibold text-slate-800">{formData.phone || 'Not Provided'}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-slate-400 font-medium">System Role</span>
                    <Badge variant="amber">Receptionist</Badge>
                  </div>
                </div>
              </Card>

              {/* Duty Station & Operations Card */}
              <Card className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Building2 className="w-5 h-5 text-orange-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Duty Station & Operations</h3>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <span className="block text-slate-400 font-medium mb-1 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Assigned Desk Counter
                    </span>
                    <span className="block font-semibold text-slate-800">Main OPD Desk #01 (Central Counter)</span>
                  </div>

                  <div>
                    <span className="block text-slate-400 font-medium mb-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> Department Scope
                    </span>
                    <span className="block font-semibold text-slate-800">Outpatient Registration & Billing</span>
                  </div>

                  <div>
                    <span className="block text-slate-400 font-medium mb-1 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Access Privileges
                    </span>
                    <span className="block font-semibold text-slate-800">Walk-in Patient Check-in, Queue Management, Invoice Generation</span>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            /* EDIT MODE FORM */
            <Card className="shadow-lg border-amber-100">
              <form onSubmit={handleSave} className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-amber-600" />
                    <h3 className="text-sm font-bold text-slate-900">Update Profile Details</h3>
                  </div>
                  <span className="text-[11px] text-slate-400">Email is protected and read-only</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    required
                    icon={User}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <Input
                    label="Email Address (Read-Only)"
                    type="email"
                    disabled
                    icon={Mail}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <Input
                  label="Phone Number"
                  icon={Phone}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />

                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <Button type="submit" variant="primary" icon={Save} isLoading={isSubmitting}>
                    Save Changes
                  </Button>
                  <Button type="button" variant="outline" icon={X} onClick={handleCancel} disabled={isSubmitting}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

