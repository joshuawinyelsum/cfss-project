"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { api, getErrorMessage } from '@/lib/api';

export default function LoginPage() {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setAuth = useAuthStore((state: any) => state.setAuth);
  
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRegistered(new URLSearchParams(window.location.search).get('registered') === 'true');
  }, []);

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
        headers: { Authorization: `Bearer ${token}` }
      });

      // Admin accounts can authenticate through this endpoint too — route
      // them to the admin portal instead of the student dashboard.
      const payload64 = token.split('.')[1];
      const role = JSON.parse(atob(payload64)).role;
      if (role === 'admin') {
        setAuth(token, {
          ...userRes.data,
          role: 'admin',
          full_name: 'Administrator',
          program: 'System Admin'
        });
        router.push('/admin');
        return;
      }

      // Add role manually since it's implied for students in this portal
      const userData = { ...userRes.data, role: 'student' };
      
      setAuth(token, userData);
      router.push('/dashboard');
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error = err as any;
      console.error("Login error object:", error);
      if (error.response) {
        console.error("Response data:", error.response.data);
      } else {
        console.error("Network or parsing error. Backend might not be reachable.");
      }
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
          <label className="block text-sm font-medium text-gray-700">Password</label>
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
