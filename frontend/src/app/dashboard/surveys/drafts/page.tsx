"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Search, Filter, Loader2, ArrowRight } from 'lucide-react';

export default function DraftsPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
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
      const allLocal = await db.surveys.where('status').equals('DRAFT').toArray();
      // Simple local filtering
      let localDrafts = allLocal;
      if (search) localDrafts = localDrafts.filter(d => d.house_number?.toLowerCase().includes(search.toLowerCase()));
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
    loadDrafts(true);
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
      loadDrafts(true);
    }
  }, [typeFilter]);

  if (!user) return null;

  return (
    <>
      <div className="space-y-6 max-w-3xl mx-auto pb-12">
        
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Draft Surveys</h1>
          <p className="text-gray-500 mt-1">Pick up where you left off. Only you can see and edit your drafts.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Search house number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-gray-900"
            />
          </form>
          
          <div className="relative shrink-0 w-full sm:w-48">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select
              value={typeFilter}
              onChange={handleTypeChange}
              className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm appearance-none bg-white text-gray-900"
            >
              <option value="">All Types</option>
              <option value="HOUSEHOLD">Household</option>
              <option value="EDUCATION">Education</option>
              <option value="HEALTH">Health</option>
              <option value="GOVERNANCE">Governance</option>
            </select>
          </div>
        </div>

        {/* List Layout */}
        <div className="space-y-4">
          {records.length === 0 && !loading ? (
            <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
              <p className="text-gray-500 font-medium">No saved draft surveys.</p>
            </div>
          ) : (
            records.map(record => (
              <div key={record.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col hover:border-emerald-200 transition-colors">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 capitalize">{record.survey_type.toLowerCase()} Survey</h3>
                  <span className="text-xs font-semibold px-2 py-1 bg-amber-100 text-amber-800 rounded">DRAFT</span>
                </div>
                
                <div className="p-5 space-y-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">House Number:</div>
                    <div className="font-mono text-gray-900 font-medium bg-gray-50 inline-block px-2 py-1 rounded border border-gray-100">{record.house_number}</div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Progress:</span>
                      <span className="font-medium text-gray-900">{record.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${record.progress}%` }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Last Updated:</div>
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(record.updated_at).toLocaleDateString()} at {new Date(record.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50">
                  <Link 
                    href={`/surveys/${record.survey_type.toLowerCase()}/fill/${record.id}`}
                    className="w-full py-2 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                  >
                    Continue Survey <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            ))
          )}
          
          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin text-emerald-600" size={24} />
            </div>
          )}
          
          {records.length > 0 && records.length < total && (
            <button 
              onClick={() => loadDrafts(false)}
              disabled={loading}
              className="w-full py-3 bg-white border border-gray-200 rounded-lg font-medium text-gray-600 hover:bg-gray-50 transition-colors mt-4"
            >
              Load More
            </button>
          )}
        </div>

      </div>
    </>
  );
}
