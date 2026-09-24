
"use client";

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, getErrorMessage } from '@/lib/api';

function ResetPasswordContent() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!token) {
      setError('Invalid or missing recovery token. Please request a new password reset.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/api/v2/auth/reset-password', { token, new_password: password,
        confirm_new_password: confirmPassword });
      setSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to reset password. The link may have expired.'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page px-4">
        <div className="max-w-md w-full bg-surface rounded-2xl shadow-sm border border-border-strong p-8 text-center">
          <div className="bg-status-error/10 border-l-4 border-status-error p-4 rounded-md mb-6 text-left">
            <p className="text-sm text-status-error">Invalid or missing recovery token. Please request a new password reset link.</p>
          </div>
          <Link href="/recover-password" className="block w-full py-3 px-4 bg-cfss-green hover:bg-cfss-green-hover text-white font-medium rounded-xl transition-colors">
            Request password reset
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4">
      <div className="max-w-md w-full bg-surface rounded-2xl shadow-sm border border-border-strong p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-cfss-green text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-primary mb-2">Reset your password</h1>
          <p className="text-sm text-secondary">
            Enter your new password below.
          </p>
        </div>

        {success ? (
          <div className="text-center space-y-6">
            <div className="bg-status-success/10 border border-status-success/20 p-4 rounded-xl">
              <p className="text-status-success font-medium">
                Password updated successfully. You can now sign in with your new password.
              </p>
            </div>
            <Link href="/login" className="block w-full py-3 px-4 bg-cfss-green hover:bg-cfss-green-hover text-white font-medium rounded-xl transition-colors">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-status-error/10 border-l-4 border-status-error p-4 rounded-md">
                <p className="text-sm text-status-error">{error}</p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-primary mb-2">New password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-border-strong bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-cfss-green transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Confirm new password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-border-strong bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-cfss-green transition-all"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-center">
              <input
                id="show-password"
                type="checkbox"
                className="h-4 w-4 text-cfss-green focus:ring-cfss-green border-border rounded"
                checked={showPassword}
                onChange={() => setShowPassword(!showPassword)}
              />
              <label htmlFor="show-password" className="ml-2 block text-sm text-secondary cursor-pointer">
                Show password
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-cfss-green hover:bg-cfss-green-hover text-white font-medium rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Reset password'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}


export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="w-8 h-8 border-4 border-cfss-green border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
