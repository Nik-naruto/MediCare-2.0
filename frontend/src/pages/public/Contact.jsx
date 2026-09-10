import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, PhoneCall, MapPin, Send, ArrowRight, ShieldCheck } from 'lucide-react';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { useToast } from '../../context/ToastContext';

export const Contact = () => {
  const { addToast } = useToast();
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    addToast('Your message has been sent to our helpdesk team!', 'success');
    setFormData({ name: '', email: '', phone: '', message: '' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-10 text-left bg-[#FBF9F4] dark:bg-[#0C0E12] transition-colors min-h-[calc(100vh-5rem)]">
      {/* Page Header */}
      <div className="max-w-xl">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 font-semibold block mb-2">
          SUPPORT & LOCATION
        </span>
        <h1 className="text-3xl sm:text-4xl font-light text-slate-900 dark:text-slate-100 tracking-tight">
          Contact & Clinical Support
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-2 leading-relaxed">
          Have questions about OPD slots, diagnostic services, emergency trauma care, or medical portal access?
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Info Cards Left Column */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900/60">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <span className="font-mono text-[10px] font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                24/7 Emergency Hotline
              </span>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">+91 (022) 1800-999-22</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Emergency trauma desk & ambulance dispatch.</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <span className="font-mono text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Email Helpdesk
              </span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">support@medicare2.org</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Inquiries, slot booking help, and portal support.</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="font-mono text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Main Campus
              </span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">Central Medical District</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Healthcare Boulevard, Mumbai, MH 400001</p>
            </div>
          </div>

          {/* Patient Coordination CTA Card */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md text-slate-900 dark:text-slate-100 flex flex-col justify-between space-y-6">
            <div className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 font-semibold block">
                PATIENT COORDINATION
              </span>
              <h3 className="text-xl sm:text-2xl font-light text-slate-900 dark:text-slate-100 tracking-tight">
                Need Medical Assistance?
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
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

        {/* Inquiry Form Right Column */}
        <div className="lg:col-span-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md space-y-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Send an Inquiry</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Fill out the form below and our clinical helpdesk will respond shortly.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Full Name"
                required
                placeholder="e.g. Aarav Gupta"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <Input
                label="Email Address"
                type="email"
                required
                placeholder="aarav@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <Input
                label="Phone Number"
                placeholder="+91 9876543210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Your Message</label>
                <textarea
                  rows={4}
                  required
                  className="w-full rounded-2xl border border-slate-300/80 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="How can our clinical support team assist you today?"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>
              <Button variant="primary" type="submit" size="lg" icon={Send} iconPosition="right" className="w-full rounded-full py-3.5 text-xs sm:text-sm font-bold shadow-md">
                Submit Inquiry
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
