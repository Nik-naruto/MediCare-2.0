import React from 'react';
import { Award, ShieldCheck, HeartPulse, Building2, Users } from 'lucide-react';
import { Card } from '../../components/common/Card';

export const About = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-12 text-left bg-[#FBF9F4] dark:bg-[#0C0E12] transition-colors min-h-[calc(100vh-5rem)]">
      {/* Title */}
      <div className="max-w-3xl">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 font-semibold block mb-2">
          ABOUT MEDICARE 2.0
        </span>
        <h1 className="text-3xl font-light text-slate-900 dark:text-slate-100 tracking-tight sm:text-4xl">
          Healthcare Excellence & Innovation
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-3 leading-relaxed font-sans">
          MediCare 2.0 is an enterprise healthcare organization committed to providing accessible, high-quality, and technologically advanced medical services to patients nationwide.
        </p>
      </div>

      {/* Grid Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-4 border border-sky-100 dark:border-sky-900/60">
            <HeartPulse className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Patient-Centric Care</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed font-sans">
            Our treatment plans prioritize individual patient comfort, privacy, transparent billing, and clear clinical outcomes.
          </p>
        </Card>

        <Card className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-4 border border-teal-100 dark:border-teal-900/60">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">NABL & NABH Accredited</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed font-sans">
            Operating under rigorous national health quality standards with certified pathology laboratories and intensive care protocols.
          </p>
        </Card>

        <Card className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4 border border-purple-100 dark:border-purple-900/60">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Advanced Infrastructure</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed font-sans">
            Equipped with 3 Tesla MRI scanners, cardiac catheterization labs, modular operating suites, and electronic health systems.
          </p>
        </Card>
      </div>

      {/* Leadership Stats */}
      <div className="bg-slate-900 dark:bg-slate-950 text-white rounded-3xl p-8 lg:p-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center border border-slate-800 shadow-lg">
        <div>
          <span className="block text-3xl sm:text-4xl font-light text-sky-400 font-mono">25+</span>
          <span className="text-xs font-mono text-slate-400 mt-1 uppercase tracking-wider block">Years of Service</span>
        </div>
        <div>
          <span className="block text-3xl sm:text-4xl font-light text-teal-400 font-mono">120+</span>
          <span className="text-xs font-mono text-slate-400 mt-1 uppercase tracking-wider block">Super Specialists</span>
        </div>
        <div>
          <span className="block text-3xl sm:text-4xl font-light text-amber-400 font-mono">500k+</span>
          <span className="text-xs font-mono text-slate-400 mt-1 uppercase tracking-wider block">Patients Treated</span>
        </div>
        <div>
          <span className="block text-3xl sm:text-4xl font-light text-purple-400 font-mono">45</span>
          <span className="text-xs font-mono text-slate-400 mt-1 uppercase tracking-wider block">Departments</span>
        </div>
      </div>
    </div>
  );
};
