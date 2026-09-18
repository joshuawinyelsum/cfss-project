"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { db } from '@/lib/db';
import { getEntityLabel } from '@/lib/entityLabel';
import Link from '@/components/SpaLink';
import { ArrowRight, Clock, Trash2, AlertCircle, FileEdit, RefreshCw, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function WorkWorkspacePage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  
  const [drafts, setDrafts] = useState<any[]>([]);
  const [needAttention, setNeedAttention] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Delete draft? This action cannot be undone.")) {
      try {
        await db.surveys.delete(id);
        setDrafts(drafts.filter(r => r.id !== id));
      } catch (err) {
        console.error("Failed to delete draft:", err);
      }
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
        const localPending = localSurveys.filter(s => s.sync_status === 'pending' || s.sync_status === 'failed' || s.status === 'SUBMITTED' && s.sync_status !== 'synced');
        
        // 2. Try fetching server data for recent submitted records
        let serverRecent = [];
        if (navigator.onLine) {
          try {
             const res = await api.get('/api/student/surveys/dashboard/stats', { 
               headers: { Authorization: `Bearer ${token}` }
             });
             if (res.data?.recent_surveys) {
                serverRecent = res.data.recent_surveys;
             }
          } catch(e) {
             console.warn("Could not fetch server workspace stats", e);
          }
        }
        
        // Combine recent: local drafts + local pending + server recent
        const allRecent = [...localDrafts, ...localPending];
        serverRecent.forEach((sr: any) => {
           if (!allRecent.find(r => r.id === sr.id)) {
               allRecent.push(sr);
           }
        });
        allRecent.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

        if (isMounted) {
           setDrafts(localDrafts.slice(0, 5));
           setNeedAttention(localPending);
           setRecent(allRecent.slice(0, 10));
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
                    <Link key={record.id} href={`/surveys/${record.survey_type.toLowerCase()}/fill?id=${record.id}`} className="block p-4 sm:p-5 hover:bg-page transition-colors group">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
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
                        </div>
                        <div className="shrink-0 flex items-center text-sm font-medium text-[#093C22] group-hover:underline">
                          Continue <ArrowRight size={16} className="ml-1" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
             )}
          </section>

          {/* Recent Work */}
          <section>
             <div className="flex items-center justify-between mb-3">
               <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                 <Clock size={16} className="text-muted" />
                 Recent History
               </h2>
             </div>
             
             {recent.length === 0 ? (
                <div className="bg-surface border border-border-strong rounded-xl p-8 text-center shadow-sm">
                  <p className="text-sm text-muted">No recent activity.</p>
                </div>
             ) : (
                <div className="bg-surface border border-border-strong rounded-xl overflow-hidden shadow-sm divide-y divide-border">
                  {recent.slice(0, 5).map(record => (
                    <Link 
                      key={record.id} 
                      href={`/surveys/${record.survey_type.toLowerCase()}/${record.status === 'SUBMITTED' ? 'view' : 'fill'}/${record.id}`}
                      className="block p-4 sm:p-5 hover:bg-page transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                         <div>
                           <div className="flex items-center gap-2 mb-1">
                             <span className="font-bold text-primary capitalize text-sm">{record.survey_type.toLowerCase()} Survey</span>
                             <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${
                               record.status === 'SUBMITTED' ? 'bg-emerald-50 text-emerald-700' : 'bg-page text-secondary'
                             }`}>
                               {record.status}
                             </span>
                           </div>
                           <p className="text-xs text-muted">
                             Updated {record.updated_at ? formatDistanceToNow(new Date(record.updated_at), { addSuffix: true }) : 'recently'}
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
    </div>
  );
}
