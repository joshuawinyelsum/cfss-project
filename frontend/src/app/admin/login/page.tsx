"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuthStore } from '@/lib/store';
import { api } from '@/lib/api';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAdminAuthStore((state: any) => state.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const res = await api.post('/api/auth/admin/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      const token = res.data.access_token;
      
      setAuth(token, {
        id: null,
        student_id: 'admin',
        full_name: 'Administrator',
        program: 'System Admin',
        community: null,
        community_id: null,
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
      setIsLoading(false);
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
              disabled={isLoading}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm text-gray-900 bg-white placeholder-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
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
            {isLoading ? 'Signing In...' : 'Sign In to Admin Portal'}
          </button>
        </form>
      </div>
    </div>
  );
}
