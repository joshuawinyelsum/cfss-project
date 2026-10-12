"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { db, LocalSurvey } from '@/lib/db';
import Link from 'next/link';
import { FileEdit, CheckSquare, AlertCircle, ArrowRight } from 'lucide-react';

export default function WorkWorkspacePage() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  
  const [draftCount, setDraftCount] = useState<number>(0);
  const [submittedCount, setSubmittedCount] = useState<number>(0);
  const [needAttentionCount, setNeedAttentionCount] = useState<number>(0);

  useEffect(() => {
    if (!token || !user?.id) return;
    let active = true;
    
    const loadWorkspaceData = async () => {
      try {
        // 1. Get local data
        const localSurveys = await db.surveys.where('student_id').equals(user.id as number).toArray();
        
        // Categorize local
        const localDrafts = localSurveys.filter(s => s.status === 'DRAFT');
        const localPending = localSurveys.filter(s => s.sync_status === 'failed');
        const localSubmitted = localSurveys.filter(s => s.status === 'SUBMITTED');
        
        // 2. Try fetching server data for recent submitted records
        let serverRecent: LocalSurvey[] = [];
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          try {
             const res = await api.get('/api/student/surveys/dashboard/stats', { 
               headers: { Authorization: `Bearer ${token}` }
             });
             if (res.data?.recent_surveys) {
                serverRecent = res.data.recent_surveys as LocalSurvey[];
             }
          } catch (e) {
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

        if (active) {
           setDraftCount(localDrafts.length);
           setSubmittedCount(allSubmitted.length);
           setNeedAttentionCount(localPending.length);
        }
      } catch (e) {
        console.error("Workspace load error:", e);
      }
    };
    
    loadWorkspaceData();
    
    return () => { 
      active = false; 
    };
  }, [user?.id, token]);

  if (!user) return null;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Drafts Card */}
          <Link href="/dashboard/work/drafts" className="group block bg-surface border border-border-strong rounded-xl p-6 hover:border-cfss-green hover:shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-cfss-green/20">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-cfss-green-soft flex items-center justify-center text-cfss-green">
                <FileEdit size={20} />
              </div>
              <span className="text-3xl font-bold text-primary">{draftCount}</span>
            </div>
            <h2 className="text-base font-semibold text-primary mb-1">In-Progress Drafts</h2>
            <p className="text-xs text-secondary mb-6">Surveys you are currently collecting in the field.</p>
            <div className="flex items-center text-xs font-semibold text-cfss-green group-hover:underline">
              Continue Drafts <ArrowRight size={14} className="ml-1 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Submitted Card */}
          <Link href="/dashboard/work/submitted" className="group block bg-surface border border-border-strong rounded-xl p-6 hover:border-cfss-green hover:shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-cfss-green/20">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-cfss-green-soft flex items-center justify-center text-cfss-green">
                <CheckSquare size={20} />
              </div>
              <span className="text-3xl font-bold text-primary">{submittedCount}</span>
            </div>
            <h2 className="text-base font-semibold text-primary mb-1">Submitted Records</h2>
            <p className="text-xs text-secondary mb-6">Completed surveys uploaded or staged for university review.</p>
            <div className="flex items-center text-xs font-semibold text-cfss-green group-hover:underline">
              View Submitted <ArrowRight size={14} className="ml-1 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Need Attention Card */}
          <Link href="/dashboard/work/attention" className="group block bg-surface border border-border-strong rounded-xl p-6 hover:border-amber-500/50 hover:shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/20">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <AlertCircle size={20} />
              </div>
              <span className="text-3xl font-bold text-primary">{needAttentionCount}</span>
            </div>
            <h2 className="text-base font-semibold text-primary mb-1">Sync & Activity Diagnostics</h2>
            <p className="text-xs text-secondary mb-6">Offline queue items requiring synchronization or review.</p>
            <div className="flex items-center text-xs font-semibold text-amber-600 dark:text-amber-400 group-hover:underline">
              Review Queue <ArrowRight size={14} className="ml-1 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

        </div>
    </div>
  );
}
