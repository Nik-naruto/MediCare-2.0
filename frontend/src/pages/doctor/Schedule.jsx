import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Plus, Trash2, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common/Card';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DEFAULT_SLOT_TIMES = [
  '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00',
  '17:00', '18:00'
];

const TIME_OPTIONS = [
  { label: '08:00 AM', value: '08:00' },
  { label: '08:30 AM', value: '08:30' },
  { label: '09:00 AM', value: '09:00' },
  { label: '09:30 AM', value: '09:30' },
  { label: '10:00 AM', value: '10:00' },
  { label: '10:30 AM', value: '10:30' },
  { label: '11:00 AM', value: '11:00' },
  { label: '11:30 AM', value: '11:30' },
  { label: '12:00 PM', value: '12:00' },
  { label: '12:30 PM', value: '12:30' },
  { label: '01:00 PM', value: '13:00' },
  { label: '01:30 PM', value: '13:30' },
  { label: '02:00 PM', value: '14:00' },
  { label: '02:30 PM', value: '14:30' },
  { label: '03:00 PM', value: '15:00' },
  { label: '03:30 PM', value: '15:30' },
  { label: '04:00 PM', value: '16:00' },
  { label: '04:30 PM', value: '16:30' },
  { label: '05:00 PM', value: '17:00' },
  { label: '05:30 PM', value: '17:30' },
  { label: '06:00 PM', value: '18:00' },
  { label: '06:30 PM', value: '18:30' },
  { label: '07:00 PM', value: '19:00' },
  { label: '07:30 PM', value: '19:30' },
  { label: '08:00 PM', value: '20:00' },
];

export const DoctorSchedule = () => {
  const { addToast } = useToast();
  const { currentUser } = useAuth();

  const [doctorProfile, setDoctorProfile] = useState(null);
  const [existingSchedules, setExistingSchedules] = useState([]);
  const [selectedDay, setSelectedDay] = useState('Tuesday');
  const [slotDuration, setSlotDuration] = useState('30');
  const [dailySlots, setDailySlots] = useState({});
  const [activeDays, setActiveDays] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchDoctorScheduleData = async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      const docsRes = await apiClient.get('/doctors/');
      const docsList = Array.isArray(docsRes.data) ? docsRes.data : [];
      const matchedProfile = docsList.find(
        (d) => d.user_id === currentUser?.id || d.user?.id === currentUser?.id
      );

      if (!matchedProfile) {
        setErrorMsg('Doctor profile not found.');
        setIsLoading(false);
        return;
      }

      setDoctorProfile(matchedProfile);

      const schedRes = await apiClient.get(`/schedules/?doctor_id=${matchedProfile.id}`);
      const rawScheds = Array.isArray(schedRes.data) ? schedRes.data : [];
      setExistingSchedules(rawScheds);

      const initialActiveDays = [];
      const initialDailySlots = {};

      DAYS.forEach((day) => {
        const sched = rawScheds.find((s) => s.day_of_week === day);
        if (sched && sched.is_active) {
          initialActiveDays.push(day);
          if (sched.custom_slots) {
            initialDailySlots[day] = sched.custom_slots.split(',').map((s) => s.strip ? s.strip() : s).filter(Boolean).slice(0, 10);
          } else {
            // Default initial slots
            initialDailySlots[day] = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'].slice(0, 10);
          }
        } else {
          initialDailySlots[day] = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00'].slice(0, 10);
        }
      });

      if (initialActiveDays.length > 0) {
        setActiveDays(initialActiveDays);
      }

      setDailySlots(initialDailySlots);

      if (rawScheds.length > 0) {
        setSlotDuration(String(rawScheds[0].slot_duration_minutes || 30));
      }
    } catch (err) {
      const detail = err.detail || err.message || 'Failed to load doctor schedule.';
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchDoctorScheduleData();
    }
  }, [currentUser]);

  const currentSlots = dailySlots[selectedDay] || [];
  const isDayActive = activeDays.includes(selectedDay);

  const toggleActiveDay = () => {
    if (isDayActive) {
      setActiveDays(activeDays.filter((d) => d !== selectedDay));
    } else {
      setActiveDays([...activeDays, selectedDay]);
    }
  };

  const handleAddSlot = () => {
    if (currentSlots.length >= 10) {
      addToast('Maximum 10 slots per day allowed.', 'error');
      return;
    }

    // Pick next unused time slot option
    const unusedTime = DEFAULT_SLOT_TIMES.find((t) => !currentSlots.includes(t)) || '19:00';
    setDailySlots({
      ...dailySlots,
      [selectedDay]: [...currentSlots, unusedTime],
    });
  };

  const handleRemoveSlot = (index) => {
    const updated = currentSlots.filter((_, idx) => idx !== index);
    setDailySlots({
      ...dailySlots,
      [selectedDay]: updated,
    });
  };

  const handleSlotChange = (index, value) => {
    if (currentSlots.includes(value) && currentSlots[index] !== value) {
      addToast('Duplicate time slots are not allowed on the same day.', 'error');
      return;
    }
    const updated = [...currentSlots];
    updated[index] = value;
    setDailySlots({
      ...dailySlots,
      [selectedDay]: updated,
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!doctorProfile) {
      addToast('Doctor profile missing. Cannot save schedule.', 'error');
      return;
    }

    if (activeDays.length === 0) {
      addToast('Please select at least one active working day.', 'error');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const duration = parseInt(slotDuration, 10) || 30;

      const promises = DAYS.map(async (day) => {
        const isSelected = activeDays.includes(day);
        const daySlots = dailySlots[day] || [];

        // Validate max 10 slots
        if (isSelected && daySlots.length > 10) {
          throw new Error(`Day ${day} cannot have more than 10 slots.`);
        }

        const customSlotsStr = isSelected && daySlots.length > 0 ? daySlots.join(',') : null;
        const existing = existingSchedules.find((s) => s.day_of_week === day);

        const startTime = daySlots.length > 0 ? `${daySlots[0]}:00` : '09:00:00';
        const lastSlot = daySlots.length > 0 ? daySlots[daySlots.length - 1] : '17:00';
        const endTime = `${lastSlot}:00`;

        if (isSelected) {
          if (existing) {
            return apiClient.put(`/schedules/${existing.id}`, {
              day_of_week: day,
              start_time: startTime,
              end_time: endTime,
              slot_duration_minutes: duration,
              custom_slots: customSlotsStr,
              is_active: true,
            });
          } else {
            return apiClient.post('/schedules/', {
              doctor_id: doctorProfile.id,
              day_of_week: day,
              start_time: startTime,
              end_time: endTime,
              slot_duration_minutes: duration,
              custom_slots: customSlotsStr,
              is_active: true,
            });
          }
        } else if (existing && existing.is_active) {
          return apiClient.put(`/schedules/${existing.id}`, {
            is_active: false,
          });
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      await fetchDoctorScheduleData();

      setIsSubmitting(false);
      addToast('Time slots & OPD availability updated successfully!', 'success');
    } catch (err) {
      setIsSubmitting(false);
      const detail = err.detail || err.message || 'Failed to save time slots.';
      const msg = typeof detail === 'string' ? detail : 'Failed to update schedule.';
      setErrorMsg(msg);
      addToast(msg, 'error');
    }
  };

  if (isLoading) return <LoadingSpinner label="Loading doctor time slots & schedule rules..." />;

  return (
    <div className="max-w-3xl mx-auto space-y-6 text-left pb-10">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Manage Your Time Slots</h1>
        <p className="text-xs text-slate-500">Set up to 10 time slots per day for patient bookings</p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5 shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <Card className="p-6 md:p-8 space-y-8">
        <form onSubmit={handleSave} className="space-y-8">
          {/* Day & Duration Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-100 pb-6">
            <Select
              label="Select Day"
              options={DAYS.map((d) => ({
                label: `${d} ${activeDays.includes(d) ? '(Active)' : '(Off)'}`,
                value: d,
              }))}
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
            />

            <Select
              label="Slot Duration"
              options={[
                { label: '15 minutes per slot', value: '15' },
                { label: '30 minutes per slot', value: '30' },
                { label: '45 minutes per slot', value: '45' },
                { label: '60 minutes per slot', value: '60' },
              ]}
              value={slotDuration}
              onChange={(e) => setSlotDuration(e.target.value)}
            />
          </div>

          {/* Working Day Toggle Banner */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-sm font-extrabold text-slate-900 block">{selectedDay} Working Status</span>
              <span className="text-xs text-slate-500">
                {isDayActive ? 'OPD consultations enabled on this day' : 'No OPD consultations scheduled'}
              </span>
            </div>
            <button
              type="button"
              onClick={toggleActiveDay}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                isDayActive
                  ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
              }`}
            >
              {isDayActive ? 'Active Working Day ✓' : 'Set as Working Day'}
            </button>
          </div>

          {/* Time Slots Management for Selected Day */}
          {isDayActive && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-600" />
                  Available Time Slots (Max 10)
                </h3>
                <span className="text-xs font-bold text-slate-500">
                  {currentSlots.length}/10 slots added
                </span>
              </div>

              {currentSlots.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-500">
                  No slots configured for {selectedDay}. Click "+ Add Slot" below to add appointment times.
                </div>
              ) : (
                <div className="space-y-3">
                  {currentSlots.map((slotTime, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        <div className="flex-1 max-w-xs">
                          <Select
                            options={TIME_OPTIONS}
                            value={slotTime}
                            onChange={(e) => handleSlotChange(idx, e.target.value)}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(idx)}
                        className="p-2.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-100 transition-colors"
                        title="Remove Slot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Slot Button & Counter */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  icon={Plus}
                  onClick={handleAddSlot}
                  disabled={currentSlots.length >= 10}
                  className="font-bold text-xs"
                >
                  + Add Slot
                </Button>

                <span className="text-xs font-bold text-slate-500">
                  {currentSlots.length}/10 slots added
                </span>
              </div>
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            icon={Save}
            className="w-full font-bold shadow-md bg-teal-600 hover:bg-teal-700 text-white"
            isLoading={isSubmitting}
          >
            Save Availability
          </Button>
        </form>
      </Card>
    </div>
  );
};

