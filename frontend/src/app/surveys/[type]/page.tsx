"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import DashboardLayout from '@/app/dashboard/layout';
import Link from 'next/link';
import { Plus, ArrowLeft, Home, Building, Heart, Book, FileText, Clock, CheckCircle, Trash2, LucideIcon } from 'lucide-react';
import { LocalSurvey } from '@/lib/db';


const SURVEY_CONFIG: Record<string, { name: string, actionLabel: string, icon: LucideIcon, colorClass: string, submitColor: string }> = {
  'household': { name: 'Household Survey', actionLabel: 'Household', icon: Home, colorClass: 'bg-emerald-50 text-emerald-600', submitColor: 'bg-emerald-100 text-emerald-700' },
  'education': { name: 'Education Survey', actionLabel: 'Education', icon: Book, colorClass: 'bg-blue-50 text-blue-600', submitColor: 'bg-blue-100 text-blue-700' },
  'health': { name: 'Health Survey', actionLabel: 'Health', icon: Heart, colorClass: 'bg-red-50 text-red-600', submitColor: 'bg-red-100 text-red-700' },
  'governance': { name: 'Governance & Infrastructure Survey', actionLabel: 'Governance & Infrastructure', icon: Building, colorClass: 'bg-purple-50 text-purple-600', submitColor: 'bg-purple-100 text-purple-700' }
};

export default function SurveyWorkspace() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const typeStr = params.type as string;
  const config = SURVEY_CONFIG[typeStr.toLowerCase()] || SURVEY_CONFIG['household'];
  const surveyName = config.name;
  const SurveyIcon = config.icon;
  
  const [records, setRecords] = useState<LocalSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      const { syncEngine } = await import('@/lib/sync');
      await syncEngine.queueOperation('DELETE', id, null, token || '');
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error("Failed to delete draft:", err);
    } finally {
      setConfirmDeleteId(null);
    }
  };

  useEffect(() => {
    if (!token || user?.role !== 'student') {
      router.push('/login');
      return;
    }
    
    const loadRecords = async () => {
      try {
        const { db } = await import('@/lib/db');
        const localSurveys = await db.surveys.where('student_id').equals(user.id as number).toArray();
        const typeLocal = localSurveys.filter(s => s.survey_type.toLowerCase() === typeStr.toLowerCase() && s.status !== 'DELETED');

        let serverRecords: LocalSurvey[] = [];
        if (navigator.onLine) {
          try {
            const res = await api.get(`/api/student/surveys/${typeStr}`, { headers: { Authorization: `Bearer ${token}` } });
            serverRecords = res.data as LocalSurvey[];
          } catch(e) {
            console.warn("Could not fetch server records", e);
          }
        }
        
        // Merge records (local takes precedence if ID matches)
        const mergedMap = new Map<string, LocalSurvey>();
        for (const sr of serverRecords) {
          mergedMap.set(sr.id, sr);
        }
        for (const lr of typeLocal) {
          mergedMap.set(lr.id, lr); // overwrites server if local exists
        }
        
        const merged = Array.from(mergedMap.values()).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        setRecords(merged);
      } catch (e) {
        console.error("Failed to load records", e);
      } finally {
        setLoading(false);
      }
    };
    
    loadRecords();
  }, [user, token, router, typeStr]);

  const handleCreate = async () => {
    if (creating || !user) return;
    setCreating(true);
    try {
      // Always create local draft first for offline-first architecture
      const { db } = await import('@/lib/db');
      const pseudoId = crypto.randomUUID();
      const now = new Date().toISOString();
      await db.surveys.put({
        id: pseudoId,
        student_id: user.id as number,
        survey_type: typeStr.toUpperCase(),
        community_id: user.community_id as number,
        entity_id: null,
        answers: [],
        status: 'DRAFT',
        sync_status: 'pending',
        created_at: now,
        updated_at: now
      });
      
      // Let sync engine handle the upload later, immediately go to form
      router.push(`/surveys/${typeStr}/fill?id=${pseudoId}`);
    } catch (e) {
      console.error("Failed to create survey locally", e);
      alert("Failed to create survey. Please try again.");
      setCreating(false);
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        
        <div className="flex items-center gap-4">
          <Link href="/surveys" className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors shrink-0">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{surveyName}</h1>
            <p className="text-gray-500 mt-0.5">Community: <strong className="text-gray-700">{user.community}</strong></p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-900">Existing Records</h2>
            <button 
              onClick={handleCreate}
              disabled={creating}
              className="px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed shrink-0"
            >
              {creating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Plus size={18} /> Add New {config.actionLabel} Survey
                </>
              )}
            </button>
          </div>
          
          <div className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Loading records...</div>
            ) : records.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 mb-4">
                  <FileText size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">No Records Yet</h3>
                <p className="text-gray-500">Click the button above to start your first survey in {user.community}.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {records.map(record => (
                  <div key={record.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${record.status === 'SUBMITTED' ? config.colorClass : 'bg-amber-50 text-amber-600'}`}>
                        <SurveyIcon size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{record.entity_id || <span className="text-gray-400 italic">Pending Sync</span>}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${record.status === 'SUBMITTED' ? config.submitColor : 'bg-amber-100 text-amber-700'}`}>
                            {record.status === 'SUBMITTED' ? <CheckCircle size={12} /> : <Clock size={12} />}
                            {record.status}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">
                            {new Date(record.updated_at).toLocaleDateString()} {new Date(record.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {record.status === 'DRAFT' && (
                        <button
                          onClick={() => setConfirmDeleteId(record.id)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete draft"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      <Link 
                        href={`/surveys/${typeStr}/${record.status === 'SUBMITTED' ? 'view' : 'fill'}?id=${record.id}`}
                        className={`px-4 py-2 font-medium rounded-lg transition-colors text-sm text-center ${
                          record.status === 'SUBMITTED' 
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100'
                        }`}
                      >
                        {record.status === 'SUBMITTED' ? 'View Details' : 'Continue Draft'}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Delete this draft?</h2>
            <p className="text-sm text-gray-600 mb-6">
              This draft will be removed from your workspace. If it has already synchronized, the deletion will be queued and applied to the server when you&apos;re back online.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}


