"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { api, getErrorMessage } from '@/lib/api';

export default function LoginPage() {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((state: any) => state.setAuth);
  const token = useAuthStore((state: any) => state.token);
  const user = useAuthStore((state: any) => state.user);
  
  const [hydrated, setHydrated] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const verify = async () => {
      if (token && user) {
        if (user.role === 'admin') {
          // If the student store somehow contains an admin role (from before the storage separation),
          // clear it out so it doesn't pollute the student portal.
          useAuthStore.getState().logout();
          setIsVerifying(false);
          return;
        }

        setIsVerifying(true);
        try {
          // Verify token is still valid. If offline, it throws a network error (no response)
          // and we still allow them to proceed offline.
          await api.get('/api/v2/students/me', {
            headers: { Authorization: 'Bearer ' + token }
          });
          router.push('/dashboard');
        } catch (err: any) {
          if (err.response?.status === 401) {
            useAuthStore.getState().logout();
            setIsVerifying(false);
          } else {
            // Network error (offline) or server error - assume token is valid enough for offline DB
            router.push('/dashboard');
          }
        }
      }
    };
    
    verify();
    
    setRegistered(new URLSearchParams(window.location.search).get('registered') === 'true');
  }, [hydrated, token, user, router]);

  if (!hydrated || isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const payload = {
        student_id: studentId.trim().toUpperCase(),
        password
      };
      console.log("Login payload:", { student_id: payload.student_id, password: "***" });
      
      const res = await api.post('/api/v2/students/login', payload);
      console.log("Login response:", res.data);

      const token = res.data.access_token;

      const userRes = await api.get('/api/v2/students/me', {
        headers: { Authorization: 'Bearer ' + token }
      });

      // Admin accounts should not log in through the student portal.
      const payload64 = token.split('.')[1];
      const role = JSON.parse(atob(payload64)).role;
      if (role === 'admin') {
        setIsLoading(false);
        setError('Please use the Admin Portal (/admin/login) to log in as an administrator.');
        return;
      }

      // Add role manually since it's implied for students in this portal
      const userData = { ...userRes.data, role: 'student' };
      
      setAuth(token, userData);
      router.push('/dashboard');
    } catch (err: unknown) {
      const error = err as any;
      console.error("Login error object:", error);
      setError(getErrorMessage(error, 'Invalid student ID or password (or backend is unreachable)'));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 border border-gray-200 rounded shadow-sm">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">CFSS Portal</h1>
        <p className="text-sm text-gray-500 mt-2">Community Field Survey System</p>
      </div>
      
      {registered && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm border border-green-200 rounded">
          Registration successful! Please log in.
        </div>
      )}
      
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm border border-red-200 rounded">{error}</div>}
      
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Student ID</label>
          <input 
            type="text" 
            required 
            value={studentId}
            onChange={(e) => setStudentId(e.target.value.toUpperCase())}
            disabled={isLoading}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm text-gray-900 bg-white placeholder-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
            placeholder="e.g. ABC/1234/5678"
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-primary">Password</label>
                <Link href="/recover-password" className="text-sm font-medium text-cfss-green hover:underline">Forgot password?</Link>
              </div>
          <input 
            type="password" 
            required 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm text-gray-900 bg-white placeholder-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
        <button 
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
          {isLoading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Don&apos;t have an account? <a href="/register" className="text-blue-600 hover:underline">Register here</a>
        </p>
      </div>
      </div>
    </div>
  );
}
