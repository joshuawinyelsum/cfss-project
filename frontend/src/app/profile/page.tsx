"use client";
import Link from 'next/link';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import DashboardLayout from '@/app/dashboard/layout';
import { User as UserIcon , ArrowLeft, LogOut } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function StudentProfile() {
  const { user, token, logout, setAuth } = useAuthStore();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!token) {
      router.push('/login');
      return;
    }
    
    if (!user) {
      api.get('/api/v2/students/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          setAuth(token, { ...res.data, role: 'student' });
          console.log("Profile loaded:", { ...res.data, role: 'student' });
        })
        .catch((err: any) => { 
          if (err.response?.status === 401) {
            logout(); 
            router.push('/login'); 
          }
        });
      return;
    }
    
    if (user.role !== 'student') {
      router.push('/login');
      return;
    }
    
    console.log("Profile loaded:", user);
  }, [user, token, router, logout, setAuth]);

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 pb-12">

        {/* Mobile Back Navigation */}
        <div className="lg:hidden mb-4">
          <Link href="/dashboard/more" className="inline-flex items-center text-sm font-medium text-muted hover:text-primary transition-colors">
            <ArrowLeft size={16} className="mr-1" /> Back to More
          </Link>
        </div>

        {/* SECTION 1: PROFILE HEADER CARD */}
        <Card>
          <CardContent className="p-6 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6">
            <div className="w-24 h-24 rounded-full bg-cfss-green-soft text-cfss-green flex items-center justify-center font-bold text-3xl shrink-0">
              {user.full_name?.charAt(0) || <UserIcon size={40} />}
            </div>
            <div className="flex-1 mt-2">
              <h1 className="text-2xl font-bold text-primary">{user.full_name}</h1>
              <p className="text-muted font-medium">{user.student_id}</p>
              <p className="text-sm text-muted mt-1">{user.program}</p>
              
              <div className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row gap-4 sm:gap-8 justify-center sm:justify-start">
                <div>
                  <p className="text-xs text-muted uppercase font-semibold tracking-wider">Community</p>
                  <p className="font-semibold text-primary mt-0.5">{user.community || 'Not assigned'}</p>
                </div>
                {user.group_number !== null && (
                  <div>
                    <p className="text-xs text-muted uppercase font-semibold tracking-wider">Group</p>
                    <p className="font-semibold text-primary mt-0.5">{user.group_number}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: PERSONAL INFORMATION */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input value={user.full_name || ''} disabled />
              </div>
              <div className="space-y-1.5">
                <Label>Index Number</Label>
                <Input value={user.student_id || ''} disabled />
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Input value={user.gender || 'Not provided'} disabled />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Phone Number
                  <span className="ml-2 text-xs font-normal text-muted">(set by whitelist — contact admin to update)</span>
                </Label>
                <Input value={user.phone_number || 'Not provided'} disabled />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Email</Label>
                <Input value={user.email || 'No email provided'} disabled />
              </div>
              <div className="sm:col-span-1 space-y-1.5">
                <Label>Faculty/School</Label>
                <Input value={user.faculty || 'Not provided'} disabled />
              </div>
              <div className="sm:col-span-1 space-y-1.5">
                <Label>Department</Label>
                <Input value={user.program || ''} disabled />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: ACADEMIC / COMMUNITY INFO */}
        <Card>
          <CardHeader>
            <CardTitle>Assignment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted">Community Assignment</p>
                <p className="font-semibold text-primary text-lg mt-1">{user.community || 'Not assigned'}</p>
              </div>
              {user.group_number !== null && (
                <div>
                  <p className="text-sm text-muted">Group Number</p>
                  <p className="font-semibold text-primary text-lg mt-1">{user.group_number}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SECTION 4: LOGOUT */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-primary">Account Access</h2>
                <p className="text-sm text-muted mt-1">Sign out of your student account securely.</p>
              </div>
              <Button 
                variant="destructive"
                onClick={() => {
                  logout();
                  router.push('/login');
                }}
                className="w-full sm:w-auto"
              >
                <LogOut size={16} className="mr-2" />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}


