"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { db } from '@/lib/db';
import { syncEngine } from '@/lib/sync';
import { getEntityLabel } from '@/lib/entityLabel';
import Link from 'next/link';
import { Search, Filter, Loader2, ArrowRight, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function DraftsPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await syncEngine.queueOperation('DELETE', 'SURVEY', id, null, token || '');
      setRecords(records.filter(r => r.id !== id));
      setTotal(total - 1);
    } catch (err) {
      console.error("Failed to delete draft:", err);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [skip, setSkip] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const loadDrafts = async (reset = false) => {
    if (!token) return;
    setLoading(true);
    try {
      const currentSkip = reset ? 0 : skip;
      
      // Load local drafts
      const { db } = await import('@/lib/db');
      const userSurveys = await db.surveys.where('student_id').equals(user?.id as number).toArray();
      const allLocal = userSurveys.filter(s => s.status === 'DRAFT');
      let localDrafts = allLocal;
      if (search) localDrafts = localDrafts.filter(d => d.entity_id?.toLowerCase().includes(search.toLowerCase()));
      if (typeFilter) localDrafts = localDrafts.filter(d => d.survey_type.toLowerCase() === typeFilter.toLowerCase());

      let serverItems = [];
      let serverTotal = 0;
      
      if (navigator.onLine) {
        try {
          const res = await api.get('/api/student/surveys/drafts/all', { 
            headers: { Authorization: `Bearer ${token}` },
            params: {
              skip: currentSkip,
              limit,
              search: search || undefined,
              survey_type: typeFilter || undefined
            }
          });
          serverItems = res.data.items;
          serverTotal = res.data.total;
        } catch (e) {
          console.warn("Could not fetch server drafts, showing local only");
        }
      }
      
      // Merge local and server items, prioritizing local if ID matches
      const mergedMap = new Map();
      serverItems.forEach((item: any) => mergedMap.set(item.id, item));
      localDrafts.forEach((item: any) => {
         const serverItem = mergedMap.get(item.id);
         let progress = serverItem?.progress || 0;
         
         // Basic estimation for purely local new drafts if they have answers
         if (!serverItem && item.answers && item.answers.length > 0) {
            // we assume ~10 questions per survey as a rough estimate for progress UI
            progress = Math.min(Math.round((item.answers.length / 10) * 100), 100);
         }

         mergedMap.set(item.id, {
           ...serverItem,
           ...item,
           progress,
           isLocal: true // flag for UI to know it's local
         });
      });

      // Critical: remove any server draft that is already SUBMITTED locally.
      // This handles the race condition where the server still has status=DRAFT
      // but the student already submitted it locally (sync pending).
      const localSubmittedIds = new Set(userSurveys.filter(s => s.status === 'SUBMITTED').map(s => s.id));
      for (const id of localSubmittedIds) {
        if (mergedMap.has(id)) {
          mergedMap.delete(id);
        }
      }
      
      const mergedArray = Array.from(mergedMap.values()).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      if (reset) {
        setRecords(mergedArray);
      } else {
        setRecords(prev => [...prev, ...mergedArray]);
      }
      setTotal(Math.max(serverTotal, mergedArray.length));
      setSkip(currentSkip + limit);

    } catch (e) {
      console.error("Failed to load drafts", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || user?.role !== 'student') {
      router.push('/login');
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDrafts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token, router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadDrafts(true);
  };
  
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value);
  };

  // When type filter changes, we want to trigger reload
  useEffect(() => {
    if (token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadDrafts(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter]);

  if (!user) return null;

  return (
    <>
      <div className="space-y-6 max-w-3xl mx-auto pb-12">
        
        <div>
          <h2 className="text-xl font-bold text-primary">Draft Surveys</h2>
          <p className="text-muted mt-1">Pick up where you left off. Only you can see and edit your drafts.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <Input 
              type="text"
              placeholder="Search house number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </form>
          
          <div className="relative shrink-0 w-full sm:w-48">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <select
              value={typeFilter}
              onChange={handleTypeChange}
              className="w-full pl-10 pr-8 py-2 border border-border rounded-lg focus:ring-1 focus:ring-cfss-green focus:border-cfss-green text-sm appearance-none bg-surface text-primary outline-none"
            >
              <option value="">All Types</option>
              <option value="HOUSEHOLD">Household</option>
              <option value="EDUCATION">Education</option>
              <option value="HEALTH">Health</option>
              <option value="GOVERNANCE">Governance</option>
            </select>
          </div>
        </div>

        {/* Flat List UI */}
        <Card className="overflow-hidden">
          {records.length === 0 && !loading ? (
            <div className="py-12 text-center bg-page">
              <p className="text-muted mb-2">No drafts found.</p>
              <Link href="/surveys" className="text-cfss-green hover:underline text-sm font-medium">Start a new survey</Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {records.map(record => (
                <div
                  key={record.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 hover:bg-page transition-colors gap-4"
                >
                  <Link
                    href={`/surveys/${record.survey_type.toLowerCase()}/fill?id=${record.id}`}
                    className="flex-1 group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-primary capitalize text-base">{record.survey_type.toLowerCase()} Survey</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-status-warning/10 text-status-warning rounded-full uppercase tracking-wide border border-status-warning/20">Draft</span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted">
                      <div>
                        <span className="font-medium text-primary">{getEntityLabel(record.survey_type)}: </span>
                        <span className="font-mono text-secondary">{record.entity_id}</span>
                      </div>
                      <span className="hidden sm:inline opacity-50">•</span>
                      <div className="hidden sm:block">
                        Updated: {new Date(record.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center gap-3">
                      <div className="w-full sm:w-48 bg-page rounded-full h-1.5 overflow-hidden">
                        <div className="bg-cfss-green h-1.5 rounded-full transition-all" style={{ width: `${record.progress}%` }}></div>
                      </div>
                      <span className="text-xs font-medium text-secondary">{record.progress}%</span>
                    </div>
                  </Link>
                  
                  <div className="shrink-0 flex items-center gap-2 sm:justify-end">
                    <button
                      onClick={() => setConfirmDeleteId(record.id)}
                      disabled={deletingId === record.id}
                      className="p-2 rounded-lg text-muted hover:text-status-error hover:bg-status-error/10 transition-colors disabled:opacity-50"
                      title="Delete draft"
                    >
                      {deletingId === record.id
                        ? <Loader2 size={16} className="animate-spin" />
                        : <Trash2 size={16} />
                      }
                    </button>
                    <Link
                      href={`/surveys/${record.survey_type.toLowerCase()}/fill?id=${record.id}`}
                      className="text-sm font-medium text-cfss-green flex items-center gap-1 hover:underline"
                    >
                      Continue <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin text-cfss-green" size={24} />
            </div>
          )}
          
          {records.length > 0 && records.length < total && (
            <Button 
              variant="outline"
              onClick={() => loadDrafts(false)}
              disabled={loading}
              className="w-full mt-4"
            >
              Load More
            </Button>
          )}
      </div>

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-sm p-6 border-0">
            <h2 className="text-lg font-bold text-primary mb-2">Delete this draft?</h2>
            <p className="text-sm text-muted mb-6">
              This draft will be removed from your workspace. If it has already synchronized, the deletion will be queued and applied to the server when you're back online.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={!!deletingId}
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
