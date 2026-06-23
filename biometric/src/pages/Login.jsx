import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Fingerprint, Eye, EyeOff, Wifi, WifiOff } from 'lucide-react';

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password.');
      return;
    }
    const result = await login(email.trim(), password);
    if (result.success) {
      navigate('/today', { replace: true });
    } else {
      setError(result.error || 'Login failed. Check your credentials.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
         style={{
           background: 'linear-gradient(135deg, #0A0A0B 0%, #161618 50%, #0A0A0B 100%)',
         }}>

      {/* Animated background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20"
             style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)',
                      animation: 'pulse 4s ease-in-out infinite' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-15"
             style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)',
                      animation: 'pulse 4s ease-in-out infinite 2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]
                        rounded-full opacity-5 border border-emerald-400" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px]
                        rounded-full opacity-10 border border-emerald-500" />
      </div>

      <div className="relative w-full max-w-md px-6">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4"
               style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
            <Fingerprint className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">AcademicX</h1>
          <p className="text-emerald-300 mt-1 text-sm font-medium">Biometric Attendance System</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8 shadow-2xl"
             style={{ background: 'rgba(13,21,38,0.95)', border: '1px solid rgba(16,185,129,0.2)',
                      backdropFilter: 'blur(12px)' }}>
          <h2 className="text-xl font-semibold text-white mb-1">Admin Sign In</h2>
          <p className="text-gray-400 text-sm mb-6">
            Access the biometric scanner dashboard
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/40 border border-red-700/60
                            text-red-300 text-sm flex items-center gap-2">
              <WifiOff className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@academicx.edu"
                className="input-field"
                autoComplete="email"
                autoFocus
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pr-11"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                             hover:text-gray-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-base mt-2 flex items-center justify-center gap-2"
              style={{ background: loading ? '#065f46' : 'linear-gradient(135deg, #059669, #10b981)' }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10"
                            stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                <>
                  <Wifi className="w-5 h-5" />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Dedicated classroom attendance device · AcademicX v1.0
        </p>
      </div>
    </div>
  );
}
