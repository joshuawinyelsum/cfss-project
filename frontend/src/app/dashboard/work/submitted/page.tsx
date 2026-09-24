"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { db } from '@/lib/db';
import { getEntityLabel } from '@/lib/entityLabel';
import Link from 'next/link';
import { Search, Filter, Loader2, ArrowRight, Cloud, RefreshCw } from 'lucide-react';

export default function SubmittedSurveysPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [skip, setSkip] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const loadSubmitted = async (reset = false) => {
    if (!user) return;
    setLoading(true);
    try {
      const currentSkip = reset ? 0 : skip;
      
      // Load local submitted
      const { db } = await import('@/lib/db');
      const userSurveys = await db.surveys.where('student_id').equals(user?.id as number).toArray();
      const allLocal = userSurveys.filter(s => s.status === 'SUBMITTED');
      let localSubmitted = allLocal;
      if (search) localSubmitted = localSubmitted.filter(d => d.entity_id?.toLowerCase().includes(search.toLowerCase()));
      if (typeFilter) localSubmitted = localSubmitted.filter(d => d.survey_type.toLowerCase() === typeFilter.toLowerCase());

      let serverItems = [];
      let serverTotal = 0;
      
      if (navigator.onLine) {
        try {
          const res = await api.get('/api/student/surveys/submitted/all', { 
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
          console.warn("Could not fetch server submitted, showing local only");
        }
      }
      
      // Merge local and server items, prioritizing local if ID matches
      const mergedMap = new Map();
      serverItems.forEach((item: any) => mergedMap.set(item.id, item));
      localSubmitted.forEach((item: any) => mergedMap.set(item.id, {
         ...item,
         isLocal: true // flag for UI to know it's local
      }));
      
      const mergedArray = Array.from(mergedMap.values()).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      if (reset) {
        setRecords(mergedArray);
      } else {
        setRecords(prev => [...prev, ...mergedArray]);
      }
      setTotal(Math.max(serverTotal, mergedArray.length));
      setSkip(currentSkip + limit);
    } catch (e) {
      console.error("Failed to load submitted", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || user?.role !== 'student') {
      router.push('/login');
      return;
    }
    loadSubmitted(true);
  }, [user, token, router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadSubmitted(true);
  };
  
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value);
  };

  useEffect(() => {
    if (token) {
      loadSubmitted(true);
    }
  }, [typeFilter]);

  if (!user) return null;

  return (
    <>
      <div className="space-y-6 max-w-3xl mx-auto pb-12">
        <div className="mb-4">
          <Link href="/dashboard/work" className="inline-flex items-center text-sm font-medium text-muted hover:text-primary transition-colors">
            &larr; Back to Work overview
          </Link>
        </div>
        
        <div>
          <h1 className="text-2xl font-bold text-primary">Submitted Surveys</h1>
          <p className="text-muted mt-1">These surveys have been finalized for <strong className="text-secondary">{user.community}</strong> and cannot be edited.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input 
              type="text"
              placeholder="Search house number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-primary"
            />
          </form>
          
          <div className="relative shrink-0 w-full sm:w-48">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <select
              value={typeFilter}
              onChange={handleTypeChange}
              className="w-full pl-10 pr-8 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm appearance-none bg-surface text-primary"
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
        <div className="bg-surface rounded-xl border border-border-strong overflow-hidden shadow-sm">
          {records.length === 0 && !loading ? (
            <div className="py-12 text-center bg-page">
              <p className="text-muted mb-2">No submitted surveys found.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {records.map(record => (
                <Link 
                  key={record.id}
                  href={`/surveys/${record.survey_type.toLowerCase()}/view?id=${record.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 hover:bg-page transition-colors group cursor-pointer gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-primary capitalize text-base">{record.survey_type.toLowerCase()} Survey</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded uppercase tracking-wide border border-emerald-100">Submitted</span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted">
                      <div>
                        <span className="font-medium text-primary">{getEntityLabel(record.survey_type)}: </span>
                        <span className="font-mono text-secondary">{record.entity_id}</span>
                      </div>
                      <span className="hidden sm:inline text-gray-300">•</span>
                      <div className="hidden sm:block">
                        Submitted: {new Date(record.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="shrink-0 flex flex-col sm:items-end gap-1">
                    <div className="flex items-center gap-2">
                      {record.sync_status === 'synced' ? (
                         <span className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                           <Cloud size={14} /> Synced
                         </span>
                      ) : (
                         <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded">
                           <RefreshCw size={14} /> Pending Sync
                         </span>
                      )}
                    </div>
                    <div className="text-sm font-medium text-muted group-hover:text-[#093C22] flex items-center gap-1">
                      View <ArrowRight size={16} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin text-emerald-600" size={24} />
            </div>
          )}
          
          {records.length > 0 && records.length < total && (
            <button 
              onClick={() => loadSubmitted(false)}
              disabled={loading}
              className="w-full py-3 bg-surface border border-border-strong rounded-lg font-medium text-secondary hover:bg-page transition-colors mt-4"
            >
              Load More
            </button>
          )}
      </div>
    </>
  );
}
