import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, PhoneCall, Mail, MapPin, ShieldCheck } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="w-full max-w-full overflow-x-hidden bg-[#0C0E12] text-slate-400 text-sm border-t border-slate-800/80 pt-12 pb-8 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800/80">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center text-white">
                <svg className="w-7 h-7 stroke-current fill-none stroke-[2.5]" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h4l2.5-6 3.5 12 3-8 2 4h5" />
                </svg>
              </div>
              <div>
                <span className="text-base font-bold text-white tracking-tight">MediCare 2.0</span>
                <span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500 -mt-0.5 font-medium">
                  Healthcare, Simplified
                </span>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-slate-400 font-sans">
              Enterprise healthcare management system delivering patient care, appointment scheduling, and clinical operations.
            </p>
            <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> ISO 27001 Certified
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 font-medium mb-4">HOSPITAL SERVICES</h4>
            <ul className="space-y-2 text-xs font-sans">
              <li><Link to="/services" className="hover:text-white transition-colors">OPD & IPD Consultations</Link></li>
              <li><Link to="/services" className="hover:text-white transition-colors">Cardiology & Heart Care</Link></li>
              <li><Link to="/services" className="hover:text-white transition-colors">Neurology & Brain Imaging</Link></li>
              <li><Link to="/services" className="hover:text-white transition-colors">24/7 Emergency Care</Link></li>
              <li><Link to="/services" className="hover:text-white transition-colors">Pathology & Radiology Labs</Link></li>
            </ul>
          </div>

          {/* Patient Portal */}
          <div>
            <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 font-medium mb-4">PATIENT PORTAL</h4>
            <ul className="space-y-2 text-xs font-sans">
              <li><Link to="/patient/book-appointment" className="hover:text-white transition-colors">Book Doctor Appointment</Link></li>
              <li><Link to="/patient/medical-records" className="hover:text-white transition-colors">View Medical Records</Link></li>
              <li><Link to="/patient/prescriptions" className="hover:text-white transition-colors">Digital Prescriptions</Link></li>
              <li><Link to="/patient/lab-reports" className="hover:text-white transition-colors">Lab Test Reports</Link></li>
              <li><Link to="/patient/invoices" className="hover:text-white transition-colors">Billing & Invoices</Link></li>
            </ul>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-3">
            <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 font-medium mb-4">EMERGENCY HOTLINE</h4>
            <div className="flex items-center gap-3 text-xs">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 border border-rose-900/40">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div>
                <span className="block font-mono font-bold text-white text-sm">+91 (022) 1800-999-22</span>
                <span className="text-slate-500 font-mono text-[10px]">Ambulance Hotline</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <span className="text-slate-300 font-mono text-xs break-all">support@medicare2.org</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between font-mono text-xs text-slate-500 gap-4">
          <p>© 2026 MediCare 2.0 Enterprise. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-400 cursor-pointer">HIPAA Guidelines</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
