"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { api, getErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';

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
          useAuthStore.getState().logout();
          setIsVerifying(false);
          return;
        }

        setIsVerifying(true);
        try {
          await api.get('/api/v2/students/me', {
            headers: { Authorization: 'Bearer ' + token }
          });
          router.push('/dashboard');
        } catch (err: any) {
          if (err.response?.status === 401) {
            useAuthStore.getState().logout();
            setIsVerifying(false);
          } else {
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
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="w-8 h-8 border-4 border-cfss-green border-t-transparent rounded-full animate-spin"></div>
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
      
      const res = await api.post('/api/v2/students/login', payload);
      const token = res.data.access_token;

      const userRes = await api.get('/api/v2/students/me', {
        headers: { Authorization: 'Bearer ' + token }
      });

      const payload64 = token.split('.')[1];
      const role = JSON.parse(atob(payload64)).role;
      if (role === 'admin') {
        setIsLoading(false);
        setError('Please use the Admin Portal (/admin/login) to log in as an administrator.');
        return;
      }

      const userData = { ...userRes.data, role: 'student' };
      
      setAuth(token, userData);
      router.push('/dashboard');
    } catch (err: unknown) {
      const error = err as any;
      setError(getErrorMessage(error, 'Invalid student ID or password (or backend is unreachable)'));
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
            <CardTitle>Student Portal</CardTitle>
            <CardDescription>Log in to access your fieldwork tasks</CardDescription>
          </CardHeader>
          <CardContent>
            {registered && (
              <Alert variant="success" className="mb-4">
                Registration successful! Please log in.
              </Alert>
            )}
            
            {error && (
              <Alert variant="destructive" className="mb-4">
                {error}
              </Alert>
            )}
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="studentId">Student ID</Label>
                <Input 
                  id="studentId"
                  type="text" 
                  required 
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                  disabled={isLoading}
                  placeholder="e.g. ABC/1234/5678"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label htmlFor="password" className="mb-0">Password</Label>
                  <Link href="/recover-password" className="text-sm font-medium text-cfss-green hover:underline">Forgot password?</Link>
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
          <CardFooter className="justify-center">
            <p className="text-sm text-gray-600">
              Don't have an account? <Link href="/register" className="text-cfss-green font-medium hover:underline">Register here</Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
