import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  User,
  Stethoscope,
  Users,
  ShieldAlert,
  Mail,
  Lock,
  Phone,
  Calendar,
  Building2,
  Award,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  HeartPulse,
  Info,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { BLOOD_GROUPS } from '../../utils/constants';
import { useToast } from '../../context/ToastContext';

export const Register = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [selectedRole, setSelectedRole] = useState('Patient'); // 'Patient' | 'Doctor' | 'Reception' | 'Admin'
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [departments, setDepartments] = useState([]);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Common
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    dob: '',
    gender: 'Male',

    // Patient specific
    bloodGroup: 'O+',
    emergencyContact: '',
    address: '',

    // Doctor specific
    medicalRegNo: '',
    specialization: '',
    qualification: '',
    experienceYears: '',
    department: 'General Medicine',
    consultationFee: '',
    roomNo: '',
    bio: '',

    // Reception specific
    employeeId: '',
    staffDepartment: 'Front Desk',
    designation: 'Reception Executive',
    branch: 'Main Hospital Branch',

    // Admin specific
    adminId: '',
    adminDepartment: 'System Operations',
    adminDesignation: 'System Administrator',
  });

  // Fetch departments for Doctor / Reception / Admin selections
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await apiClient.get('/departments/');
        const list = Array.isArray(response.data) ? response.data : [];
        const names = list.map((d) => d.name);
        if (names.length > 0) {
          setDepartments(names);
          setFormData((prev) => ({
            ...prev,
            department: names[0],
            staffDepartment: names[0],
            adminDepartment: names[0],
          }));
        }
      } catch (err) {
        // Fallback default department list
        setDepartments([
          'General Medicine',
          'Cardiology',
          'Neurology',
          'Orthopedics',
          'Pediatrics',
          'Dermatology',
          'Oncology',
          'Emergency',
        ]);
      }
    };
    fetchDepartments();
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      return 'Please enter your full name.';
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      return 'Please enter a valid email address.';
    }
    if (!formData.phone.trim()) {
      return 'Please enter a contact phone number.';
    }
    if (!formData.password || formData.password.length < 6) {
      return 'Password must be at least 6 characters long.';
    }
    if (formData.password !== formData.confirmPassword) {
      return 'Password and Confirm Password do not match.';
    }
    if (!termsAccepted) {
      return 'You must agree to the Terms of Service and Privacy Policy.';
    }

    // Role-specific required validations
    if (selectedRole === 'Patient' && !formData.dob) {
      return 'Please provide your Date of Birth.';
    }

    if (selectedRole === 'Doctor') {
      if (!formData.medicalRegNo.trim()) return 'Medical Registration Number is required for doctors.';
      if (!formData.specialization.trim()) return 'Specialization is required for doctors.';
      if (!formData.qualification.trim()) return 'Qualification is required for doctors.';
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const validationError = validateForm();
    if (validationError) {
      setErrorMsg(validationError);
      addToast(validationError, 'error');
      return;
    }

    setIsLoading(true);

    try {
      // Map role to backend enum string
      const roleEnumMap = {
        Patient: 'PATIENT',
        Doctor: 'DOCTOR',
        Reception: 'RECEPTIONIST',
        Admin: 'ADMIN',
      };

      const payload = {
        email: formData.email.trim(),
        password: formData.password,
        full_name: formData.fullName.trim(),
        phone: formData.phone.trim() || undefined,
        role: roleEnumMap[selectedRole] || 'PATIENT',
      };

      if (selectedRole === 'Patient') {
        payload.gender = formData.gender ? formData.gender.toUpperCase() : undefined;
        payload.date_of_birth = formData.dob || undefined;
        payload.blood_group = formData.bloodGroup || undefined;
        payload.emergency_contact = formData.emergencyContact.trim() || undefined;
        payload.address = formData.address.trim() || undefined;
      } else if (selectedRole === 'Doctor') {
        payload.medical_registration_number = formData.medicalRegNo.trim() || undefined;
        payload.specialty = formData.specialization.trim() || undefined;
        payload.specialization = formData.specialization.trim() || undefined;
        payload.qualification = formData.qualification.trim() || undefined;
        payload.experience_years = formData.experienceYears ? Number(formData.experienceYears) : 0;
        payload.department = formData.department.trim() || undefined;
        payload.consultation_fee = formData.consultationFee ? Number(formData.consultationFee) : 0;
        payload.room_no = formData.roomNo.trim() || undefined;
        payload.bio = formData.bio.trim() || undefined;
      }

      await apiClient.post('/auth/register', payload);

      addToast(`${selectedRole} account registered successfully! Redirecting to sign in...`, 'success');
      navigate('/login');
    } catch (err) {
      const detail = err.detail || err.message;
      let message = 'Registration failed. Please check your inputs and try again.';

      if (typeof detail === 'string') {
        message = detail;
      } else if (Array.isArray(detail)) {
        message = detail.map((d) => d.msg || d.detail).join(', ');
      } else if (err.status === 403) {
        message = 'Public registration cannot create Admin accounts. Please contact a System Administrator.';
      } else if (err.status === 409 || err.status === 400) {
        message = 'An account with this email address already exists.';
      }

      setErrorMsg(message);
      addToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Role Cards Config
  const rolesConfig = [
    {
      id: 'Patient',
      title: 'Patient',
      description: 'Book appointments and manage your health',
      icon: User,
    },
    {
      id: 'Doctor',
      title: 'Doctor',
      description: 'Manage appointments and patient care',
      icon: Stethoscope,
    },
    {
      id: 'Reception',
      title: 'Reception',
      description: 'Handle appointments and patient coordination',
      icon: Users,
    },
    {
      id: 'Admin',
      title: 'Admin',
      description: 'Manage users, system settings and overall operations',
      icon: ShieldAlert,
    },
  ];

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex items-center justify-center">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch w-full">
        {/* LEFT COLUMN — PROMOTIONAL PANEL */}
        <div className="lg:col-span-5 rounded-3xl bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white p-8 lg:p-10 flex flex-col justify-between shadow-xl relative overflow-hidden border border-slate-800">
          {/* Subtle Ambient Background Accents */}
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-sky-500/10 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-64 h-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none"></div>

          {/* Top Brand Header */}
          <div className="space-y-6 relative z-10 text-left">
            <div className="inline-flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md">
              <Activity className="w-5 h-5 text-sky-400" />
              <span className="text-sm font-black tracking-tight text-white">MediCare 2.0</span>
              <span className="text-[10px] font-bold text-sky-300 uppercase tracking-widest px-2 py-0.5 bg-sky-500/20 rounded-md">
                Healthcare Portal
              </span>
            </div>

            <div>
              <h2 className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-1">
                Your Health, Our Priority
              </h2>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                Join MediCare 2.0
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 font-medium leading-relaxed">
                Create your account and be a part of a smarter, healthier tomorrow.
              </p>
            </div>
          </div>

          {/* Core Feature Benefits */}
          <div className="space-y-3.5 my-8 relative z-10 text-left">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3.5 backdrop-blur-xs hover:bg-white/10 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-400/20">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-tight">Trusted Healthcare Platform</h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  For Patients, Doctors, Receptionists and Administrators
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3.5 backdrop-blur-xs hover:bg-white/10 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-400/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-tight">Secure & Confidential</h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Your medical records and personal data are safe with us
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3.5 backdrop-blur-xs hover:bg-white/10 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-400/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-tight">Easy & Quick Registration</h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Get started in minutes with seamless role-based onboarding
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3.5 backdrop-blur-xs hover:bg-white/10 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-400/20">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-tight">Better Care, Together</h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Connecting patients and healthcare professionals for a healthier world
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Quote Footer */}
          <div className="pt-4 border-t border-slate-800 relative z-10 text-left">
            <p className="text-xs italic text-slate-400 font-medium">
              &ldquo;Healthcare made simple, for everyone.&rdquo;
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN — REGISTRATION CARD FORM */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xl border border-slate-200/80 text-left flex flex-col justify-between">
          <div>
            {/* Top Sign-in Redirect Link */}
            <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Create Your Account
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Select your role to get started with MediCare 2.0
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="block text-[11px] text-slate-500 font-medium">Already have an account?</span>
                <Link
                  to="/login"
                  className="text-xs font-bold text-sky-600 hover:text-sky-800 hover:underline transition-colors inline-flex items-center gap-1"
                >
                  Sign in &rarr;
                </Link>
              </div>
            </div>

            {/* Error Message Display */}
            {errorMsg && (
              <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                <div className="flex-1 leading-relaxed">{errorMsg}</div>
              </div>
            )}

            {/* ROLE SELECTOR CARDS GRID */}
            <div className="mb-8">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Select Registration Role *
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {rolesConfig.map((roleCard) => {
                  const Icon = roleCard.icon;
                  const isSelected = selectedRole === roleCard.id;

                  return (
                    <div
                      key={roleCard.id}
                      onClick={() => {
                        setSelectedRole(roleCard.id);
                        setErrorMsg('');
                      }}
                      className={`p-3.5 rounded-2xl cursor-pointer transition-all flex flex-col justify-between relative min-h-[140px] ${
                        isSelected
                          ? 'border-2 border-sky-600 bg-sky-50/70 shadow-sm ring-2 ring-sky-500/20'
                          : 'border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div>
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 transition-colors ${
                            isSelected
                              ? 'bg-sky-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>

                        <h3 className={`text-xs font-black tracking-tight ${isSelected ? 'text-sky-950' : 'text-slate-900'}`}>
                          {roleCard.title}
                        </h3>

                        <p className="text-[10px] text-slate-500 mt-1 leading-snug font-medium line-clamp-3">
                          {roleCard.description}
                        </p>
                      </div>

                      {/* Radio Indicator */}
                      <div className="mt-3 flex justify-end">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'border-sky-600 bg-white' : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-sky-600" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DYNAMIC ROLE-SPECIFIC FORM CONTENT */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ADMIN ROLE RESTRICTION NOTICE */}
              {selectedRole === 'Admin' && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-bold block">Admin Account Authorization Notice</span>
                    <span className="text-[11px] text-amber-800 leading-relaxed block mt-0.5">
                      For system security, public creation of Admin accounts is restricted. Registering an Admin account requires existing active System Administrator authorization.
                    </span>
                  </div>
                </div>
              )}

              {/* SECTION: PATIENT FORM */}
              {selectedRole === 'Patient' && (
                <div className="space-y-4">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                    Personal Information
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Full Name"
                      required
                      icon={User}
                      placeholder="e.g. Aarav Gupta"
                      value={formData.fullName}
                      onChange={(e) => handleChange('fullName', e.target.value)}
                    />
                    <Input
                      label="Email Address"
                      type="email"
                      required
                      icon={Mail}
                      placeholder="aarav@example.com"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Phone Number"
                      required
                      icon={Phone}
                      placeholder="9876543210"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                    />
                    <Input
                      label="Date of Birth"
                      type="date"
                      required
                      icon={Calendar}
                      value={formData.dob}
                      onChange={(e) => handleChange('dob', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label="Gender"
                      required
                      options={['Male', 'Female', 'Other']}
                      value={formData.gender}
                      onChange={(e) => handleChange('gender', e.target.value)}
                    />
                    <Select
                      label="Blood Group"
                      options={BLOOD_GROUPS}
                      value={formData.bloodGroup}
                      onChange={(e) => handleChange('bloodGroup', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Emergency Contact"
                      placeholder="e.g. Spouse / Parent Contact"
                      value={formData.emergencyContact}
                      onChange={(e) => handleChange('emergencyContact', e.target.value)}
                    />
                    <Input
                      label="Residential Address"
                      placeholder="Flat No, Street, City, State"
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* SECTION: DOCTOR FORM */}
              {selectedRole === 'Doctor' && (
                <div className="space-y-4">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                    Professional Information
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Full Name"
                      required
                      icon={User}
                      placeholder="Dr. Rahul Sharma"
                      value={formData.fullName}
                      onChange={(e) => handleChange('fullName', e.target.value)}
                    />
                    <Input
                      label="Email Address"
                      type="email"
                      required
                      icon={Mail}
                      placeholder="doctor@example.com"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Phone Number"
                      required
                      icon={Phone}
                      placeholder="9876543210"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                    />
                    <Input
                      label="Medical Registration Number"
                      required
                      icon={Award}
                      placeholder="e.g. MCI-123456"
                      value={formData.medicalRegNo}
                      onChange={(e) => handleChange('medicalRegNo', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Specialization / Specialty"
                      required
                      placeholder="e.g. Cardiology"
                      value={formData.specialization}
                      onChange={(e) => handleChange('specialization', e.target.value)}
                    />
                    <Input
                      label="Qualification"
                      required
                      placeholder="e.g. MBBS, MD (Cardiology)"
                      value={formData.qualification}
                      onChange={(e) => handleChange('qualification', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Years of Experience"
                      type="number"
                      required
                      placeholder="e.g. 10"
                      value={formData.experienceYears}
                      onChange={(e) => handleChange('experienceYears', e.target.value)}
                    />
                    {departments.length > 0 ? (
                      <Select
                        label="Department"
                        required
                        options={departments}
                        value={formData.department}
                        onChange={(e) => handleChange('department', e.target.value)}
                      />
                    ) : (
                      <Input
                        label="Department"
                        required
                        placeholder="General Medicine"
                        value={formData.department}
                        onChange={(e) => handleChange('department', e.target.value)}
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Consultation Fee (₹)"
                      type="number"
                      placeholder="e.g. 500"
                      value={formData.consultationFee}
                      onChange={(e) => handleChange('consultationFee', e.target.value)}
                    />
                    <Input
                      label="Room / Cabin Number"
                      placeholder="e.g. OPD Room 204"
                      value={formData.roomNo}
                      onChange={(e) => handleChange('roomNo', e.target.value)}
                    />
                  </div>

                  <Input
                    label="Bio / Professional Overview"
                    placeholder="Brief description of clinical practice, expertise, and availability"
                    value={formData.bio}
                    onChange={(e) => handleChange('bio', e.target.value)}
                  />
                </div>
              )}

              {/* SECTION: RECEPTION FORM */}
              {selectedRole === 'Reception' && (
                <div className="space-y-4">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                    Staff Information
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Full Name"
                      required
                      icon={User}
                      placeholder="e.g. Staff Member"
                      value={formData.fullName}
                      onChange={(e) => handleChange('fullName', e.target.value)}
                    />
                    <Input
                      label="Email Address"
                      type="email"
                      required
                      icon={Mail}
                      placeholder="reception@example.com"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Phone Number"
                      required
                      icon={Phone}
                      placeholder="9876543210"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                    />
                    <Input
                      label="Employee ID"
                      icon={Briefcase}
                      placeholder="e.g. REC-9921"
                      value={formData.employeeId}
                      onChange={(e) => handleChange('employeeId', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Department"
                      placeholder="Front Desk / Outpatient Desk"
                      value={formData.staffDepartment}
                      onChange={(e) => handleChange('staffDepartment', e.target.value)}
                    />
                    <Input
                      label="Designation"
                      placeholder="Senior Desk Executive"
                      value={formData.designation}
                      onChange={(e) => handleChange('designation', e.target.value)}
                    />
                  </div>

                  <Input
                    label="Work Location / Branch"
                    placeholder="e.g. Main Hospital Building, Block A"
                    value={formData.branch}
                    onChange={(e) => handleChange('branch', e.target.value)}
                  />
                </div>
              )}

              {/* SECTION: ADMIN FORM */}
              {selectedRole === 'Admin' && (
                <div className="space-y-4">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                    Admin Information
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Full Name"
                      required
                      icon={User}
                      placeholder="System Administrator"
                      value={formData.fullName}
                      onChange={(e) => handleChange('fullName', e.target.value)}
                    />
                    <Input
                      label="Email Address"
                      type="email"
                      required
                      icon={Mail}
                      placeholder="admin@example.com"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Phone Number"
                      required
                      icon={Phone}
                      placeholder="9876543210"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                    />
                    <Input
                      label="Admin / Employee ID"
                      icon={ShieldAlert}
                      placeholder="e.g. ADM-001"
                      value={formData.adminId}
                      onChange={(e) => handleChange('adminId', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Department"
                      placeholder="System Operations"
                      value={formData.adminDepartment}
                      onChange={(e) => handleChange('adminDepartment', e.target.value)}
                    />
                    <Input
                      label="Designation"
                      placeholder="Senior Administrator"
                      value={formData.adminDesignation}
                      onChange={(e) => handleChange('adminDesignation', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* COMMON SECTION: PASSWORD CREATION */}
              <div className="space-y-4 pt-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                  Create Password
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Account Password"
                    type="password"
                    required
                    icon={Lock}
                    placeholder="Min 6 characters"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                  />
                  <Input
                    label="Confirm Password"
                    type="password"
                    required
                    icon={Lock}
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  />
                </div>
              </div>

              {/* TERMS & PRIVACY CHECKBOX */}
              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                  />
                  <span className="text-xs text-slate-600 leading-snug">
                    I agree to the{' '}
                    <a href="#terms" onClick={(e) => e.preventDefault()} className="font-bold text-sky-600 hover:underline">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="#privacy" onClick={(e) => e.preventDefault()} className="font-bold text-sky-600 hover:underline">
                      Privacy Policy
                    </a>
                    .
                  </span>
                </label>
              </div>

              {/* SUBMIT BUTTON */}
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-3.5 text-sm font-black shadow-md rounded-2xl"
                  isLoading={isLoading}
                >
                  Create {selectedRole === 'Reception' ? 'Reception' : selectedRole} Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
