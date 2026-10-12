"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { syncEngine } from '@/lib/sync';
import DashboardLayout from '@/app/dashboard/layout';
import Link from 'next/link';
import { Home, Book, Heart, Building, ArrowRight, ClipboardList, FileEdit } from 'lucide-react';

const SURVEY_TYPES = [
  { id: 'HOUSEHOLD', name: 'Household Survey', icon: Home, desc: 'Collect household demography, socio-economic and living conditions.' },
  { id: 'EDUCATION', name: 'Education Survey', icon: Book, desc: 'Assess schooling facilities, enrollment, and local educational access.' },
  { id: 'HEALTH', name: 'Health Survey', icon: Heart, desc: 'Record local public health centers, sanitation, and common health challenges.' },
  { id: 'GOVERNANCE', name: 'Governance & Infrastructure', icon: Building, desc: 'Evaluate community leadership, civic amenities, and infrastructure.' }
];

export default function SurveysPage() {
  const { user, token, logout } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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
    
    if (user?.role !== 'student') {
      router.push('/login');
      return;
    }
    
    const loadStats = async () => {
      if (token && navigator.onLine) {
        syncEngine.prefetchTemplates(token).catch(console.error);
      }
      let localStats: any = {};
      try {
        const { db } = await import('@/lib/db');
        const userSurveys = await db.surveys.where('student_id').equals(user.id as number).toArray();
        const activeSurveys = userSurveys.filter(s => s.status !== 'DELETED');
        
        for (const type of SURVEY_TYPES) {
          const typeSurveys = activeSurveys.filter(s => s.survey_type === type.id);
          localStats[type.id] = {
            submitted: typeSurveys.filter(s => s.status === 'SUBMITTED').length,
            drafts: typeSurveys.filter(s => s.status === 'DRAFT').length
          };
        }
      } catch (e) {
        console.error("Failed to load local survey stats", e);
      }

      if (!navigator.onLine) {
        setStats(localStats);
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/api/student/surveys/stats', { headers: { Authorization: `Bearer ${token}` } });
        // Merge server stats with local drafts in case server doesn't know about them
        const serverStats = res.data;
        const mergedStats: any = {};
        for (const type of SURVEY_TYPES) {
          mergedStats[type.id] = {
            submitted: Math.max(serverStats[type.id]?.submitted || 0, localStats[type.id]?.submitted || 0),
            drafts: Math.max(serverStats[type.id]?.drafts || 0, localStats[type.id]?.drafts || 0)
          };
        }
        setStats(mergedStats);
      } catch (e) { console.error("Failed to load survey stats", e); setStats(localStats); } finally {
        setLoading(false);
      }
    };
    
    loadStats();
  }, [user, token, router, hydrated]);

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">Surveys</h1>
            <p className="text-muted mt-1">Manage data collection for your assigned community: <strong className="text-secondary">{user.community}</strong></p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-surface p-6 rounded-xl border border-border-strong animate-pulse h-48"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SURVEY_TYPES.map(type => {
              const typeStats = stats?.[type.id] || { submitted: 0, drafts: 0 };
              const Icon = type.icon;
              
              return (
                <div key={type.id} className="bg-surface rounded-xl shadow-xs border border-border-strong p-6 flex flex-col hover:border-cfss-green transition-all">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-cfss-green-soft text-cfss-green flex items-center justify-center shrink-0">
                      <Icon size={24} />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-primary">{type.name}</h2>
                      <p className="text-xs text-secondary mt-1">{type.desc}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 mt-2 mb-6 pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="text-muted" size={15} />
                      <span className="text-xs font-medium text-secondary">Completed: <strong className="text-primary font-semibold">{typeStats.submitted}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileEdit className="text-muted" size={15} />
                      <span className="text-xs font-medium text-secondary">Drafts: <strong className="text-cfss-green font-semibold">{typeStats.drafts}</strong></span>
                    </div>
                  </div>
                  
                  <Link 
                    href={`/surveys/${type.id.toLowerCase()}`}
                    className="mt-auto w-full py-2.5 bg-cfss-green hover:bg-cfss-green-hover text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-xs"
                  >
                    Open Survey <ArrowRight size={15} />
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

