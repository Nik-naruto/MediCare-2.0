import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, PlusCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { BLOOD_GROUPS } from '../../utils/constants';
import { useToast } from '../../context/ToastContext';

export const WalkInRegistration = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [doctors, setDoctors] = useState([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    gender: 'Male',
    age: '28',
    bloodGroup: 'O+',
    doctorId: '',
    reason: 'Walk-in OPD consultation',
  });

  const fetchDoctors = async () => {
    setIsLoadingDoctors(true);
    setErrorMsg('');
    try {
      const response = await apiClient.get('/doctors/');
      const rawDocs = Array.isArray(response.data) ? response.data : [];
      const mapped = rawDocs.map((d) => ({
        id: String(d.id),
        rawId: d.id,
        name: d.user?.full_name || `Dr. #${d.id}`,
        specialty: d.specialty || '--',
        roomNo: d.room_no || '--',
        consultationFee: typeof d.consultation_fee === 'number' ? d.consultation_fee : 0,
        departmentId: d.department_id || null,
      }));

      setDoctors(mapped);
      if (mapped.length > 0 && !formData.doctorId) {
        setFormData((prev) => ({ ...prev, doctorId: mapped[0].id }));
      }
    } catch (err) {
      const detail = err.detail || err.message || 'Failed to load doctors list.';
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to connect to server.');
    } finally {
      setIsLoadingDoctors(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!formData.name.trim() || !formData.phone.trim() || !formData.doctorId) {
      addToast('Please enter patient name, phone, and select doctor', 'error');
      return;
    }

    const selectedDoc = doctors.find((d) => String(d.id) === String(formData.doctorId));
    if (!selectedDoc) {
      addToast('Selected doctor is invalid or not available', 'error');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      let patientId = null;
      const targetPhone = formData.phone.trim();

      // 1. Search if patient with this phone already exists in DB
      try {
        const searchRes = await apiClient.get('/patients/', {
          params: { search: targetPhone },
        });
        const rawPatients = Array.isArray(searchRes.data) ? searchRes.data : [];
        const found = rawPatients.find(
          (p) =>
            (p.user?.phone && p.user.phone.trim() === targetPhone) ||
            (p.phone && p.phone.trim() === targetPhone) ||
            (p.emergency_contact && p.emergency_contact.trim() === targetPhone)
        );

        if (found) {
          patientId = found.id;
        }
      } catch (searchErr) {
        // If search fails due to auth/server error, stop and propagate error instead of silently duplicating
        const status = searchErr.status || searchErr.response?.status;
        if (status === 401 || status === 403 || status >= 500) {
          throw searchErr;
        }
      }

      // 2. If patient profile does not exist, register User and create Patient Profile
      if (!patientId) {
        const cleanPhone = targetPhone.replace(/\D/g, '') || String(Date.now());
        const userEmail = `${cleanPhone}@walkin.medicare.com`;

        const regRes = await apiClient.post('/auth/register', {
          email: userEmail,
          password: 'password123',
          full_name: formData.name.trim(),
          phone: targetPhone,
          role: 'Patient',
        });

        const createdUser = regRes.data;

        // Calculate DOB from age (January 1 of calculated birth year for OPD walk-in approximation)
        const ageNum = parseInt(formData.age, 10) || 28;
        const currentYear = new Date().getFullYear();
        const birthYear = currentYear - ageNum;
        const dobStr = `${birthYear}-01-01`;

        const patientRes = await apiClient.post('/patients/', {
          user_id: createdUser.id,
          gender: formData.gender,
          date_of_birth: dobStr,
          blood_group: formData.bloodGroup,
          emergency_contact: targetPhone,
        });

        patientId = patientRes.data.id;
      }

      // 3. Create Walk-In Appointment with IST date and 15-min slot rounding
      const istFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const parts = istFormatter.formatToParts(new Date());
      const p = {};
      parts.forEach(({ type, value }) => { p[type] = value; });
      const todayDate = `${p.year}-${p.month}-${p.day}`;
      const roundedMins = String(Math.floor(parseInt(p.minute || '0', 10) / 15) * 15).padStart(2, '0');
      const startTimeStr = `${p.hour}:${roundedMins}:00`;

      const aptPayload = {
        patient_id: patientId,
        doctor_id: selectedDoc.rawId,
        appointment_date: todayDate,
        start_time: startTimeStr,
        reason: formData.reason.trim() || 'Walk-in OPD consultation',
        fee: selectedDoc.consultationFee,
      };

      const aptRes = await apiClient.post('/appointments/', aptPayload);
      const generatedToken = aptRes.data?.token_no || aptRes.data?.token;

      setIsSubmitting(false);

      if (generatedToken) {
        addToast(`Walk-in patient registered & token generated (${generatedToken})!`, 'success');
      } else {
        addToast('Walk-in patient registered & appointment booked successfully!', 'success');
      }

      navigate('/receptionist/queue');
    } catch (err) {
      setIsSubmitting(false);
      const detail = err.detail || err.message || 'Failed to register walk-in patient.';
      const msg = typeof detail === 'string' ? detail : 'An error occurred while creating appointment.';
      setErrorMsg(msg);
      addToast(msg, 'error');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">On-Spot Walk-In Patient Registration</h1>
        <p className="text-xs text-slate-500">Fast-track onboarding and instant OPD queue token generation</p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Patient Full Name"
              required
              icon={User}
              placeholder="e.g. Ramesh Kumar"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              label="Contact Phone Number"
              required
              icon={Phone}
              placeholder="9876543210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Gender"
              options={['Male', 'Female', 'Other']}
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            />
            <Input
              label="Age (Years)"
              type="number"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
            />
            <Select
              label="Blood Group"
              options={BLOOD_GROUPS}
              value={formData.bloodGroup}
              onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
            />
          </div>

          <Select
            label="Assign Doctor Specialist & OPD Room"
            required
            disabled={isLoadingDoctors}
            options={doctors.map((d) => ({
              label: `${d.name} (${d.specialty} - Room ${d.roomNo} - Fee ₹${d.consultationFee})`,
              value: d.id,
            }))}
            placeholder={isLoadingDoctors ? 'Loading doctors list...' : 'Select Doctor Room'}
            value={formData.doctorId}
            onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
          />

          <Input
            label="Symptoms / Reason for Visit"
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isSubmitting}
            disabled={isLoadingDoctors || doctors.length === 0}
            icon={PlusCircle}
          >
            Generate Queue Token & Issue Receipt
          </Button>
        </form>
      </Card>
    </div>
  );
};

