"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import DashboardLayout from '@/app/dashboard/layout';
import Link from 'next/link';
import { Plus, ArrowLeft, Home, FileText, Clock, CheckCircle } from 'lucide-react';

const SURVEY_NAMES: Record<string, string> = {
  'household': 'Household Survey',
  'education': 'Education Survey',
  'health': 'Health Survey',
  'governance': 'Governance & Infrastructure Survey'
};

export default function SurveyWorkspace() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const typeStr = params.type as string;
  const surveyName = SURVEY_NAMES[typeStr] || 'Survey';
  
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!token || user?.role !== 'student') {
      router.push('/login');
      return;
    }
    
    const loadRecords = async () => {
      try {
        const res = await api.get(`/api/student/surveys/${typeStr}`, { headers: { Authorization: `Bearer ${token}` } });
        setRecords(res.data);
      } catch (e) {
        console.error("Failed to load records", e);
      } finally {
        setLoading(false);
      }
    };
    
    loadRecords();
  }, [user, token, router, typeStr]);

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const res = await api.post('/api/student/surveys/create', { survey_type: typeStr }, { headers: { Authorization: `Bearer ${token}` } });
      const newRecord = res.data;
      router.push(`/surveys/${typeStr}/fill/${newRecord.id}`);
    } catch (e) {
      console.error("Failed to create survey", e);
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
                  <Plus size={18} /> Add New House Survey
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
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${record.status === 'SUBMITTED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        <Home size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{record.house_number}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${record.status === 'SUBMITTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
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
                    
                    <Link 
                      href={`/surveys/${typeStr}/${record.status === 'SUBMITTED' ? 'view' : 'fill'}/${record.id}`}
                      className={`px-4 py-2 font-medium rounded-lg transition-colors text-sm text-center ${
                        record.status === 'SUBMITTED' 
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100'
                      }`}
                    >
                      {record.status === 'SUBMITTED' ? 'View Details' : 'Continue Draft'}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
