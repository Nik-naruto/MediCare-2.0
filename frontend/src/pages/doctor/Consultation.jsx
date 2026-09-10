import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Stethoscope, Pill, Save, Plus, Trash2, AlertCircle } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';
import { formatTime } from '../../utils/formatters';

export const Consultation = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { currentUser } = useAuth();

  const [appointment, setAppointment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [vitals, setVitals] = useState({ bp: '120/80', pulse: '72', temp: '98.6', weight: '70' });
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [medications, setMedications] = useState([
    { medicineName: 'Paracetamol 650mg', dosage: '1 tab', frequency: 'Thrice daily', durationDays: 5 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchAppointmentContext = async () => {
      if (!appointmentId) {
        setErrorMsg('Invalid or missing appointment ID.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMsg('');

      try {
        const response = await apiClient.get(`/appointments/${appointmentId}`);
        if (isMounted) {
          setAppointment(response.data);
        }
      } catch (err) {
        if (isMounted) {
          const detail = err.detail || err.message || 'Failed to load appointment details.';
          const msg = typeof detail === 'string' ? detail : 'Appointment not found or access denied.';
          setErrorMsg(msg);
          addToast(msg, 'error');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchAppointmentContext();

    return () => {
      isMounted = false;
    };
  }, [appointmentId]);

  const addMedication = () => {
    setMedications([
      ...medications,
      { medicineName: '', dosage: '1 tab', frequency: 'Once daily', durationDays: 5 },
    ]);
  };

  const removeMedication = (idx) => {
    setMedications(medications.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!diagnosis.trim()) {
      addToast('Please enter primary clinical diagnosis', 'error');
      return;
    }

    if (!appointment) {
      addToast('Appointment context missing. Unable to save.', 'error');
      return;
    }

    const validMeds = medications.filter((m) => m.medicineName && m.medicineName.trim().length > 0);
    if (validMeds.length === 0) {
      addToast('Please provide at least one valid medication for the e-Prescription', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const doctorName =
        appointment.doctor?.user?.full_name || currentUser?.full_name || 'Attending Physician';

      // 1. Create Medical Record Entry
      const recordPayload = {
        patient_id: appointment.patient_id,
        title: `Clinical Consultation (${appointment.reason || 'General Checkup'})`,
        category: 'Consultation Note',
        doctor_name: doctorName,
        summary: `Primary Diagnosis: ${diagnosis.trim()}\nNotes & Advice: ${notes.trim()}\nVitals: BP ${vitals.bp}, Pulse ${vitals.pulse} bpm, Temp ${vitals.temp}°F, Weight ${vitals.weight} kg`,
        record_date: appointment.appointment_date || new Date().toISOString().split('T')[0],
      };
      await apiClient.post('/medical-records/', recordPayload);

      // 2. Create Digital e-Prescription (with fallback if appointment_id unique constraint triggers)
      const prescriptionItems = validMeds.map((med) => ({
        medicine_name: med.medicineName.trim(),
        dosage: med.dosage || '1 tab',
        frequency: med.frequency || 'Once daily',
        duration_days: Math.max(1, parseInt(med.durationDays, 10) || 5),
      }));

      const prescriptionPayload = {
        patient_id: appointment.patient_id,
        doctor_id: appointment.doctor_id,
        appointment_id: Number(appointmentId),
        diagnosis: diagnosis.trim(),
        notes: notes.trim() || 'Follow consultation advice as prescribed.',
        items: prescriptionItems,
      };

      try {
        await apiClient.post('/prescriptions/', prescriptionPayload);
      } catch (rxErr) {
        const detailStr = String(rxErr.detail || rxErr.message || '').toLowerCase();
        if (detailStr.includes('already exists') || detailStr.includes('unique')) {
          const { appointment_id, ...fallbackPayload } = prescriptionPayload;
          await apiClient.post('/prescriptions/', fallbackPayload);
        } else {
          throw rxErr;
        }
      }

      // 3. Mark Appointment Status as Completed
      await apiClient.put(`/appointments/${appointmentId}`, {
        status: 'Completed',
      });

      setIsSubmitting(false);
      addToast('Consultation notes & e-Rx recorded successfully!', 'success');
      navigate('/doctor/dashboard');
    } catch (err) {
      setIsSubmitting(false);
      const detail = err.detail || err.message || 'Failed to save consultation.';
      const msg = typeof detail === 'string' ? detail : 'An error occurred while saving consultation.';
      addToast(msg, 'error');
    }
  };

  if (isLoading) return <LoadingSpinner label="Loading clinical consultation context..." />;

  const patientName = appointment?.patient?.user?.full_name || `Patient #${appointment?.patient_id || ''}`;
  const aptDate = appointment?.appointment_date || 'Today';
  const aptTime = appointment?.start_time || '';
  const aptReason = appointment?.reason || 'General Checkup';

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Active Clinical Consultation: {patientName}
          </h1>
          <p className="text-xs text-slate-500">
            {aptReason} &bull; {aptDate} {formatTime(aptTime)} &bull; Token #{appointment?.token_no || appointment?.id}
          </p>
        </div>
        <Badge variant={appointment?.status === 'Completed' ? 'emerald' : 'amber'}>
          Status: {appointment?.status || 'In-Progress'}
        </Badge>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vitals Bar */}
        <Card title="Patient Vital Signs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Input
              label="BP (mmHg)"
              value={vitals.bp}
              onChange={(e) => setVitals({ ...vitals, bp: e.target.value })}
            />
            <Input
              label="Pulse (bpm)"
              value={vitals.pulse}
              onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })}
            />
            <Input
              label="Temp (°F)"
              value={vitals.temp}
              onChange={(e) => setVitals({ ...vitals, temp: e.target.value })}
            />
            <Input
              label="Weight (kg)"
              value={vitals.weight}
              onChange={(e) => setVitals({ ...vitals, weight: e.target.value })}
            />
          </div>
        </Card>

        {/* Clinical Assessment */}
        <Card title="Clinical Notes & Diagnosis">
          <div className="space-y-4">
            <Input
              label="Primary Clinical Diagnosis"
              required
              placeholder="e.g. Stage 1 Essential Hypertension, Acute Migraine..."
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase">Consultation Notes & Lifestyle Advice</label>
              <textarea
                rows={3}
                className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Dietary recommendations, follow-up timelines..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Electronic Prescription Form */}
        <Card
          title="Electronic Prescription (e-Rx)"
          action={
            <Button size="sm" variant="outline" icon={Plus} onClick={addMedication}>
              Add Drug
            </Button>
          }
        >
          <div className="space-y-3">
            {medications.map((med, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div className="sm:col-span-2">
                  <Input
                    label={`Drug #${idx + 1}`}
                    placeholder="Medicine Name (e.g. Amlodipine 5mg)"
                    value={med.medicineName}
                    onChange={(e) => {
                      const updated = [...medications];
                      updated[idx].medicineName = e.target.value;
                      setMedications(updated);
                    }}
                  />
                </div>
                <Input
                  label="Dosage / Freq"
                  value={med.frequency}
                  onChange={(e) => {
                    const updated = [...medications];
                    updated[idx].frequency = e.target.value;
                    setMedications(updated);
                  }}
                />
                <div className="flex items-center gap-2">
                  <Input
                    label="Days"
                    type="number"
                    value={med.durationDays}
                    onChange={(e) => {
                      const updated = [...medications];
                      updated[idx].durationDays = e.target.value;
                      setMedications(updated);
                    }}
                  />
                  {medications.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMedication(idx)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg mb-0.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isSubmitting} icon={Save}>
          Complete Consultation & Sign e-Rx
        </Button>
      </form>
    </div>
  );
};
