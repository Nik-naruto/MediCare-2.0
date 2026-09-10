import React, { useState } from 'react';
import { Settings, Save, AlertCircle } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useToast } from '../../context/ToastContext';

export const SystemSettings = () => {
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    hospitalName: 'MediCare 2.0 Enterprise Health',
    helpline: '+91 (022) 1800-999-22',
    supportEmail: 'support@medicare2.org',
  });

  const handleSave = (e) => {
    e.preventDefault();
    addToast(
      'Backend settings persistence API is currently unavailable. Changes cannot be saved to database.',
      'error'
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Global Settings</h1>
        <p className="text-xs text-slate-500">Configure global parameters, emergency banners, and maintenance modes</p>
      </div>

      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2.5">
        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
        <span>
          Backend settings API contract is currently unmapped. Configuration changes will not be saved to PostgreSQL database.
        </span>
      </div>

      <Card>
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Hospital Platform Name"
            value={formData.hospitalName}
            onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
          />
          <Input
            label="Emergency Helpline Hotline"
            value={formData.helpline}
            onChange={(e) => setFormData({ ...formData, helpline: e.target.value })}
          />
          <Input
            label="Support Email Address"
            type="email"
            value={formData.supportEmail}
            onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
          />

          <div className="pt-2">
            <Button type="submit" variant="primary" icon={Save}>
              Save Global Configuration
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

