"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuthStore } from '@/lib/store';
import { getErrorMessage } from '@/lib/api';

export default function LoginPage() {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((state: any) => state.setAuth);
  
  useEffect(() => {
    setRegistered(new URLSearchParams(window.location.search).get('registered') === 'true');
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const payload = {
        student_id: studentId.trim().toUpperCase(),
        password
      };
      console.log("Login payload:", { student_id: payload.student_id, password: "***" });
      
      const res = await axios.post('http://127.0.0.1:8000/api/v2/students/login', payload);
      console.log("Login response:", res.data);
      
      const token = res.data.access_token;
      
      const userRes = await axios.get('http://127.0.0.1:8000/api/v2/students/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Add role manually since it's implied for students in this portal
      const userData = { ...userRes.data, role: 'student' };
      
      setAuth(token, userData);
      router.push('/dashboard');
    } catch (err: any) {
      console.error("Login error:", err?.response?.data || err.message);
      setError(getErrorMessage(err, 'Invalid student ID or password'));
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
            className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm"
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
            className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm"
          />
        </div>
        <button 
          type="submit" 
          className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          Sign In
        </button>
      </form>
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Don't have an account? <a href="/register" className="text-blue-600 hover:underline">Register here</a>
        </p>
      </div>
      </div>
    </div>
  );
}
