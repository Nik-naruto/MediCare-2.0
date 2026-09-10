import React, { useState, useEffect } from 'react';
import { Stethoscope } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

export const Services = () => {
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    Promise.all([
      apiClient.get('/departments/').catch(() => ({ data: [] })),
      apiClient.get('/doctors/?limit=1000').catch(() => ({ data: [] })),
    ]).then(([deptsRes, docsRes]) => {
      const rawDepts = Array.isArray(deptsRes.data) ? deptsRes.data : [];
      const rawDocs = Array.isArray(docsRes.data) ? docsRes.data : [];

      const docCountMap = {};
      rawDocs.forEach((d) => {
        if (d.department_id) {
          docCountMap[d.department_id] = (docCountMap[d.department_id] || 0) + 1;
        }
      });

      const docMap = {};
      rawDocs.forEach((d) => {
        docMap[d.id] = d.user?.full_name || d.name || `Dr. #${d.id}`;
      });

      setDepartments(
        rawDepts.map((dept) => ({
          id: dept.id,
          name: dept.name,
          description: dept.description || 'Specialized clinical OPD & IPD medical services.',
          location: dept.location || 'Main Hospital Campus',
          headDoctor: dept.head_doctor_id && docMap[dept.head_doctor_id] ? docMap[dept.head_doctor_id] : '--',
          totalDoctors: docCountMap[dept.id] || 0,
        }))
      );
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-10 text-left bg-[#FBF9F4] dark:bg-[#0C0E12] transition-colors min-h-[calc(100vh-5rem)]">
      <div>
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 font-semibold block mb-2">
          CLINICAL CATALOG
        </span>
        <h1 className="text-3xl font-light text-slate-900 dark:text-slate-100 tracking-tight sm:text-4xl">
          Hospital Departments & Services
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-2 leading-relaxed">
          Specialized OPD, IPD, diagnostic imaging, pathology, and emergency care modules.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {departments.map((dept) => (
          <Card key={dept.id} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold shrink-0 border border-teal-100 dark:border-teal-900/60">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">{dept.name}</h3>
                  <Badge variant="slate" className="shrink-0 font-mono text-[10px]">{dept.totalDoctors} Doctors</Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">{dept.description}</p>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-4 text-xs font-sans">
                  <span className="text-slate-500 dark:text-slate-400">Department Head: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{dept.headDoctor}</strong></span>
                  <span className="text-slate-500 dark:text-slate-400">Location: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{dept.location}</strong></span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
