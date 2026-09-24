"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { db, LocalSurvey } from '@/lib/db';
import Link from 'next/link';
import { FileEdit, CheckSquare, AlertCircle, ArrowRight } from 'lucide-react';

export default function WorkWorkspacePage() {
  const { user, token } = useAuthStore();
  
  const [draftCount, setDraftCount] = useState<number>(0);
  const [submittedCount, setSubmittedCount] = useState<number>(0);
  const [needAttentionCount, setNeedAttentionCount] = useState<number>(0);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !user) return;
    let isMounted = true;
    
    const loadWorkspaceData = async () => {
      setLoading(true);
      try {
        // 1. Get local data
        const localSurveys = await db.surveys.where('student_id').equals(user.id as number).toArray();
        
        // Categorize local
        const localDrafts = localSurveys.filter(s => s.status === 'DRAFT');
        const localPending = localSurveys.filter(s => s.status !== 'DELETED' && (s.sync_status === 'pending' || s.sync_status === 'failed' || (s.status === 'SUBMITTED' && s.sync_status !== 'synced')));
        const localSubmitted = localSurveys.filter(s => s.status === 'SUBMITTED');
        
        // 2. Try fetching server data for recent submitted records
        let serverRecent: LocalSurvey[] = [];
        if (navigator.onLine) {
          try {
             const res = await api.get('/api/student/surveys/dashboard/stats', { 
               headers: { Authorization: `Bearer ${token}` }
             });
             if (res.data?.recent_surveys) {
                serverRecent = res.data.recent_surveys as LocalSurvey[];
             }
          } catch(e) {
             console.warn("Could not fetch server workspace stats", e);
          }
        }
        
        // Combine submitted: local submitted + server submitted
        const allSubmitted: (LocalSurvey & { progress?: number })[] = [...localSubmitted];
        serverRecent.forEach((sr) => {
           if (sr.status === 'SUBMITTED' && !allSubmitted.find(r => r.id === sr.id)) {
               allSubmitted.push(sr);
           }
        });

        if (isMounted) {
           setDraftCount(localDrafts.length);
           setSubmittedCount(allSubmitted.length);
           setNeedAttentionCount(localPending.length);
        }
      } catch (e) {
        console.error("Workspace load error:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    loadWorkspaceData();
    
    return () => { isMounted = false; };
  }, [user, token]);

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">Work</h1>
        <p className="text-sm text-muted mt-1">Your fieldwork in one place.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-40 bg-surface rounded-xl animate-pulse border border-border-strong"></div>
          <div className="h-40 bg-surface rounded-xl animate-pulse border border-border-strong"></div>
          <div className="h-40 bg-surface rounded-xl animate-pulse border border-border-strong"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Drafts Card */}
          <Link href="/dashboard/surveys/drafts" className="group block bg-surface border border-border-strong rounded-xl p-6 hover:border-[#093C22] hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-[#093C22] focus:ring-offset-2">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#093C22]/10 flex items-center justify-center text-[#093C22]">
                <FileEdit size={20} />
              </div>
              <span className="text-3xl font-bold text-primary">{draftCount}</span>
            </div>
            <h2 className="text-lg font-bold text-primary mb-1">Drafts</h2>
            <p className="text-sm text-muted mb-6">Surveys you&apos;re still working on.</p>
            <div className="flex items-center text-sm font-medium text-[#093C22] group-hover:underline">
              Continue <ArrowRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Submitted Card */}
          <Link href="/dashboard/surveys/submitted" className="group block bg-surface border border-border-strong rounded-xl p-6 hover:border-[#093C22] hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-[#093C22] focus:ring-offset-2">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#093C22]/10 flex items-center justify-center text-[#093C22]">
                <CheckSquare size={20} />
              </div>
              <span className="text-3xl font-bold text-primary">{submittedCount}</span>
            </div>
            <h2 className="text-lg font-bold text-primary mb-1">Submitted</h2>
            <p className="text-sm text-muted mb-6">Surveys you&apos;ve sent for review.</p>
            <div className="flex items-center text-sm font-medium text-[#093C22] group-hover:underline">
              View <ArrowRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Need Attention Card */}
          <Link href="/dashboard/sync" className="group block bg-surface border border-border-strong rounded-xl p-6 hover:border-amber-500 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <AlertCircle size={20} />
              </div>
              <span className="text-3xl font-bold text-primary">{needAttentionCount}</span>
            </div>
            <h2 className="text-lg font-bold text-primary mb-1">Need Attention</h2>
            <p className="text-sm text-muted mb-6">Work that needs your attention.</p>
            <div className="flex items-center text-sm font-medium text-amber-700 group-hover:underline">
              Review <ArrowRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

        </div>
      )}
    </div>
  );
}
