"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import DashboardLayout from '@/app/dashboard/layout';
import Link from 'next/link';
import { Home, Book, Heart, Building, ArrowRight, ClipboardList, FileEdit } from 'lucide-react';

const SURVEY_TYPES = [
  { id: 'HOUSEHOLD', name: 'Household Survey', icon: Home, desc: 'Collect household information within your assigned community.', classes: 'bg-emerald-50 text-emerald-600' },
  { id: 'EDUCATION', name: 'Education Survey', icon: Book, desc: 'Assess educational facilities and accessibility.', classes: 'bg-blue-50 text-blue-600' },
  { id: 'HEALTH', name: 'Health Survey', icon: Heart, desc: 'Collect data on health facilities and common health issues.', classes: 'bg-red-50 text-red-600' },
  { id: 'GOVERNANCE', name: 'Governance & Infrastructure Survey', icon: Building, desc: 'Evaluate local governance and infrastructure projects.', classes: 'bg-purple-50 text-purple-600' }
];

export default function SurveysPage() {
  const { user, token, logout } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    
    if (user?.role !== 'student') {
      router.push('/login');
      return;
    }
    
    const loadStats = async () => {
      try {
        const res = await api.get('/api/student/surveys/stats', { headers: { Authorization: `Bearer ${token}` } });
        setStats(res.data);
      } catch (e) {
        console.error("Failed to load survey stats", e);
      } finally {
        setLoading(false);
      }
    };
    
    loadStats();
  }, [user, token, router]);

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Surveys</h1>
            <p className="text-gray-500 mt-1">Manage data collection for your assigned community: <strong className="text-gray-700">{user.community}</strong></p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 animate-pulse h-48"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SURVEY_TYPES.map(type => {
              const typeStats = stats?.[type.id] || { submitted: 0, drafts: 0 };
              const Icon = type.icon;
              
              return (
                <div key={type.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col hover:border-emerald-200 transition-colors">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${type.classes}`}>
                      <Icon size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{type.name}</h2>
                      <p className="text-sm text-gray-500 mt-1">{type.desc}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 mt-2 mb-6">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="text-gray-400" size={16} />
                      <span className="text-sm font-medium text-gray-600">Completed: <strong className="text-gray-900">{typeStats.submitted}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileEdit className="text-gray-400" size={16} />
                      <span className="text-sm font-medium text-gray-600">Drafts: <strong className="text-gray-900">{typeStats.drafts}</strong></span>
                    </div>
                  </div>
                  
                  <Link 
                    href={`/surveys/${type.id.toLowerCase()}`}
                    className="mt-auto w-full py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors border border-emerald-100"
                  >
                    Continue Survey <ArrowRight size={18} />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
