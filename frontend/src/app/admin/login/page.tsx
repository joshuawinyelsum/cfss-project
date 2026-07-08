"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuthStore } from '@/lib/store';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const setAuth = useAuthStore((state: any) => state.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const isBrowser = typeof window !== "undefined";
      const apiHost = isBrowser ? window.location.hostname : "127.0.0.1";
      const res = await axios.post(`http://${apiHost}:8000/api/auth/admin/login`, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      const token = res.data.access_token;
      
      setAuth(token, {
        student_id: 'admin',
        full_name: 'Administrator',
        program: 'System Admin',
        community: null,
        group_number: null,
        registered_at: new Date().toISOString(),
        role: 'admin'
      });
      
      router.push('/admin');
    } catch (err: any) {
      let msg = 'Admin login failed';
      if (err.response?.data?.detail) {
        msg = typeof err.response.data.detail === 'string' 
          ? err.response.data.detail 
          : err.response.data.detail[0]?.msg || msg;
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full bg-white p-8 border border-gray-200 rounded shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">CFSS Admin Portal</h1>
          <p className="text-sm text-gray-500 mt-2">Administrator Access Only</p>
        </div>
        
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm border border-red-200 rounded">{error}</div>}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input 
              type="text" 
              required 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm"
              placeholder="Admin Username"
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
            className="w-full bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 text-sm font-medium"
          >
            Sign In to Admin Portal
          </button>
        </form>
      </div>
    </div>
  );
}
 
