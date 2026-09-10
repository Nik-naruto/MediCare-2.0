import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Activity, ArrowLeft, Info } from 'lucide-react';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { useToast } from '../../context/ToastContext';

export const ForgotPassword = () => {
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const msg = 'Password reset functionality will be available soon.';
    setInfoMsg(msg);
    addToast(msg, 'info');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6 text-left">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center mx-auto shadow-md">
            <Activity className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Forgot Password?</h1>
          <p className="text-xs text-slate-500">
            Enter your registered email address below to receive password reset instructions.
          </p>
        </div>

        {infoMsg && (
          <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-xs flex items-center gap-2.5">
            <Info className="w-4 h-4 shrink-0 text-sky-600" />
            <span>{infoMsg}</span>
          </div>
        )}

        <Card className="shadow-lg border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email Address"
              type="email"
              required
              icon={Mail}
              placeholder="Enter your registered email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Button type="submit" variant="primary" className="w-full">
              Send Reset Link
            </Button>
          </form>
        </Card>

        <div className="text-center pt-2">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
