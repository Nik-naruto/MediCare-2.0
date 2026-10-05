import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  HeartPulse,
  Sparkles,
  Users,
  ArrowRight,
  KeyRound,
} from 'lucide-react';
import { useAuth, normalizeRole } from '../../context/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useToast } from '../../context/ToastContext';

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const user = await login(email.trim(), password);
      const authenticatedRole = normalizeRole(user.role);
      addToast(`Welcome back, ${user.full_name || user.name || user.email}!`, 'success');
      navigate(`/${authenticatedRole.toLowerCase()}/dashboard`);
    } catch (err) {
      const message =
        err.message || err.detail || 'Invalid email or password. Please check your credentials.';
      setErrorMsg(message);
      addToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex items-center justify-center">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch w-full">
        {/* LEFT COLUMN — PROMOTIONAL PANEL */}
        <div className="lg:col-span-5 rounded-3xl bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white p-6 sm:p-8 lg:p-10 flex flex-col justify-between shadow-xl relative overflow-hidden border border-slate-800">
          {/* Ambient Background Accents */}
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-sky-500/10 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-64 h-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none"></div>

          {/* Top Brand Header */}
          <div className="space-y-6 relative z-10 text-left">
            <div className="inline-flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md">
              <Activity className="w-5 h-5 text-sky-400" />
              <span className="text-sm font-black tracking-tight text-white">MediCare 2.0</span>
              <span className="text-[10px] font-bold text-sky-300 uppercase tracking-widest px-2 py-0.5 bg-sky-500/20 rounded-md">
                Authentication
              </span>
            </div>

            <div>
              <h2 className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-1">
                Your Health, Our Priority
              </h2>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                Welcome Back to MediCare 2.0
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 font-medium leading-relaxed">
                Your trusted healthcare platform for appointments, medical records, prescriptions and patient care.
              </p>
            </div>
          </div>

          {/* Core Trust / Value Features */}
          <div className="space-y-3.5 my-8 relative z-10 text-left">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3.5 backdrop-blur-xs hover:bg-white/10 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-400/20">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-tight">Trusted Healthcare</h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Connect with doctors and seamlessly manage your healthcare journey
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3.5 backdrop-blur-xs hover:bg-white/10 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-400/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-tight">Secure & Confidential</h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Your personal healthcare information and records are protected
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3.5 backdrop-blur-xs hover:bg-white/10 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-400/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-tight">Easy & Convenient</h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Access appointments and health information from anywhere
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3.5 backdrop-blur-xs hover:bg-white/10 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-400/20">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-tight">Better Care, Together</h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Making healthcare simpler, faster, and accessible for everyone
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Quote Footer */}
          <div className="pt-4 border-t border-slate-800 relative z-10 text-left">
            <p className="text-xs italic text-slate-400 font-medium">
              &ldquo;Healthcare made simple, for everyone.&rdquo;
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN — LOGIN CARD FORM */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-8 lg:p-10 shadow-xl border border-slate-200/80 text-left flex flex-col justify-between">
          <div>
            {/* Top Registration Redirect Link */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-8 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Welcome Back
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Sign in to your MediCare 2.0 account
                </p>
              </div>

              <div className="sm:text-right shrink-0">
                <span className="block text-[11px] text-slate-500 font-medium">Don&apos;t have an account?</span>
                <Link
                  to="/register"
                  className="text-xs font-bold text-sky-600 hover:text-sky-800 hover:underline transition-colors inline-flex items-center gap-1"
                >
                  Create Account &rarr;
                </Link>
              </div>
            </div>

            {/* Error Message Alert */}
            {errorMsg && (
              <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                <div className="flex-1 leading-relaxed">{errorMsg}</div>
              </div>
            )}

            {/* LOGIN FORM */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Email Address"
                type="email"
                required
                icon={Mail}
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <div>
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  icon={Lock}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  endAction={
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="p-1.5 -mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none transition-colors cursor-pointer rounded-lg"
                      title={showPassword ? 'Hide password' : 'Show password'}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />

                <div className="mt-2 text-right">
                  <Link
                    to="/forgot-password"
                    className="text-xs font-bold text-sky-600 hover:text-sky-800 hover:underline transition-colors inline-flex items-center gap-1"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Forgot Password?</span>
                  </Link>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-3.5 text-sm font-black shadow-md rounded-2xl flex items-center justify-center gap-2"
                  isLoading={isLoading}
                >
                  <span>Sign In to Account</span>
                  {!isLoading && <ArrowRight className="w-4 h-4" />}
                </Button>
              </div>
            </form>
          </div>

          {/* Bottom Account Prompt Footer */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500 font-medium">
              Don&apos;t have an account yet?{' '}
              <Link
                to="/register"
                className="font-bold text-sky-600 hover:text-sky-800 hover:underline transition-colors ml-1"
              >
                Register now for free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
