"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Search, Filter, Loader2, ArrowRight } from 'lucide-react';

export default function SubmittedPage() {
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
    if (!token) return;
    setLoading(true);
    try {
      const currentSkip = reset ? 0 : skip;
      
      // Load local submitted
      const { db } = await import('@/lib/db');
      const allLocal = await db.surveys.where('status').equals('SUBMITTED').toArray();
      // Simple local filtering
      let localSubmitted = allLocal;
      if (search) localSubmitted = localSubmitted.filter(d => d.house_number?.toLowerCase().includes(search.toLowerCase()));
      if (typeFilter) localSubmitted = localSubmitted.filter(d => d.survey_type.toLowerCase() === typeFilter.toLowerCase());

      let serverItems = [];
      let serverTotal = 0;
      
      if (navigator.onLine) {
        try {
          const res = await api.get('/api/student/surveys/submitted', { 
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
        
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Submitted Surveys</h1>
          <p className="text-gray-500 mt-1">These surveys have been finalized for <strong className="text-gray-700">{user.community}</strong> and cannot be edited.</p>
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
              <p className="text-gray-500 font-medium">No submitted surveys.</p>
            </div>
          ) : (
            records.map(record => (
              <div key={record.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col hover:border-emerald-200 transition-colors">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 capitalize">{record.survey_type.toLowerCase()} Survey</h3>
                  <span className="text-xs font-semibold px-2 py-1 bg-emerald-100 text-emerald-800 rounded">SUBMITTED</span>
                </div>
                
                <div className="p-5 space-y-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">House Number:</div>
                    <div className="font-mono text-gray-900 font-medium bg-gray-50 inline-block px-2 py-1 rounded border border-gray-100">{record.house_number}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Submitted:</div>
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(record.submitted_at || record.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50">
                  <Link 
                    href={`/surveys/${record.survey_type.toLowerCase()}/view/${record.id}`}
                    className="w-full py-2 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                  >
                    View Survey <ArrowRight size={16} />
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
              onClick={() => loadSubmitted(false)}
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
