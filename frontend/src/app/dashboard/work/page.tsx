"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { db, LocalSurvey } from '@/lib/db';
import { syncEngine } from '@/lib/sync';
import { getEntityLabel } from '@/lib/entityLabel';
import Link from 'next/link';
import { ArrowRight, Clock, Trash2, AlertCircle, FileEdit, RefreshCw, CheckSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function WorkWorkspacePage() {
  const { user, token } = useAuthStore();
  
  const [drafts, setDrafts] = useState<(LocalSurvey & { progress?: number })[]>([]);
  const [submitted, setSubmitted] = useState<(LocalSurvey & { progress?: number })[]>([]);
  const [needAttention, setNeedAttention] = useState<(LocalSurvey & { progress?: number })[]>([]);
  
  const [loading, setLoading] = useState(true);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await syncEngine.queueOperation('DELETE', 'SURVEY', id, null, token || '');
      setDrafts(drafts.filter(r => r.id !== id));
    } catch (err) {
      console.error("Failed to delete draft:", err);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };


  useEffect(() => {
    if (!token || !user) return;
    let isMounted = true;
    
    const loadWorkspaceData = async () => {
      setLoading(true);
      try {
        // 1. Get local data
        const localSurveys = await db.surveys.where('student_id').equals(user.id as number).toArray();
        
        // Categorize local
        const localDrafts = localSurveys.filter(s => s.status === 'DRAFT').sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        const localPending = localSurveys.filter(s => s.status !== 'DELETED' && (s.sync_status === 'pending' || s.sync_status === 'failed' || (s.status === 'SUBMITTED' && s.sync_status !== 'synced')));
        const localSubmitted = localSurveys.filter(s => s.status === 'SUBMITTED').sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        
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
        allSubmitted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());



        if (isMounted) {
           setDrafts(localDrafts.slice(0, 5));
           setSubmitted(allSubmitted.slice(0, 5));
           setNeedAttention(localPending);
           
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
      <div>
        <h1 className="text-2xl font-bold text-primary">Work</h1>
        <p className="text-sm text-muted mt-1">Your active fieldwork workspace.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="animate-spin text-muted" size={24} /></div>
      ) : (
        <div className="space-y-8">
          
          {/* Need Attention */}
          {needAttention.length > 0 && (
             <section>
               <div className="flex items-center justify-between mb-3">
                 <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                   <AlertCircle size={16} className="text-amber-600" />
                   Need Attention ({needAttention.length})
                 </h2>
               </div>
               <div className="bg-surface border border-amber-200 rounded-xl overflow-hidden shadow-sm divide-y divide-border">
                 {needAttention.map(record => (
                   <div key={record.id} className="p-4 sm:p-5 hover:bg-amber-50/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                     <div>
                       <div className="flex items-center gap-2 mb-1">
                         <span className="font-bold text-primary capitalize text-sm">{record.survey_type.toLowerCase()} Survey</span>
                         <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded uppercase tracking-wide">Pending Sync</span>
                       </div>
                       <p className="text-sm text-secondary">{getEntityLabel(record.survey_type)}: <span className="font-mono">{record.entity_id}</span></p>
                     </div>
                     <Link href="/dashboard/sync" className="shrink-0 text-sm font-medium text-amber-700 bg-amber-50 px-4 py-2 rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-2">
                       Review in Sync <ArrowRight size={16} />
                     </Link>
                   </div>
                 ))}
               </div>
             </section>
          )}

          {/* Continue Work */}
          <section>
             <div className="flex items-center justify-between mb-3">
               <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                 <FileEdit size={16} className="text-[#093C22]" />
                 Continue Work
               </h2>
               <Link href="/dashboard/surveys/drafts" className="text-sm font-medium text-[#093C22] hover:underline">
                 View all drafts
               </Link>
             </div>
             
             {drafts.length === 0 ? (
                <div className="bg-surface border border-border-strong rounded-xl p-8 text-center shadow-sm">
                  <p className="text-sm text-muted">No active drafts. You are caught up.</p>
                </div>
             ) : (
                <div className="bg-surface border border-border-strong rounded-xl overflow-hidden shadow-sm divide-y divide-border">
                  {drafts.map(record => (
                    <div key={record.id} className="p-4 sm:p-5 hover:bg-page transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <Link href={`/surveys/${record.survey_type.toLowerCase()}/fill?id=${record.id}`} className="flex-1 group">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-primary capitalize text-sm">{record.survey_type.toLowerCase()} Survey</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-page text-secondary rounded uppercase tracking-wide">Draft</span>
                          </div>
                          <p className="text-sm text-secondary mb-2">{getEntityLabel(record.survey_type)}: <span className="font-mono">{record.entity_id}</span></p>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-page rounded-full h-1.5">
                              <div className="bg-[#093C22] h-1.5 rounded-full" style={{ width: `${record.progress || 0}%` }}></div>
                            </div>
                            <span className="text-xs text-muted">{record.progress || 0}%</span>
                          </div>
                        </Link>
                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            onClick={() => setConfirmDeleteId(record.id)}
                            disabled={deletingId === record.id}
                            className="p-2 rounded-lg text-muted hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                            title="Delete draft"
                          >
                            {deletingId === record.id
                              ? <RefreshCw size={16} className="animate-spin" />
                              : <Trash2 size={16} />
                            }
                          </button>
                          <Link
                            href={`/surveys/${record.survey_type.toLowerCase()}/fill?id=${record.id}`}
                            className="text-sm font-medium text-[#093C22] flex items-center gap-1 hover:underline"
                          >
                            Continue <ArrowRight size={16} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
             )}
          </section>

          {/* Submitted Work */}
          <section>
             <div className="flex items-center justify-between mb-3">
               <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                 <CheckSquare size={16} className="text-[#093C22]" />
                 Submitted Work
               </h2>
               <Link href="/dashboard/surveys/submitted" className="text-sm font-medium text-[#093C22] hover:underline">
                 View all submitted
               </Link>
             </div>
             
             {submitted.length === 0 ? (
                <div className="bg-surface border border-border-strong rounded-xl p-8 text-center shadow-sm">
                  <p className="text-sm text-muted">No submitted surveys.</p>
                </div>
             ) : (
                <div className="bg-surface border border-border-strong rounded-xl overflow-hidden shadow-sm divide-y divide-border">
                  {submitted.map(record => (
                    <Link 
                      key={record.id} 
                      href={`/surveys/${record.survey_type.toLowerCase()}/view?id=${record.id}`}
                      className="block p-4 sm:p-5 hover:bg-page transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                         <div>
                           <div className="flex items-center gap-2 mb-1">
                             <span className="font-bold text-primary capitalize text-sm">{record.survey_type.toLowerCase()} Survey</span>
                             <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide bg-emerald-50 text-emerald-700">
                               SUBMITTED
                             </span>
                           </div>
                           <p className="text-xs text-muted">
                             Submitted {record.updated_at ? formatDistanceToNow(new Date(record.updated_at), { addSuffix: true }) : 'recently'}
                           </p>
                         </div>
                         <ArrowRight size={16} className="text-gray-300 group-hover:text-secondary transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
             )}
          </section>

          

        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h2 className="text-lg font-bold text-primary mb-2">Delete this draft?</h2>
            <p className="text-sm text-muted mb-6">
              This draft will be removed from your workspace. If it has already synchronized, the deletion will be queued and applied to the server when you&apos;re back online.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-secondary hover:bg-page transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={!!deletingId}
                className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
