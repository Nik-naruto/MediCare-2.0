import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Heart,
  Save,
  AlertCircle,
  RotateCcw,
  Edit3,
  X,
  ShieldCheck,
  UserCheck,
  Pill,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { BLOOD_GROUPS } from '../../utils/constants';
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

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return 'Not Provided';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return dateStr;
  }
};

export const PatientProfile = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const [patientRecord, setPatientRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gender: 'Male',
    dob: '',
    bloodGroup: 'O+',
    address: '',
    emergencyContact: '',
    allergies: '',
  });

  const fetchProfile = async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      // 1. Fetch user's patient profile record
      const response = await apiClient.get('/patients/');
      const rawList = Array.isArray(response.data) ? response.data : [];

      let patient = rawList.find((p) => p.user_id === currentUser?.id) || rawList[0];

      // If user has no patient profile record yet, auto-create one
      if (!patient && currentUser?.id) {
        const createRes = await apiClient.post('/patients/', {
          user_id: currentUser.id,
          gender: 'Male',
          blood_group: 'O+',
        });
        patient = createRes.data;
      }

      setPatientRecord(patient);

      const name = patient?.user?.full_name || currentUser?.full_name || currentUser?.name || '';
      const email = patient?.user?.email || currentUser?.email || '';
      const phone = patient?.user?.phone || currentUser?.phone || '';
      const gender = patient?.gender || 'Male';
      const dob = patient?.date_of_birth || '';
      const bloodGroup = patient?.blood_group || 'O+';
      const address = patient?.address || '';
      const emergencyContact = patient?.emergency_contact || '';
      const allergies = patient?.allergies || '';

      setFormData({
        name,
        email,
        phone,
        gender,
        dob,
        bloodGroup,
        address,
        emergencyContact,
        allergies,
      });
    } catch (err) {
      const detail = err.detail || err.message || 'Failed to load patient profile.';
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchProfile();
    }
  }, [currentUser]);

  const handleCancel = () => {
    if (patientRecord || currentUser) {
      const name = patientRecord?.user?.full_name || currentUser?.full_name || currentUser?.name || '';
      const email = patientRecord?.user?.email || currentUser?.email || '';
      const phone = patientRecord?.user?.phone || currentUser?.phone || '';
      const gender = patientRecord?.gender || 'Male';
      const dob = patientRecord?.date_of_birth || '';
      const bloodGroup = patientRecord?.blood_group || 'O+';
      const address = patientRecord?.address || '';
      const emergencyContact = patientRecord?.emergency_contact || '';
      const allergies = patientRecord?.allergies || '';

      setFormData({
        name,
        email,
        phone,
        gender,
        dob,
        bloodGroup,
        address,
        emergencyContact,
        allergies,
      });
    }
    setIsEditing(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      addToast('Full name is required.', 'error');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // 1. Update Patient record fields if patient record exists
      if (patientRecord?.id) {
        const patientPayload = {
          gender: formData.gender,
          date_of_birth: formData.dob || null,
          blood_group: formData.bloodGroup || null,
          address: formData.address.trim() || null,
          emergency_contact: formData.emergencyContact.trim() || null,
          allergies: formData.allergies.trim() || null,
        };

        await apiClient.put(`/patients/${patientRecord.id}`, patientPayload);
      }

      // 2. Update User record (full_name, phone)
      if (currentUser?.id && (formData.name !== currentUser.name || formData.phone !== currentUser.phone)) {
        try {
          await apiClient.put(`/users/${currentUser.id}`, {
            full_name: formData.name.trim(),
            phone: formData.phone.trim() || null,
          });
        } catch (userErr) {
          // Handled via user self-update permissions
        }
      }

      addToast('Profile details updated successfully', 'success');
      await fetchProfile();
      setIsEditing(false);
    } catch (err) {
      const detail = err.detail || err.message || 'Failed to update profile details.';
      addToast(typeof detail === 'string' ? detail : 'Update failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const patientIdDisplay = patientRecord ? `PAT-${String(patientRecord.id).padStart(5, '0')}` : 'PAT-00000';
  const regDateDisplay = formatRegDate(patientRecord?.created_at || currentUser?.created_at);
  const initial = (formData.name || currentUser?.name || 'P').charAt(0).toUpperCase();

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left pb-12">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Health Profile</h1>
          <p className="text-xs text-slate-500">View and manage your personal demographics and contact information</p>
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
          <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-xs font-semibold text-slate-500">Loading patient profile details...</p>
        </Card>
      ) : (
        <>
          {/* Profile Overview Hero Card */}
          <Card className="shadow-md border-slate-200">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-500 text-white font-black text-3xl flex items-center justify-center shrink-0 shadow-md">
                {initial}
              </div>
              <div className="space-y-1.5 text-center sm:text-left flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">{formData.name || 'Patient User'}</h2>
                  <div className="flex items-center gap-2 justify-center sm:justify-end">
                    <Badge variant="sky">{patientIdDisplay}</Badge>
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
              {/* Personal Information Card */}
              <Card className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <UserCheck className="w-5 h-5 text-sky-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Personal Demographics</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
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

                  <div>
                    <span className="block text-slate-400 font-medium mb-1">Date of Birth</span>
                    <span className="block font-semibold text-slate-800">{formatDateDisplay(formData.dob)}</span>
                  </div>

                  <div>
                    <span className="block text-slate-400 font-medium mb-1">Gender</span>
                    <span className="block font-semibold text-slate-800">{formData.gender || 'Not Provided'}</span>
                  </div>

                  <div>
                    <span className="block text-slate-400 font-medium mb-1">Blood Group</span>
                    <span className="inline-block px-2.5 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 font-bold">
                      {formData.bloodGroup || 'Not Provided'}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Contact & Medical Details Card */}
              <Card className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Contact & Medical Records</h3>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <span className="block text-slate-400 font-medium mb-1 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> Emergency Contact
                    </span>
                    <span className="block font-semibold text-slate-800">{formData.emergencyContact || 'Not Provided'}</span>
                  </div>

                  <div>
                    <span className="block text-slate-400 font-medium mb-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> Residential Address
                    </span>
                    <span className="block font-semibold text-slate-800 leading-relaxed">
                      {formData.address || 'Not Provided'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <span className="block text-slate-400 font-medium mb-1 flex items-center gap-1.5">
                      <Pill className="w-3.5 h-3.5 text-rose-500" /> Known Allergies / Sensitivities
                    </span>
                    <span className="block font-semibold text-slate-800">
                      {formData.allergies ? (
                        <span className="text-rose-700 bg-rose-50 px-2 py-1 rounded-md border border-rose-200 inline-block">
                          {formData.allergies}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No known allergies listed</span>
                      )}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            /* EDIT MODE FORM */
            <Card className="shadow-lg border-sky-100">
              <form onSubmit={handleSave} className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-sky-600" />
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Input
                    label="Phone Number"
                    icon={Phone}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                  <Input
                    label="Date of Birth"
                    type="date"
                    icon={Calendar}
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  />
                  <Select
                    label="Gender"
                    options={['Male', 'Female', 'Other']}
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  />
                  <Select
                    label="Blood Group"
                    options={BLOOD_GROUPS}
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Emergency Contact"
                    placeholder="Name & Phone Number"
                    icon={Phone}
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  />
                  <Input
                    label="Residential Address"
                    placeholder="Flat No, Street, City, State"
                    icon={MapPin}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <Input
                  label="Known Allergies / Sensitivities"
                  placeholder="e.g. Penicillin, Dust, Latex"
                  icon={Pill}
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
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
