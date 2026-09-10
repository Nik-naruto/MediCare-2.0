import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common/Card';
import { Select } from '../../components/common/Select';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { DoctorAvatar } from '../../components/common/DoctorAvatar';
import { useToast } from '../../context/ToastContext';
import { AlertCircle, Clock, Calendar, CheckCircle2, XCircle, Stethoscope, ChevronDown, ChevronUp } from 'lucide-react';

const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

const getFutureDate = (days = 10) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().split('T')[0];
};

const getInitials = (name) => {
  if (!name) return 'DR';
  const clean = name.replace(/^Dr\.\s*/i, '');
  const parts = clean.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return clean.substring(0, 2).toUpperCase();
};

const formatTimeTo24 = (timeStr) => {
  if (!timeStr) return '09:00:00';
  if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) return timeStr;
  if (/^\d{2}:\d{2}$/.test(timeStr)) return `${timeStr}:00`;

  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return '09:00:00';

  let [_, hours, minutes, period] = match;
  let h = parseInt(hours, 10);
  if (period.toUpperCase() === 'PM' && h < 12) h += 12;
  if (period.toUpperCase() === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${minutes}:00`;
};

const formatDisplayTime = (time24) => {
  if (!time24) return '';
  const parts = time24.split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1] || '00';
  const period = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${m} ${period}`;
};

export const BookAppointment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  const { currentUser } = useAuth();

  const preselectedDocId = searchParams.get('doctor_id') || location.state?.doctor_id || '';
  const preselectedDate = searchParams.get('date') || location.state?.date || '';
  const preselectedTime = searchParams.get('time') || location.state?.time || '';

  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [patientProfile, setPatientProfile] = useState(null);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDocId, setSelectedDocId] = useState(preselectedDocId);
  const [selectedDate, setSelectedDate] = useState(preselectedDate || getTodayDate());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(preselectedTime || '');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Availability-First State
  const [upcomingSchedule, setUpcomingSchedule] = useState([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [showAllSlots, setShowAllSlots] = useState(false);

  // 1. Initial Data Load
  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      try {
        const [docsRes, deptsRes, patRes] = await Promise.all([
          apiClient.get('/doctors/?page_size=100'),
          apiClient.get('/departments/'),
          apiClient.get('/patients/'),
        ]);

        if (!isMounted) return;

        const fetchedDocs = Array.isArray(docsRes.data) ? docsRes.data : [];
        const fetchedDepts = Array.isArray(deptsRes.data) ? deptsRes.data : [];
        setDoctors(fetchedDocs);
        setDepartments(fetchedDepts);

        let profiles = Array.isArray(patRes.data) ? patRes.data : [];
        let profile = profiles.find((p) => p.user_id === currentUser?.id || p.user?.id === currentUser?.id) || (profiles.length > 0 ? profiles[0] : null);

        if (!profile && currentUser?.id) {
          try {
            const createRes = await apiClient.post('/patients/', { user_id: currentUser.id });
            profile = createRes.data;
          } catch (e) {
            // Ignore if already created
          }
        }
        setPatientProfile(profile);

        // Doctor Preselection sync
        if (preselectedDocId && fetchedDocs.length > 0) {
          const doc = fetchedDocs.find((d) => String(d.id) === String(preselectedDocId));
          if (doc) {
            setSelectedDocId(String(doc.id));
            if (doc.department_id) {
              setSelectedDept(String(doc.department_id));
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          setErrorMsg('Failed to load doctors and departments directory from server.');
        }
      }
    };

    fetchInitialData();

    return () => {
      isMounted = false;
    };
  }, [currentUser, preselectedDocId]);

  // 2. Fetch 10-day Availability Window whenever Doctor changes
  useEffect(() => {
    let isMounted = true;

    const fetchUpcomingAvailability = async () => {
      if (!selectedDocId) {
        setUpcomingSchedule([]);
        return;
      }

      setIsLoadingSchedule(true);
      setSelectedTimeSlot('');
      setShowAllSlots(false);

      const dateFrom = getTodayDate();
      const dateTo = getFutureDate(10); // 10-day booking window

      try {
        const res = await apiClient.get(
          `/doctors/${selectedDocId}/availability?date_from=${dateFrom}&date_to=${dateTo}`
        );
        if (!isMounted) return;

        const scheduleList = res.data?.schedule || [];
        setUpcomingSchedule(scheduleList);

        // Ensure selectedDate is valid within loaded schedule, default to first day with slots or first day
        if (scheduleList.length > 0) {
          const matchedDay = scheduleList.find((d) => d.date === selectedDate);
          if (!matchedDay) {
            const firstOpenDay = scheduleList.find((d) => d.is_working_day && d.slots.some((s) => s.is_available));
            setSelectedDate(firstOpenDay ? firstOpenDay.date : scheduleList[0].date);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load 10-day doctor availability window', err);
          setUpcomingSchedule([]);
        }
      } finally {
        if (isMounted) setIsLoadingSchedule(false);
      }
    };

    fetchUpcomingAvailability();

    return () => {
      isMounted = false;
    };
  }, [selectedDocId]);

  // Sync selected preselected time when schedule loads
  useEffect(() => {
    if (preselectedTime && upcomingSchedule.length > 0) {
      const activeDay = upcomingSchedule.find((d) => d.date === selectedDate);
      if (activeDay) {
        const match = activeDay.slots.find(
          (s) =>
            s.is_available &&
            (s.start_time === preselectedTime ||
              s.start_time.startsWith(preselectedTime) ||
              formatDisplayTime(s.start_time) === preselectedTime ||
              s.start_time === formatTimeTo24(preselectedTime))
        );
        if (match) {
          setSelectedTimeSlot(match.start_time);
        }
      }
    }
  }, [preselectedTime, selectedDate, upcomingSchedule]);

  const filteredDoctors = selectedDept
    ? doctors.filter(
        (d) =>
          String(d.department_id) === String(selectedDept) ||
          d.specialty === selectedDept
      )
    : doctors;

  const selectedDoctor = doctors.find((d) => String(d.id) === String(selectedDocId));
  const selectedDayItem = upcomingSchedule.find((d) => d.date === selectedDate);
  const currentDaySlots = selectedDayItem?.slots || [];
  const availableSlots = currentDaySlots.filter((s) => s.is_available);
  const availableSlotsCount = availableSlots.length;

  // Auto expand if selected slot is beyond index 4
  useEffect(() => {
    if (selectedTimeSlot && availableSlots.length > 5) {
      const idx = availableSlots.findIndex((s) => s.start_time === selectedTimeSlot);
      if (idx >= 5) {
        setShowAllSlots(true);
      }
    }
  }, [selectedTimeSlot, availableSlots]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedDocId || !selectedDate || !selectedTimeSlot) {
      const msg = 'Please select a doctor, consultation date, and an available time slot.';
      setErrorMsg(msg);
      addToast(msg, 'error');
      return;
    }

    if (!patientProfile?.id) {
      const msg = 'Patient profile not found. Please reload or contact support.';
      setErrorMsg(msg);
      addToast(msg, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        patient_id: patientProfile.id,
        doctor_id: Number(selectedDocId),
        appointment_date: selectedDate,
        start_time: formatTimeTo24(selectedTimeSlot),
        reason: reason.trim() || 'General Consultation',
        fee: Number(selectedDoctor?.consultation_fee || selectedDoctor?.consultationFee || 0),
      };

      await apiClient.post('/appointments/', payload);

      setIsSubmitting(false);
      addToast('Appointment booked successfully!', 'success');
      navigate('/patient/appointments');
    } catch (err) {
      setIsSubmitting(false);
      const detail = err.detail || err.message || 'Failed to book appointment.';
      const message = typeof detail === 'string' ? detail : 'Slot unavailable or scheduling conflict.';
      setErrorMsg(message);
      addToast(message, 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left pb-10">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Book Doctor Appointment</h1>
        <p className="text-xs text-slate-500">Select specialist and choose from real-time open consultation slots</p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5 shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <Card className="p-6 md:p-8 space-y-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Step 1: Specialty & Doctor Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-sky-600" />
              1. Select Clinical Specialty & Specialist
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Department"
                options={departments.map((d) => ({ label: d.name, value: String(d.id) }))}
                placeholder="All Departments"
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value);
                  setSelectedDocId('');
                }}
              />

              <Select
                label="Doctor Specialist"
                required
                options={filteredDoctors.map((d) => {
                  const docName = d.user?.full_name || d.name || `Doctor #${d.id}`;
                  const fee = d.consultation_fee || d.consultationFee || 500;
                  const spec = d.specialty || d.specialization || 'General Medicine';
                  return {
                    label: `${docName} (${spec} - ₹${fee})`,
                    value: String(d.id),
                  };
                })}
                placeholder={selectedDept && filteredDoctors.length === 0 ? 'No doctors available in this department.' : 'Choose Doctor'}
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
              />
            </div>

            {/* Doctor Profile Card */}
            {selectedDoctor && (
              <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-r from-slate-50 via-sky-50/40 to-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
                <div className="flex items-center gap-4">
                  <DoctorAvatar
                    src={selectedDoctor.profile_photo_url || selectedDoctor.image_url || selectedDoctor.avatar}
                    name={selectedDoctor.user?.full_name || selectedDoctor.name}
                    size="lg"
                    fallbackVariant="teal"
                  />

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-extrabold text-slate-900 tracking-tight">
                        {(selectedDoctor.user?.full_name || selectedDoctor.name)?.startsWith('Dr.')
                          ? selectedDoctor.user?.full_name || selectedDoctor.name
                          : `Dr. ${selectedDoctor.user?.full_name || selectedDoctor.name}`}
                      </h4>
                      <span className="text-[11px] font-bold text-sky-700 bg-sky-100/80 border border-sky-200 px-2.5 py-0.5 rounded-md">
                        {selectedDoctor.specialty || selectedDoctor.specialization || 'Specialist'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 font-medium flex items-center gap-2 flex-wrap">
                      <span>{selectedDoctor.qualification || 'MBBS, MD'}</span>
                      <span className="text-slate-300">•</span>
                      <span>Room {selectedDoctor.room_no || selectedDoctor.roomNo || '101'}</span>
                      {(selectedDoctor.experience_years || selectedDoctor.experience) && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span>{selectedDoctor.experience_years || selectedDoctor.experience} yrs exp</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 border-slate-200/80 pt-3 md:pt-0 shrink-0">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Consultation Fee</span>
                  <span className="text-lg md:text-xl font-black text-emerald-600">
                    ₹{selectedDoctor.consultation_fee || selectedDoctor.consultationFee || 500}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Availability-First Date & Slot Selection */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-600" />
                2. Available Dates & Time Slots
              </h3>
              {selectedDoctor && (
                <Badge variant="sky" className="text-[10px]">
                  Real-Time Doctor Availability
                </Badge>
              )}
            </div>

            {!selectedDocId ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <Stethoscope className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">Please select a Doctor to view open dates and time slots.</p>
                <p className="text-xs text-slate-500 mt-1">
                  Once a doctor is chosen, their upcoming 10-day availability will load automatically.
                </p>
              </div>
            ) : isLoadingSchedule ? (
              <div className="py-10">
                <LoadingSpinner label="Loading doctor schedule & real-time available slots..." />
              </div>
            ) : upcomingSchedule.length === 0 ? (
              <div className="p-6 text-center bg-amber-50/50 border border-amber-200 rounded-2xl text-xs text-amber-800">
                No active schedule published for this doctor in the upcoming 10 days.
              </div>
            ) : (
              <div className="space-y-6">
                {/* 10-Day Availability Horizontal Cards Picker */}
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2.5">
                    Select Consultation Date (Upcoming 10 Days)
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-7 gap-2.5">
                    {upcomingSchedule.map((dayItem) => {
                      const isSelected = dayItem.date === selectedDate;
                      const dateObj = new Date(dayItem.date + 'T00:00:00');
                      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                      const monthDay = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      const dayOpenSlots = dayItem.slots.filter((s) => s.is_available).length;
                      const hasSlots = dayItem.is_working_day && dayOpenSlots > 0;

                      return (
                        <button
                          key={dayItem.date}
                          type="button"
                          onClick={() => {
                            setSelectedDate(dayItem.date);
                            setSelectedTimeSlot('');
                            setShowAllSlots(false);
                          }}
                          className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between min-h-[92px] ${
                            isSelected
                              ? 'bg-sky-600 text-white border-sky-600 shadow-md ring-2 ring-sky-300 ring-offset-1'
                              : hasSlots
                              ? 'bg-white border-slate-200 text-slate-800 hover:border-sky-300 hover:bg-sky-50/40'
                              : 'bg-slate-50 border-slate-200 text-slate-400 opacity-70'
                          }`}
                        >
                          <div>
                            <span className="text-[11px] font-extrabold uppercase tracking-wider block opacity-90">
                              {dayName}
                            </span>
                            <span className="text-xs font-bold block mt-0.5">{monthDay}</span>
                          </div>

                          <div className="mt-2 pt-1 border-t border-slate-100/30">
                            {hasSlots ? (
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md inline-block ${
                                  isSelected ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {dayOpenSlots} {dayOpenSlots === 1 ? 'slot' : 'slots'}
                              </span>
                            ) : (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-block ${
                                  isSelected ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                No slots
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Available Time Slots Compact Dropdown for Selected Date */}
                {selectedDayItem && (
                  <div className="space-y-2 pt-2">
                    <Select
                      label="TIME SLOT *"
                      required
                      disabled={!selectedDate || isLoadingSchedule || availableSlotsCount === 0}
                      options={availableSlots.map((s) => ({
                        label: formatDisplayTime(s.start_time),
                        value: s.start_time,
                      }))}
                      placeholder={
                        isLoadingSchedule
                          ? 'Loading available time slots...'
                          : availableSlotsCount === 0
                          ? 'No available time slots on this date'
                          : 'Select a time slot'
                      }
                      value={selectedTimeSlot}
                      onChange={(e) => setSelectedTimeSlot(e.target.value)}
                    />
                    {availableSlotsCount === 0 && selectedDayItem.is_working_day && (
                      <p className="text-xs text-rose-600 font-medium">
                        No open consultation slots available for this date. Please select another date above.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 3: Consultation Reason */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              3. Consultation Reason
            </h3>
            <Input
              label="Chief Complaint / Symptoms"
              placeholder="e.g. Fever for 2 days, routine cardiac checkup..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full font-bold shadow-md" isLoading={isSubmitting}>
            Confirm Appointment Slot
          </Button>
        </form>
      </Card>
    </div>
  );
};

