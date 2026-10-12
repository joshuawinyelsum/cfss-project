"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuthStore } from '@/lib/store';
import { api, getErrorMessage } from '@/lib/api';

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
      formData.append('username', username.trim());
      formData.append('password', password);

      const res = await api.post('/api/auth/admin/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      const token = res.data.access_token;
      
      let adminProfile = {
        id: null,
        student_id: username.toUpperCase(),
        full_name: 'Administrator',
        program: 'System Admin',
        community: null,
        community_id: null,
        group_number: null,
        registered_at: new Date().toISOString(),
        role: 'admin'
      };

      try {
        const meRes = await api.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (meRes.data) {
          adminProfile = {
            id: meRes.data.id,
            student_id: meRes.data.student_id,
            full_name: meRes.data.name || 'Administrator',
            program: meRes.data.program || 'System Admin',
            community: meRes.data.community_name || null,
            community_id: meRes.data.community_id || null,
            group_number: meRes.data.group_number || null,
            registered_at: meRes.data.created_at || new Date().toISOString(),
            role: meRes.data.role || 'admin'
          };
        }
      } catch (meErr) {
        console.warn('Could not fetch admin profile, using default profile', meErr);
      }
      
      setAuth(token, adminProfile);
      router.push('/admin');
    } catch (err: any) {
      const msg = getErrorMessage(err, 'Incorrect admin credentials');
      setError(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#F8FAFC] p-4 text-slate-800">
      <div className="w-full max-w-sm space-y-6">
        {/* Institutional Title */}
        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">CFSS Fieldwork System</h1>
          <p className="text-xs text-slate-500">
            Administrator Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded border border-slate-200 p-6 space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-semibold text-slate-900">Sign in to Admin Console</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter administrative credentials to access system management.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700 text-xs font-medium animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-xs font-medium text-slate-700 mb-1">
                Admin Username
              </label>
              <input 
                id="username"
                type="text" 
                required 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                placeholder="admin"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#093C22]"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-slate-700 mb-1">
                Password
              </label>
              <input 
                id="password"
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#093C22]"
              />
            </div>

            <button 
              type="submit"
              disabled={isLoading || !username || !password}
              className="w-full mt-1 py-2 px-4 bg-[#093C22] hover:bg-[#072f1a] text-white font-medium text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Authenticating..." : "Sign In to Admin Console"}
            </button>
          </form>

          <div className="pt-3 border-t border-slate-100 text-center text-2xs text-slate-400">
            <span>Encrypted session • Role-based access enforced</span>
          </div>
        </div>

        {/* Link to student portal */}
        <div className="text-center">
          <Link 
            href="/login" 
            className="text-xs text-slate-500 hover:text-slate-800 hover:underline"
          >
            ← Switch to Student Fieldwork Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
