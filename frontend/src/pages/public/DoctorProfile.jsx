import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  Calendar,
  Clock,
  MapPin,
  Award,
  DollarSign,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  XCircle,
  UserCheck,
  Building2,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { DoctorAvatar } from '../../components/common/DoctorAvatar';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { formatTime, formatTimeRange } from '../../utils/formatters';

const getFormattedDateRange = (daysAhead = 7) => {
  const start = new Date();
  const end = new Date();
  end.setDate(start.getDate() + daysAhead);

  return {
    dateFrom: start.toISOString().split('T')[0],
    dateTo: end.toISOString().split('T')[0],
  };
};

export const DoctorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
  const [department, setDepartment] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAvail, setIsLoadingAvail] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchDoctorData = async () => {
      setIsLoading(true);
      setErrorMsg('');

      try {
        // 1. Fetch Doctor details
        const docRes = await apiClient.get(`/doctors/${id}`);
        if (!isMounted) return;
        setDoctor(docRes.data);

        // 2. Fetch Department details if department_id present
        if (docRes.data.department_id) {
          try {
            const deptRes = await apiClient.get(`/departments/${docRes.data.department_id}`);
            if (isMounted) setDepartment(deptRes.data);
          } catch (e) {
            // Ignore department fetch error gracefully
          }
        }

        // 3. Fetch Doctor Availability for upcoming 7 days
        setIsLoadingAvail(true);
        const { dateFrom, dateTo } = getFormattedDateRange(7);
        try {
          const availRes = await apiClient.get(`/doctors/${id}/availability?date_from=${dateFrom}&date_to=${dateTo}`);
          if (isMounted) {
            setAvailability(availRes.data);
          }
        } catch (e) {
          console.error('Failed to load availability for doctor profile', e);
        } finally {
          if (isMounted) setIsLoadingAvail(false);
        }
      } catch (err) {
        if (isMounted) {
          const detail = err.detail || err.message || `Doctor profile with ID ${id} not found.`;
          setErrorMsg(typeof detail === 'string' ? detail : 'Failed to load doctor profile.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDoctorData();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <LoadingSpinner label="Loading specialist profile & schedule..." />
      </div>
    );
  }

  if (errorMsg || !doctor) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="p-8 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex flex-col items-center gap-3">
          <AlertCircle className="w-8 h-8 text-red-600" />
          <p className="font-semibold text-base">{errorMsg || 'Doctor profile not found.'}</p>
          <Button variant="outline" size="sm" icon={ArrowLeft} onClick={() => navigate('/doctors')}>
            Back to Doctors Directory
          </Button>
        </div>
      </div>
    );
  }

  const name = doctor.user?.full_name || doctor.name || `Dr. #${doctor.id}`;
  const cleanName = name.replace(/^Dr\.\s*/i, '');
  const initial = cleanName.charAt(0).toUpperCase() || 'D';
  const specialty = doctor.specialty || department?.name || 'General Medicine';
  const deptName = department?.name || doctor.specialty || 'General Medicine';
  const fee = doctor.consultation_fee ?? doctor.consultationFee ?? 0;
  const expYears = doctor.experience_years ?? doctor.experienceYears ?? 0;
  const roomNo = doctor.room_no || doctor.roomNo || '101';
  const qualification = doctor.qualification || 'MBBS';
  const bio = doctor.bio || 'Experienced medical specialist committed to providing empathetic and comprehensive patient care.';
  const isAvailable = doctor.is_available ?? true;

  const scheduleDays = availability?.schedule || [];
  const activeDay = scheduleDays[selectedDateIndex] || null;

  const handleBookNow = (timeSlot = null) => {
    const params = new URLSearchParams();
    params.append('doctor_id', doctor.id);
    if (activeDay?.date) {
      params.append('date', activeDay.date);
    }
    if (timeSlot) {
      params.append('time', timeSlot);
    }
    navigate(`/patient/book-appointment?${params.toString()}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 text-left">
      {/* Back Link */}
      <div>
        <Link
          to="/doctors"
          className="inline-flex items-center gap-2 font-mono text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Doctors Directory
        </Link>
      </div>

      {/* Header Card */}
      <Card className="p-6 md:p-8 bg-white dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800/80 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.03)] rounded-3xl overflow-hidden">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
          {/* Avatar / Photo */}
          <div className="relative shrink-0">
            <DoctorAvatar
              src={doctor.profile_photo_url || doctor.avatar}
              name={name}
              size="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl text-5xl"
              fallbackVariant="teal"
            />
            <div className="absolute top-2 right-2">
              <Badge variant={isAvailable ? 'emerald' : 'rose'} className="font-mono">
                {isAvailable ? 'Available' : 'Unavailable'}
              </Badge>
            </div>
          </div>

          {/* Details Header */}
          <div className="space-y-4 flex-1">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-light text-slate-900 dark:text-slate-100 tracking-tight">{name}</h1>
              </div>
              <p className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
                {specialty} &bull; {qualification}
              </p>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl font-sans">{bio}</p>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 font-mono">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Department</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  {deptName}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Experience</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                  <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  {expYears} Years
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Consultation Fee</span>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mt-0.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  ₹{fee}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Room Number</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  Room {roomNo}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Real-time Availability & Booking Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Interactive Availability Calendar & Slots */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 bg-white dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800/80">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  Upcoming Availability Schedule
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans">
                  Select a date to view real-time open consultation slots
                </p>
              </div>

              <Badge variant="emerald" className="font-mono">Real-Time Sync</Badge>
            </div>

            {isLoadingAvail ? (
              <LoadingSpinner label="Checking slot availability..." />
            ) : scheduleDays.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500 font-mono">
                No active schedule published for this doctor.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Dates Horizontal Picker */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {scheduleDays.map((dayItem, idx) => {
                    const isSelected = idx === selectedDateIndex;
                    const dateObj = new Date(dayItem.date + 'T00:00:00');
                    const dayNum = dateObj.getDate();
                    const monthStr = dateObj.toLocaleDateString('en-US', { month: 'short' });
                    const hasAvailableSlots = dayItem.slots.some((s) => s.is_available);

                    return (
                      <button
                        key={dayItem.date}
                        type="button"
                        onClick={() => setSelectedDateIndex(idx)}
                        className={`flex-1 min-w-[70px] p-3 rounded-2xl border text-center transition-all ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 shadow-xs'
                            : dayItem.is_working_day
                            ? 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200/50 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <span className="text-[10px] font-mono uppercase font-medium tracking-wider block opacity-80">
                          {dayItem.day_of_week.slice(0, 3)}
                        </span>
                        <span className="text-base font-mono font-bold block mt-0.5">{dayNum}</span>
                        <span className="text-[10px] font-mono block">{monthStr}</span>
                        {dayItem.is_working_day && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full mx-auto mt-1.5 block ${
                              hasAvailableSlots ? 'bg-emerald-400' : 'bg-rose-400'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Day Slots Display */}
                {activeDay && (
                  <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-4">
                    <div className="flex items-center justify-between text-xs font-mono border-b border-slate-200/60 dark:border-slate-800 pb-3">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {activeDay.day_of_week}, {activeDay.date}
                      </span>
                      <span>
                        {!activeDay.is_working_day ? (
                          <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Non-Working Day
                          </span>
                        ) : activeDay.slots.some((s) => s.is_available) ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Available Slots Open
                          </span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Fully Booked / Unavailable
                          </span>
                        )}
                      </span>
                    </div>

                    {!activeDay.is_working_day ? (
                      <p className="text-xs text-slate-500 font-mono py-4 text-center">
                        Doctor does not hold consultation shifts on {activeDay.day_of_week}s.
                      </p>
                    ) : activeDay.slots.length === 0 ? (
                      <p className="text-xs text-slate-500 font-mono py-4 text-center">
                        No time slots configured for this shift.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                        {activeDay.slots.map((slot, idx) => (
                          <button
                            key={`${slot.start_time}-${slot.end_time}-${idx}`}
                            type="button"
                            disabled={!slot.is_available}
                            onClick={() => handleBookNow(slot.start_time)}
                            className={`p-3 rounded-xl border text-xs font-mono font-medium transition-all text-center flex flex-col items-center gap-1 ${
                              slot.is_available
                                ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-900 hover:text-white dark:hover:bg-slate-100 dark:hover:text-slate-900 shadow-2xs cursor-pointer'
                                : 'bg-slate-100 dark:bg-slate-900 border-slate-200/50 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed line-through opacity-60'
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimeRange(slot.start_time, slot.end_time)}
                            </span>
                            <span className="text-[10px] font-mono opacity-80">
                              {slot.is_available ? 'Book Slot' : 'Unavailable'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Direct Booking Summary Box */}
        <div className="space-y-6">
          <Card className="p-6 bg-slate-900 dark:bg-slate-950 text-white space-y-6 rounded-3xl shadow-lg border border-slate-800">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">APPOINTMENT RESERVATION</span>
              <h3 className="text-lg font-light text-white mt-0.5">Book Consultation</h3>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-800 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Doctor:</span>
                <span className="font-bold text-white">{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Specialty:</span>
                <span className="font-medium text-slate-200">{specialty}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-400">Fee:</span>
                <span className="font-bold text-emerald-400 text-sm">₹{fee}</span>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full text-xs"
              icon={Calendar}
              onClick={() => handleBookNow()}
            >
              Proceed to Booking
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};
