import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Calendar,
  Users,
  ShieldCheck,
  Award,
  Stethoscope,
  Heart,
  Brain,
  Baby,
  ArrowRight,
  CheckCircle2,
  Clock,
  PhoneCall,
  Mail,
  MapPin,
  Pill,
  TestTube,
  FileText,
  CreditCard,
  Building2,
  Sparkles,
  UserCheck,
  Shield,
  ChevronLeft,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { DoctorAvatar } from '../../components/common/DoctorAvatar';

const mapDoctor = (d) => {
  const name = d.user?.full_name || d.name || `Dr. #${d.id}`;
  const specialty = d.specialty || d.specialization || 'General Medicine';
  const qualification = d.qualification || 'MBBS';
  const consultationFee = Number(d.consultation_fee || d.consultationFee) || 500;
  const rating = d.rating || '4.9';
  const cleanName = name.replace(/^Dr\.\s*/i, '');
  const initial = cleanName.charAt(0).toUpperCase() || 'D';
  const profilePhotoUrl = d.profile_photo_url || d.profilePhotoUrl || d.avatar || null;

  return {
    id: d.id,
    name,
    specialty,
    qualification,
    consultationFee,
    rating,
    avatar: profilePhotoUrl,
    profilePhotoUrl,
    initial,
  };
};

export const Home = () => {
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    Promise.all([
      apiClient.get('/doctors/?limit=10').catch(() => ({ data: [] })),
      apiClient.get('/departments/').catch(() => ({ data: [] })),
    ]).then(([docsRes, deptsRes]) => {
      const rawDocs = Array.isArray(docsRes.data) ? docsRes.data : [];
      const rawDepts = Array.isArray(deptsRes.data) ? deptsRes.data : [];

      setDoctors(rawDocs.map(mapDoctor));
      setDepartments(
        rawDepts.map((d) => ({
          id: d.id,
          name: d.name,
          description: d.description || 'Comprehensive clinical care & specialized treatment.',
          headDoctor: d.head_doctor ? (d.head_doctor.user?.full_name || d.head_doctor.name) : '--',
        }))
      );
    });
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-12 sm:space-y-16 pb-20 text-left bg-[#FBF9F4] dark:bg-[#0C0E12] transition-colors">
      {/* 1. HERO SECTION */}
      <section id="home" className="scroll-mt-24 pt-4 sm:pt-6 lg:pt-8 max-w-7xl mx-auto px-6 sm:px-10 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-5 sm:space-y-6 text-left">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 font-medium block mb-2.5">
                YOUR HEALTH · OUR PRIORITY
              </span>
              <h1 className="text-3xl sm:text-5xl lg:text-[3.35rem] text-slate-900 dark:text-slate-100 tracking-tight leading-[1.12]">
                <span className="font-light block">Healthcare</span>
                <span className="font-normal text-slate-400 dark:text-slate-500">Made </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">Simple.</span>
              </h1>
            </div>

            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed max-w-lg font-sans">
              Book appointments, consult top doctors, manage your records and experience seamless healthcare – all in one place.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <Link to="/patient/book-appointment" className="shrink-0 inline-block">
                <Button
                  variant="primary"
                  size="lg"
                  icon={ArrowRight}
                  iconPosition="right"
                  className="rounded-full px-7 py-3.5 text-xs sm:text-sm font-bold tracking-wide shadow-md hover:shadow-lg transition-all whitespace-nowrap shrink-0"
                >
                  Book Appointment
                </Button>
              </Link>
              <Button
                onClick={() => scrollToSection('doctors')}
                variant="secondary"
                size="lg"
                className="rounded-full px-6 py-3.5 text-xs sm:text-sm font-medium whitespace-nowrap"
              >
                Find Specialists
              </Button>
            </div>

            {/* Stats Row */}
            <div className="pt-5 sm:pt-6 border-t border-[#EAE5DC] dark:border-slate-800/80 grid grid-cols-3 gap-2.5 sm:gap-6 max-w-lg">
              <div className="space-y-0.5">
                <span className="font-mono text-xl sm:text-3xl font-light text-slate-900 dark:text-slate-100 block">50+</span>
                <span className="font-mono text-[9px] sm:text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0"></span> Specialists
                </span>
              </div>
              <div className="space-y-0.5 border-l border-[#EAE5DC] dark:border-slate-800/80 pl-2.5 sm:pl-6">
                <span className="font-mono text-xl sm:text-3xl font-light text-slate-900 dark:text-slate-100 block">99.8%</span>
                <span className="font-mono text-[9px] sm:text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block shrink-0"></span> Satisfaction
                </span>
              </div>
              <div className="space-y-0.5 border-l border-[#EAE5DC] dark:border-slate-800/80 pl-2.5 sm:pl-6">
                <span className="font-mono text-xl sm:text-3xl font-light text-slate-900 dark:text-slate-100 block">24/7</span>
                <span className="font-mono text-[9px] sm:text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block shrink-0"></span> Support
                </span>
              </div>
            </div>
          </div>

          {/* Right Column — Clean Minimalist Facility Image Container */}
          <div className="lg:col-span-5 relative">
            {/* Minimalist Rectangular Image Presentation */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-md bg-white dark:bg-slate-900 group">
              <img
                src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=900&auto=format&fit=crop&q=80"
                alt="MediCare Modern Clinical Facility"
                className="w-full h-[410px] sm:h-[450px] lg:h-[475px] object-cover object-[center_20%] group-hover:scale-[1.015] transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none"></div>

              {/* Floating Translucent Glass Pill Card (Clickable to #services) */}
              <button
                onClick={() => scrollToSection('services')}
                className="absolute bottom-5 right-5 sm:bottom-6 sm:right-6 p-3 px-4 sm:p-3.5 sm:px-5 rounded-full bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-md flex items-center gap-3.5 text-left hover:scale-[1.03] active:scale-95 transition-all cursor-pointer group/pill z-10"
                title="View Modern Facilities & Healthcare Services"
                aria-label="View Modern Facilities & Healthcare Services"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover/pill:text-sky-600 transition-colors">Modern Facilities</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono -mt-0.5">for a Healthier You</p>
                </div>
                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 group-hover/pill:bg-sky-600 group-hover/pill:text-white flex items-center justify-center shrink-0 transition-colors">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FEATURE STRIP (4 CARDS) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1 */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800/80 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.03)] flex items-center gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Expert Doctors</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans">Consult with top specialists</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800/80 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.03)] flex items-center gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/60">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Easy Booking</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans">Schedule in seconds</p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800/80 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.03)] flex items-center gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="w-11 h-11 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-100 dark:border-sky-900/60">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Digital Records</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans">Access anytime, anywhere</p>
            </div>
          </div>

          {/* Card 4 */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800/80 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.03)] flex items-center gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-900/60">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Trusted & Secure</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans">Your data, our responsibility</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FEATURED DEPARTMENTS / SPECIALTIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 font-medium block mb-2">
              EXPLORE BY DEPARTMENT
            </span>
            <h2 className="text-3xl font-light text-slate-900 dark:text-slate-100 tracking-tight">Our Specialties</h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <Link to="/doctors">
              <Button variant="secondary" size="sm" className="px-4 py-2 text-xs font-mono">
                View All Departments <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {departments.slice(0, 6).map((dept, idx) => {
            const pastelColors = [
              { bg: 'bg-emerald-50 dark:bg-emerald-950/60', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-900/60', icon: Heart },
              { bg: 'bg-sky-50 dark:bg-sky-950/60', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-100 dark:border-sky-900/60', icon: Brain },
              { bg: 'bg-rose-50 dark:bg-rose-950/60', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-100 dark:border-rose-900/60', icon: Sparkles },
              { bg: 'bg-indigo-50 dark:bg-indigo-950/60', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-100 dark:border-indigo-900/60', icon: Activity },
              { bg: 'bg-teal-50 dark:bg-teal-950/60', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-100 dark:border-teal-900/60', icon: Baby },
              { bg: 'bg-amber-50 dark:bg-amber-950/60', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-900/60', icon: Users },
            ];
            const theme = pastelColors[idx % pastelColors.length];
            const IconComp = theme.icon;

            return (
              <Card key={dept.id} className="p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-2xl ${theme.bg} ${theme.text} ${theme.border} border flex items-center justify-center font-bold shrink-0`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{dept.name}</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono line-clamp-2 leading-relaxed">
                      {dept.description}
                    </p>
                    {dept.headDoctor !== '--' && (
                      <span className="block text-[10px] font-mono text-slate-400 dark:text-slate-500 pt-1">
                        Head: {dept.headDoctor}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 4. FEATURED DOCTORS SECTION */}
      <section id="doctors" className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 font-medium block mb-2">
              MEET OUR MEDICAL TEAM
            </span>
            <h2 className="text-3xl font-light text-slate-900 dark:text-slate-100 tracking-tight">Consult Top Doctors</h2>
          </div>
          <Link to="/doctors">
            <Button variant="secondary" size="sm" className="px-4 py-2 text-xs font-mono">
              View All Doctors <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {doctors.slice(0, 4).map((doc) => (
            <Card key={doc.id} className="p-0 overflow-hidden text-center group">
              <div className="relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                <DoctorAvatar
                  src={doc.profilePhotoUrl}
                  name={doc.name}
                  size="w-full h-52 rounded-none text-3xl"
                  fallbackVariant="teal"
                  className="group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 right-3">
                  <Badge variant="emerald" className="font-mono">{doc.rating} ★</Badge>
                </div>
              </div>
              <div className="p-5 text-left space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{doc.name}</h4>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">{doc.specialty}</span>
                  <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">{doc.qualification}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    Fee: <strong className="text-slate-900 dark:text-slate-100 font-sans">₹{doc.consultationFee}</strong>
                  </span>
                  <Link to={`/doctors/${doc.id}`}>
                    <Button size="sm" variant="primary" className="px-3 py-1.5 text-xs">
                      View Profile
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 5. NEW ABOUT SECTION */}
      <section id="about" className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Visual Left Card */}
          <div className="lg:col-span-5 relative">
            <div className="p-8 rounded-3xl bg-slate-900 dark:bg-slate-950 text-white space-y-6 shadow-lg border border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">ISO 27001 HEALTHCARE ENTERPRISE</span>
                <h3 className="text-2xl font-light text-white mt-1 leading-snug">Patient-Centric Infrastructure</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                MediCare 2.0 connects patients, doctors, receptionists, and hospital administrators in one unified healthcare platform with real-time schedule syncing and zero paperwork delay.
              </p>
              <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-3 text-xs font-mono text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Real-Time Sync</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>HIPAA Compliant</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Verified Doctors</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>24/7 Operations</span>
                </div>
              </div>
            </div>
          </div>

          {/* Details Right */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 font-medium block mb-2">
                ABOUT MEDICARE 2.0
              </span>
              <h2 className="text-3xl font-light text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                Empowering Patients & Hospitals with Smart Care
              </h2>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-sans">
              MediCare 2.0 is an enterprise medical platform designed to modernize patient consultations, doctor scheduling, electronic health records, and hospital workflow management.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Trusted Healthcare</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Multi-specialty hospital management platform.</p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Real-Time Slot Sync</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Live doctor availability calendars.</p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Centralized EHR</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Digital prescriptions & lab diagnostic reports.</p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Role Portals</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Dedicated Patient, Doctor, Receptionist & Admin workspaces.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. NEW SERVICES SECTION */}
      <section id="services" className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
        <div className="text-left max-w-xl mb-8">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 font-medium block mb-2">
            SOLUTIONS & CAPABILITIES
          </span>
          <h2 className="text-3xl font-light text-slate-900 dark:text-slate-100 tracking-tight">Healthcare Services</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-sans">
            Explore our full suite of clinical care services, portal capabilities, and patient support features.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center font-bold mb-3">
              <Stethoscope className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Doctor Consultations</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              Connect with verified specialists across Cardiology, Dermatology, Neurology, and General Medicine.
            </p>
            <Link to="/doctors" className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-slate-800 dark:text-slate-200 mt-4 hover:underline">
              Browse Doctors <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Card>

          <Card className="p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold mb-3">
              <Calendar className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Online Slot Booking</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              Schedule in-person consultations with real-time slot selection and instant appointment confirmations.
            </p>
            <Link to="/patient/book-appointment" className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400 mt-4 hover:underline">
              Book Slot <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Card>

          <Card className="p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Medical Records</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              Access your complete electronic health record history, diagnosis summaries, and clinical visit notes.
            </p>
            <Link to="/patient/medical-records" className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-sky-600 dark:text-sky-400 mt-4 hover:underline">
              View Records <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Card>

          <Card className="p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold mb-3">
              <Pill className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Digital Prescriptions</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              View digital e-prescriptions issued directly by your consulting physician with dosage instructions.
            </p>
            <Link to="/patient/prescriptions" className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-purple-600 dark:text-purple-400 mt-4 hover:underline">
              My Prescriptions <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Card>

          <Card className="p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold mb-3">
              <TestTube className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Pathology & Labs</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              Download verified lab test results, blood analysis reports, and radiology diagnostics online.
            </p>
            <Link to="/patient/lab-reports" className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-rose-600 dark:text-rose-400 mt-4 hover:underline">
              Lab Diagnostics <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Card>

          <Card className="p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold mb-3">
              <CreditCard className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Billing & Invoices</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              Transparent consultation fee breakdowns, OPD billing receipts, and online payment invoices.
            </p>
            <Link to="/patient/invoices" className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-amber-600 dark:text-amber-400 mt-4 hover:underline">
              View Invoices <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Card>

          <Card className="p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold mb-3">
              <PhoneCall className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">24/7 Emergency</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              Round-the-clock emergency trauma response, ICU admissions, and dedicated ambulance dispatch.
            </p>
            <button onClick={() => scrollToSection('contact')} className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-rose-600 dark:text-rose-400 mt-4 hover:underline cursor-pointer">
              Emergency Hotline <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Card>

          <Card className="p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Live Schedules</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              Check real-time clinical schedules, room numbers, and OPD availability before visiting.
            </p>
            <Link to="/doctors" className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-teal-600 dark:text-teal-400 mt-4 hover:underline">
              View Schedules <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Card>
        </div>
      </section>

      {/* 7. NEW CONTACT SECTION */}
      <section id="contact" className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
        <div className="text-left max-w-xl mb-8">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 font-medium block mb-2">
            SUPPORT & LOCATION
          </span>
          <h2 className="text-3xl font-light text-slate-900 dark:text-slate-100 tracking-tight">Contact Information</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Info Cards Left */}
          <div className="lg:col-span-6 space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800/80 shadow-xs flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900/60">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <span className="font-mono text-[10px] font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider block">24/7 Emergency Hotline</span>
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">+91 (022) 1800-999-22</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Emergency trauma desk & ambulance dispatch.</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800/80 shadow-xs flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <span className="font-mono text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Email Helpdesk</span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">support@medicare2.org</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Inquiries, slot booking help, and portal support.</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800/80 shadow-xs flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="font-mono text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Main Campus</span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">Central Medical District</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Healthcare Boulevard, Mumbai, MH 400001</p>
              </div>
            </div>
          </div>

          {/* Quick Assistance CTA Right */}
          <div className="lg:col-span-6">
            <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md text-slate-900 dark:text-slate-100 flex flex-col justify-between space-y-6 h-full">
              <div className="space-y-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 font-semibold block">
                  PATIENT COORDINATION
                </span>
                <h3 className="text-2xl font-light text-slate-900 dark:text-slate-100 tracking-tight">Need Medical Assistance?</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed font-sans">
                  Our clinical coordinators are ready to assist you with doctor appointments, OPD schedules, and portal access.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Link to="/patient/book-appointment" className="block w-full">
                  <Button
                    variant="primary"
                    size="lg"
                    icon={ArrowRight}
                    iconPosition="right"
                    className="w-full justify-center px-6 py-3.5 text-xs sm:text-sm font-bold tracking-wide rounded-full shadow-md"
                  >
                    Book Online Appointment
                  </Button>
                </Link>
                <a href="tel:180099922" className="block w-full">
                  <Button
                    variant="secondary"
                    size="lg"
                    icon={PhoneCall}
                    iconPosition="left"
                    className="w-full justify-center px-6 py-3.5 text-xs sm:text-sm font-semibold rounded-full border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors"
                  >
                    Call Emergency Desk
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
