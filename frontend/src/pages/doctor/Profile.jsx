import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Mail,
  Stethoscope,
  Award,
  Clock,
  IndianRupee,
  DoorOpen,
  FileCheck,
  Save,
  AlertCircle,
  RotateCcw,
  Edit3,
  X,
  ShieldCheck,
  UserCheck,
  Building2,
  FileText,
  Camera,
  Upload,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { DoctorAvatar } from '../../components/common/DoctorAvatar';
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

export const DoctorProfile = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const [doctorProfile, setDoctorProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialty: '',
    qualification: '',
    experienceYears: '',
    consultationFee: '',
    roomNo: '',
    bio: '',
    medicalRegNo: '',
    photoUrl: null,
  });

  const fetchDoctorProfile = async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      let matched = null;
      try {
        const response = await apiClient.get('/doctors/me');
        if (response?.data) {
          matched = response.data;
        }
      } catch (meErr) {
        if (meErr.status === 404 || meErr.response?.status === 404) {
          const response = await apiClient.get('/doctors/?limit=100');
          const doctorsList = Array.isArray(response.data) ? response.data : [];
          matched = doctorsList.find(
            (d) => d.user_id === currentUser?.id || d.user?.id === currentUser?.id
          );
        } else {
          throw meErr;
        }
      }

      if (!matched) {
        setErrorMsg('Doctor profile record not found for authenticated account.');
        return;
      }

      setDoctorProfile(matched);

      const name = matched.user?.full_name || currentUser?.full_name || currentUser?.name || '';
      const email = matched.user?.email || currentUser?.email || '';
      const phone = matched.user?.phone || currentUser?.phone || '';
      const specialty = matched.specialty || '';
      const qualification = matched.qualification || '';
      const experienceYears = String(matched.experience_years ?? 0);
      const consultationFee = String(matched.consultation_fee ?? 0);
      const roomNo = matched.room_no || '';
      const bio = matched.bio || '';
      const medicalRegNo = matched.medical_registration_number || '';
      const photoUrl = matched.profile_photo_url || null;

      setFormData({
        name,
        email,
        phone,
        specialty,
        qualification,
        experienceYears,
        consultationFee,
        roomNo,
        bio,
        medicalRegNo,
        photoUrl,
      });
    } catch (err) {
      const detail = err.detail || err.message || 'Failed to load doctor profile details.';
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchDoctorProfile();
    }
  }, [currentUser]);

  const handleCancel = () => {
    if (doctorProfile) {
      const name = doctorProfile.user?.full_name || currentUser?.full_name || currentUser?.name || '';
      const email = doctorProfile.user?.email || currentUser?.email || '';
      const phone = doctorProfile.user?.phone || currentUser?.phone || '';
      const specialty = doctorProfile.specialty || '';
      const qualification = doctorProfile.qualification || '';
      const experienceYears = String(doctorProfile.experience_years ?? 0);
      const consultationFee = String(doctorProfile.consultation_fee ?? 0);
      const roomNo = doctorProfile.room_no || '';
      const bio = doctorProfile.bio || '';
      const medicalRegNo = doctorProfile.medical_registration_number || '';
      const photoUrl = doctorProfile.profile_photo_url || null;

      setFormData({
        name,
        email,
        phone,
        specialty,
        qualification,
        experienceYears,
        consultationFee,
        roomNo,
        bio,
        medicalRegNo,
        photoUrl,
      });
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsEditing(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size <= 5MB
    if (file.size > 5 * 1024 * 1024) {
      addToast('Selected image exceeds maximum allowed limit of 5 MB.', 'error');
      return;
    }

    // Validate mime type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      addToast('Unsupported image format. Please select JPEG, PNG, or WebP.', 'error');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUploadPhoto = async () => {
    if (!selectedFile || !doctorProfile?.id) return;

    setIsUploading(true);
    try {
      const payloadData = new FormData();
      payloadData.append('file', selectedFile);

      const res = await apiClient.post(`/doctors/${doctorProfile.id}/upload-photo`, payloadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const updated = res.data;
      setDoctorProfile(updated);
      setFormData((prev) => ({ ...prev, photoUrl: updated.profile_photo_url }));
      setSelectedFile(null);
      setPreviewUrl(null);
      addToast('Profile photo updated successfully!', 'success');
    } catch (err) {
      const detail = err.detail || err.message || 'Failed to upload profile photo.';
      addToast(typeof detail === 'string' ? detail : 'Upload failed.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!doctorProfile?.id) return;

    setIsUploading(true);
    try {
      const res = await apiClient.delete(`/doctors/${doctorProfile.id}/photo`);
      const updated = res.data;
      setDoctorProfile(updated);
      setFormData((prev) => ({ ...prev, photoUrl: null }));
      setSelectedFile(null);
      setPreviewUrl(null);
      addToast('Profile photo removed. Restored initials fallback.', 'success');
    } catch (err) {
      const detail = err.detail || err.message || 'Failed to delete photo.';
      addToast(typeof detail === 'string' ? detail : 'Action failed.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!doctorProfile) {
      addToast('Doctor profile record not loaded.', 'error');
      return;
    }

    if (!formData.name.trim()) {
      addToast('Full name is required.', 'error');
      return;
    }

    if (!formData.specialty.trim()) {
      addToast('Specialty / Department is required.', 'error');
      return;
    }

    if (!formData.qualification.trim()) {
      addToast('Qualification credentials are required.', 'error');
      return;
    }

    const expYears = parseInt(formData.experienceYears, 10);
    if (isNaN(expYears) || expYears < 0) {
      addToast('Experience years must be a valid non-negative number.', 'error');
      return;
    }

    const fee = parseFloat(formData.consultationFee);
    if (isNaN(fee) || fee < 0) {
      addToast('Consultation fee must be a valid non-negative number.', 'error');
      return;
    }

    if (!formData.roomNo.trim()) {
      addToast('Assigned room number is required.', 'error');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // 1. Update Doctor record
      const doctorPayload = {
        specialty: formData.specialty.trim(),
        qualification: formData.qualification.trim(),
        experience_years: expYears,
        consultation_fee: fee,
        room_no: formData.roomNo.trim(),
        bio: formData.bio ? formData.bio.trim() : null,
        medical_registration_number: formData.medicalRegNo ? formData.medicalRegNo.trim() : null,
      };

      try {
        await apiClient.put('/doctors/me', doctorPayload);
      } catch (putMeErr) {
        if (doctorProfile?.id) {
          await apiClient.put(`/doctors/${doctorProfile.id}`, doctorPayload);
        } else {
          throw putMeErr;
        }
      }

      // 2. Update User record (full_name, phone)
      if (currentUser?.id && (formData.name !== currentUser.name || formData.phone !== (currentUser.phone || ''))) {
        try {
          await apiClient.put(`/users/${currentUser.id}`, {
            full_name: formData.name.trim(),
            phone: formData.phone.trim() || null,
          });
        } catch (userErr) {
          // Handled via user self-update permissions
        }
      }

      addToast('Doctor profile updated successfully', 'success');
      await fetchDoctorProfile();
      setIsEditing(false);
    } catch (err) {
      const detail = err.detail || err.message || 'Failed to update doctor profile.';
      const msg = typeof detail === 'string' ? detail : 'An error occurred while saving updates.';
      setErrorMsg(msg);
      addToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const doctorIdDisplay = doctorProfile ? `DOC-${String(doctorProfile.id).padStart(5, '0')}` : 'DOC-00000';
  const regDateDisplay = formatRegDate(doctorProfile?.created_at || currentUser?.created_at);
  const initial = (formData.name || currentUser?.name || 'D').charAt(0).toUpperCase();

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left pb-12">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Doctor Clinical Profile</h1>
          <p className="text-xs text-slate-500">View and manage clinical credentials, consultation parameters, and account settings</p>
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
          <Button size="sm" variant="outline" icon={RotateCcw} onClick={fetchDoctorProfile}>
            Retry
          </Button>
        </div>
      )}

      {isLoading ? (
        <Card className="p-12 text-center">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-xs font-semibold text-slate-500">Loading doctor clinical profile...</p>
        </Card>
      ) : (
        <>
          {/* Profile Overview Hero Card */}
          <Card className="shadow-md border-slate-200">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <DoctorAvatar
                src={formData.photoUrl}
                name={formData.name}
                size="xl"
                fallbackVariant="teal"
              />
              <div className="space-y-1.5 text-center sm:text-left flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                      Dr. {formData.name || 'Doctor Specialist'}
                    </h2>
                    <p className="text-xs font-semibold text-teal-700">{formData.specialty || 'Medical Specialist'}</p>
                  </div>
                  <div className="flex items-center gap-2 justify-center sm:justify-end flex-wrap">
                    <Badge variant="teal">{doctorIdDisplay}</Badge>
                    <Badge variant="emerald">Active Account</Badge>
                    {formData.medicalRegNo && (
                      <Badge variant="sky">{formData.medicalRegNo}</Badge>
                    )}
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
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Professional Information Card */}
                <Card className="space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <Stethoscope className="w-5 h-5 text-teal-600" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Professional Credentials</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="block text-slate-400 font-medium mb-1">Specialty / Department</span>
                      <span className="block font-semibold text-slate-800">{formData.specialty || 'Not Provided'}</span>
                    </div>

                    <div>
                      <span className="block text-slate-400 font-medium mb-1">Qualifications</span>
                      <span className="block font-semibold text-slate-800">{formData.qualification || 'Not Provided'}</span>
                    </div>

                    <div>
                      <span className="block text-slate-400 font-medium mb-1">Experience</span>
                      <span className="block font-semibold text-slate-800">{formData.experienceYears} Years</span>
                    </div>

                    <div>
                      <span className="block text-slate-400 font-medium mb-1">Medical Registration No</span>
                      <span className="block font-semibold text-slate-800">{formData.medicalRegNo || 'Not Provided'}</span>
                    </div>

                    <div>
                      <span className="block text-slate-400 font-medium mb-1">Consultation Fee</span>
                      <span className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold">
                        ₹{formData.consultationFee}
                      </span>
                    </div>

                    <div>
                      <span className="block text-slate-400 font-medium mb-1">Assigned Room</span>
                      <span className="block font-semibold text-slate-800">{formData.roomNo || 'Not Provided'}</span>
                    </div>
                  </div>
                </Card>

                {/* Account & Contact Information Card */}
                <Card className="space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Account & Contact Details</h3>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <span className="block text-slate-400 font-medium mb-1 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" /> Full Name
                      </span>
                      <span className="block font-semibold text-slate-800">{formData.name || 'Not Provided'}</span>
                    </div>

                    <div>
                      <span className="block text-slate-400 font-medium mb-1 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Address
                      </span>
                      <span className="block font-semibold text-slate-800 truncate">{formData.email || 'Not Provided'}</span>
                    </div>

                    <div>
                      <span className="block text-slate-400 font-medium mb-1 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone Number
                      </span>
                      <span className="block font-semibold text-slate-800">{formData.phone || 'Not Provided'}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Account Status</span>
                      <Badge variant="emerald">Active Account</Badge>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Biography Card */}
              <Card className="space-y-3">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <FileText className="w-5 h-5 text-teal-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Professional Biography</h3>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-normal">
                  {formData.bio ? (
                    formData.bio
                  ) : (
                    <span className="text-slate-400 italic">No professional biography provided yet. Click "Edit Profile" to add expertise and background.</span>
                  )}
                </p>
              </Card>
            </div>
          ) : (
            /* EDIT MODE FORM */
            <Card className="shadow-lg border-teal-100">
              <form onSubmit={handleSave} className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-teal-600" />
                    <h3 className="text-sm font-bold text-slate-900">Update Doctor Clinical Profile</h3>
                  </div>
                  <span className="text-[11px] text-slate-400">Email is protected and read-only</span>
                </div>

                {/* Profile Photo Upload Section */}
                <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <DoctorAvatar
                      src={previewUrl || formData.photoUrl}
                      name={formData.name}
                      size="xl"
                      fallbackVariant="teal"
                    />
                    <div className="text-left space-y-1">
                      <h4 className="text-xs font-bold text-slate-900">Doctor Profile Photo</h4>
                      <p className="text-[11px] text-slate-500">
                        JPEG, PNG, or WebP. Maximum file size: 5 MB.
                      </p>
                      {previewUrl && (
                        <span className="inline-block text-[11px] text-teal-700 font-semibold bg-teal-100 px-2 py-0.5 rounded-md">
                          Previewing new photo (Unsaved)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
                    <label className="cursor-pointer">
                      <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors">
                        <Camera className="w-3.5 h-3.5 text-teal-600" />
                        Choose Photo
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>

                    {selectedFile && (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        icon={Upload}
                        onClick={handleUploadPhoto}
                        isLoading={isUploading}
                      >
                        Upload Photo
                      </Button>
                    )}

                    {formData.photoUrl && !selectedFile && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        icon={Trash2}
                        onClick={handleDeletePhoto}
                        isLoading={isUploading}
                        className="text-rose-600 border-rose-200 hover:bg-rose-50"
                      >
                        Remove Photo
                      </Button>
                    )}
                  </div>
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Phone Number"
                    icon={Phone}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                  <Input
                    label="Specialty / Department"
                    required
                    icon={Stethoscope}
                    value={formData.specialty}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  />
                  <Input
                    label="Qualifications"
                    required
                    icon={Award}
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Experience (Years)"
                    type="number"
                    min="0"
                    required
                    icon={Clock}
                    value={formData.experienceYears}
                    onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                  />
                  <Input
                    label="Consultation Fee (₹)"
                    type="number"
                    min="0"
                    step="any"
                    required
                    icon={IndianRupee}
                    value={formData.consultationFee}
                    onChange={(e) => setFormData({ ...formData, consultationFee: e.target.value })}
                  />
                  <Input
                    label="Assigned Room No"
                    required
                    icon={DoorOpen}
                    value={formData.roomNo}
                    onChange={(e) => setFormData({ ...formData, roomNo: e.target.value })}
                  />
                </div>

                <Input
                  label="Medical Registration Number"
                  icon={FileCheck}
                  placeholder="e.g. MCI-123456"
                  value={formData.medicalRegNo}
                  onChange={(e) => setFormData({ ...formData, medicalRegNo: e.target.value })}
                />

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Professional Biography</label>
                  <textarea
                    rows={4}
                    className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Enter clinical background, expertise, fellowship details, and specializations..."
                  />
                </div>

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

