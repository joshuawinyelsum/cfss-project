"use client";

import { useState } from 'react';
import Link from 'next/link';
import { api, getErrorMessage } from '@/lib/api';

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await api.post('/api/v2/auth/recover', { email });
      setSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to request password reset. Please try again later.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4">
      <div className="max-w-md w-full bg-surface rounded-2xl shadow-sm border border-border-strong p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-cfss-green text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-primary mb-2">Forgot your password?</h1>
          <p className="text-sm text-secondary">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </div>

        {success ? (
          <div className="text-center space-y-6">
            <div className="bg-status-success/10 border border-status-success/20 p-4 rounded-xl">
              <p className="text-status-success font-medium">
                If an account exists for that email, you'll receive a password reset link shortly.
              </p>
            </div>
            <Link href="/login" className="block w-full py-3 px-4 bg-cfss-green hover:bg-cfss-green-hover text-white font-medium rounded-xl transition-colors">
              Return to login
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
              <label className="block text-sm font-medium text-primary mb-2">Email Address</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 rounded-xl border border-border-strong bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-cfss-green transition-all"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-cfss-green hover:bg-cfss-green-hover text-white font-medium rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Send reset link'
              )}
            </button>
            <div className="text-center pt-2">
              <Link href="/login" className="text-sm text-cfss-green hover:underline font-medium">
                Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
