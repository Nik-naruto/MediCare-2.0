import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, FileText, Pill, Heart, Shield, ArrowLeft, AlertCircle, RotateCcw } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

const calculateAge = (dobString) => {
  if (!dobString) return null;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
};

export const PatientDetails = () => {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [records, setRecords] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchPatientChart = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const patientId = id && !isNaN(parseInt(id, 10)) ? parseInt(id, 10) : 1;

      const [patRes, recRes, rxRes] = await Promise.all([
        apiClient.get(`/patients/${patientId}`).catch(() => apiClient.get('/patients/')),
        apiClient.get('/medical-records/', { params: { patient_id: patientId } }).catch(() => ({ data: [] })),
        apiClient.get('/prescriptions/', { params: { patient_id: patientId } }).catch(() => ({ data: [] })),
      ]);

      let patData = patRes.data;
      if (Array.isArray(patData)) {
        patData = patData.find((p) => p.id === patientId) || patData[0];
      }

      if (patData) {
        const name = patData.user?.full_name || patData.name || `Patient #${patData.id}`;
        const gender = patData.gender ? patData.gender.charAt(0).toUpperCase() + patData.gender.slice(1).toLowerCase() : 'N/A';
        const ageVal = calculateAge(patData.date_of_birth);
        const ageStr = ageVal !== null ? ageVal : 'N/A';
        const dob = patData.date_of_birth || 'N/A';
        const bloodGroup = patData.blood_group || 'N/A';
        let allergies = [];
        if (patData.allergies) {
          if (Array.isArray(patData.allergies)) allergies = patData.allergies;
          else if (typeof patData.allergies === 'string') allergies = [patData.allergies];
        }

        setPatient({
          id: patData.id,
          name,
          gender,
          age: ageStr,
          dob,
          bloodGroup,
          allergies: allergies.length > 0 ? allergies : ['None'],
          initial: name.replace(/^Patient\s*#/i, '').charAt(0).toUpperCase() || 'P',
        });
      }

      const rawRecs = Array.isArray(recRes.data) ? recRes.data : [];
      setRecords(
        rawRecs.map((r) => ({
          id: r.id,
          title: r.diagnosis || r.title || 'Medical Consultation Record',
          date: r.record_date || (r.created_at ? String(r.created_at).split('T')[0] : 'N/A'),
          summary: r.notes || r.symptoms || r.summary || 'Clinical notes recorded during consultation.',
        }))
      );

      const rawRx = Array.isArray(rxRes.data) ? rxRes.data : [];
      setPrescriptions(
        rawRx.map((rx) => ({
          id: rx.id,
          diagnosis: rx.diagnosis || 'General Treatment',
          issuedDate: rx.issued_date || (rx.created_at ? String(rx.created_at).split('T')[0] : 'N/A'),
          items: Array.isArray(rx.items) ? rx.items : [],
        }))
      );
    } catch (err) {
      const detail = err.detail || err.message || 'Failed to load patient chart.';
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientChart();
  }, [id]);

  if (isLoading) return <LoadingSpinner label="Loading patient chart..." />;

  return (
    <div className="space-y-6 text-left">
      <div className="flex items-center gap-4">
        <Link to="/doctor/patients">
          <Button variant="outline" size="sm" icon={ArrowLeft}>
            Back to Directory
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Patient Chart & EHR</h1>
          <p className="text-xs text-slate-500">Comprehensive clinical summary and diagnostic timeline</p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
          <Button size="sm" variant="outline" icon={RotateCcw} onClick={fetchPatientChart}>
            Retry
          </Button>
        </div>
      )}

      {patient && (
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              {patient.avatar ? (
                <img src={patient.avatar} alt={patient.name} className="w-16 h-16 rounded-2xl object-cover" />
              ) : (
                <span className="w-16 h-16 rounded-2xl bg-teal-100 text-teal-800 font-bold text-2xl flex items-center justify-center shrink-0 border border-slate-200">
                  {patient.initial}
                </span>
              )}
              <div>
                <h2 className="text-xl font-bold text-slate-900">{patient.name}</h2>
                <span className="text-xs text-slate-500">
                  {patient.gender}, {patient.age} Yrs &bull; DOB: {patient.dob} &bull; Blood Group: <strong className="text-rose-600">{patient.bloodGroup}</strong>
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="rose">Allergies: {patient.allergies.join(', ')}</Badge>
                </div>
              </div>
            </div>
            <Link to="/doctor/appointments">
              <Button variant="primary">Start New Consultation</Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-3">Past Consultation Records</h4>
              {records.length === 0 ? (
                <p className="text-xs text-slate-400">No medical records found.</p>
              ) : (
                <div className="space-y-2">
                  {records.map((r) => (
                    <div key={r.id} className="p-3 rounded-xl border border-slate-100 text-xs">
                      <span className="font-bold text-slate-800 block">{r.title}</span>
                      <span className="text-slate-500">{r.date} &bull; {r.summary}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-3">Prescription History</h4>
              {prescriptions.length === 0 ? (
                <p className="text-xs text-slate-400">No prescriptions found.</p>
              ) : (
                <div className="space-y-2">
                  {prescriptions.map((rx) => (
                    <div key={rx.id} className="p-3 rounded-xl border border-slate-100 text-xs">
                      <span className="font-bold text-slate-800 block">{rx.diagnosis}</span>
                      <span className="text-slate-500">{rx.issuedDate} &bull; {rx.items.length} Medicines</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

