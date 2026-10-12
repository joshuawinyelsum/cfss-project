"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuthStore } from '@/lib/store';
import { api, getErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';

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
        console.warn('Could not fetch admin me profile, using defaults', meErr);
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-page p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">CFSS Fieldwork</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Admin Portal</CardTitle>
            <CardDescription>Administrator Access Only</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                {error}
              </Alert>
            )}
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username"
                  type="text" 
                  required 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  placeholder="Enter username"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label htmlFor="password" className="mb-0">Password</Label>
                </div>
                <Input 
                  id="password"
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  placeholder="••••••••"
                />
              </div>
              <Button 
                type="submit"
                disabled={isLoading}
                className="w-full mt-2"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
