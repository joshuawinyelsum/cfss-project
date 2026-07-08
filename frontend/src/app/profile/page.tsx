"use client";

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import DashboardLayout from '@/app/dashboard/layout';
import { User as UserIcon } from 'lucide-react';

export default function StudentProfile() {
  const { user, token, logout, setAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
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
        .catch(() => { logout(); router.push('/login'); });
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
        {/* SECTION 1: PROFILE HEADER CARD */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6">
          <div className="w-24 h-24 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-3xl shrink-0">
            {user.full_name?.charAt(0) || <UserIcon size={40} />}
          </div>
          <div className="flex-1 mt-2">
            <h1 className="text-2xl font-bold text-gray-900">{user.full_name}</h1>
            <p className="text-gray-500 font-medium">{user.student_id}</p>
            <p className="text-sm text-gray-400 mt-1">{user.program}</p>
            
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-4 sm:gap-8 justify-center sm:justify-start">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Community</p>
                <p className="font-semibold text-gray-900 mt-0.5">{user.community || 'Not assigned'}</p>
              </div>
              {user.group_number !== null && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Group</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{user.group_number}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: PERSONAL INFORMATION */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4">Personal Information</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-500 mb-1.5">Full Name</label>
              <input 
                type="text" 
                value={user.full_name || ''} 
                disabled 
                className="w-full bg-gray-100 border border-gray-200 rounded-lg p-2.5 text-gray-700 font-medium cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1.5">Student ID</label>
              <input 
                type="text" 
                value={user.student_id || ''} 
                disabled 
                className="w-full bg-gray-100 border border-gray-200 rounded-lg p-2.5 text-gray-700 font-medium cursor-not-allowed"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-gray-500 mb-1.5">Program</label>
              <input 
                type="text" 
                value={user.program || ''} 
                disabled 
                className="w-full bg-gray-100 border border-gray-200 rounded-lg p-2.5 text-gray-700 font-medium cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: ACADEMIC / COMMUNITY INFO */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4">Assignment Information</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500">Community Assignment</p>
              <p className="font-semibold text-gray-900 text-lg mt-1">{user.community || 'Not assigned'}</p>
            </div>
            {user.group_number !== null && (
              <div>
                <p className="text-sm text-gray-500">Group Number</p>
                <p className="font-semibold text-gray-900 text-lg mt-1">{user.group_number}</p>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 4: LOGOUT */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Account Access</h2>
              <p className="text-sm text-gray-500 mt-1">Sign out of your student account securely.</p>
            </div>
            <button 
              onClick={() => {
                logout();
                router.push('/login');
              }}
              className="px-6 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 font-medium rounded-lg transition-colors border border-red-100 w-full sm:w-auto text-center"
            >
              Logout
            </button>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
