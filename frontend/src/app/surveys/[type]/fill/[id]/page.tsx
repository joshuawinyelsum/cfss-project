"use client";

import { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import DashboardLayout from '@/app/dashboard/layout';
import Link from 'next/link';
import { ArrowLeft, Save, CheckCircle, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

import { syncEngine } from '@/lib/sync';

export default function QuestionnairePage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const typeStr = params.type as string;
  const recordId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [record, setRecord] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  useEffect(() => {
    if (!token || !user) return;
    
    const loadData = async () => {
      try {
        let recordData = null;
        let questionsData = [];
        let answersData = [];

        if (recordId === 'new') {
          // Start a new survey draft locally
          const qRes = await api.get('/api/student/surveys/questions', { params: { type: typeStr }, headers: { Authorization: `Bearer ${token}` } });
          questionsData = qRes.data;
          
          recordData = {
            id: crypto.randomUUID(), // New UUID for offline sync mapping
            survey_type: typeStr.toUpperCase(),
            community_id: user.community_id,
            house_number: null,
            status: 'DRAFT',
            sync_status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        } else {
          // Check IndexedDB first
          const { db } = await import('@/lib/db');
          const localRecord = await db.surveys.get(recordId);
          if (localRecord) {
            recordData = localRecord;
            const qRes = await api.get('/api/student/surveys/questions', { params: { type: typeStr }, headers: { Authorization: `Bearer ${token}` } });
            questionsData = qRes.data;
            answersData = localRecord.answers || [];
          } else {
            // Fallback to server if not found locally
            const res = await api.get(`/api/student/surveys/record/${recordId}`, { headers: { Authorization: `Bearer ${token}` } });
            recordData = res.data.record;
            questionsData = res.data.questions;
            answersData = res.data.answers || [];
          }
        }

        setRecord(recordData);
        setQuestions(questionsData);
        
        // Map answers
        const ansMap: Record<string, any> = {};
        answersData.forEach((a: any) => {
          ansMap[a.question_id] = a.answer;
        });
        setAnswers(ansMap);
      } catch (e: any) {
        setError(e.response?.data?.detail || "Failed to load survey. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [token, user, recordId, typeStr]);

  const sections = useMemo(() => {
    const secs: string[] = [];
    questions.forEach(q => {
      if (!secs.includes(q.section)) secs.push(q.section);
    });
    return secs;
  }, [questions]);
  
  const currentSection = sections[currentSectionIndex];
  const sectionQuestions = questions.filter(q => q.section === currentSection);
  
  // Progress calculation
  const progress = useMemo(() => {
    if (questions.length === 0) return 0;
    const answeredCount = questions.filter(q => {
      const val = answers[q.id];
      return val !== undefined && val !== null && val !== '';
    }).length;
    return Math.round((answeredCount / questions.length) * 100);
  }, [questions, answers]);
  
  const handleAnswerChange = (questionId: string, value: any) => {
    if (record?.status === 'SUBMITTED') return;
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const saveAnswers = async (isSubmit: boolean) => {
    if (record?.status === 'SUBMITTED' || !user || !record) return;
    setError('');
    
    const formattedAnswers = Object.keys(answers).map(qid => ({
      question_id: qid,
      answer: answers[qid]
    }));
    
    try {
      if (isSubmit) {
        setSubmitting(true);
      } else {
        setSaving(true);
      }

      await syncEngine.queueSurvey({
        id: record.id,
        survey_type: record.survey_type,
        community_id: user.community_id,
        house_number: record.house_number,
        answers: formattedAnswers,
        status: isSubmit ? 'SUBMITTED' : 'DRAFT',
        sync_status: 'pending',
        created_at: record.created_at,
        updated_at: new Date().toISOString(),
        submitted_at: isSubmit ? new Date().toISOString() : undefined
      }, token);

      if (isSubmit) {
        router.push('/dashboard/surveys/submitted');
      } else {
        router.push('/dashboard/surveys/drafts');
      }
    } catch (e: any) {
      setError(e.message || "An error occurred while saving locally.");
      setSaving(false);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center p-12 text-gray-500">Loading questionnaire...</div>
      </DashboardLayout>
    );
  }

  if (error && !record) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 max-w-3xl mx-auto flex items-center gap-3">
          <AlertCircle />
          <div className="font-medium">{error}</div>
        </div>
      </DashboardLayout>
    );
  }

  const isReadonly = record?.status === 'SUBMITTED';

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto pb-24">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={`/surveys/${typeStr}`} className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors shrink-0">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 capitalize">{typeStr.toLowerCase()} Survey</h1>
            <p className="text-gray-500 mt-0.5">House Number: <strong className="text-gray-900 bg-gray-100 px-2 py-0.5 rounded font-mono text-sm border border-gray-200">{record?.house_number}</strong></p>
          </div>
          
          {isReadonly && (
            <div className="ml-auto bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 border border-emerald-100">
              <CheckCircle size={16} /> Read Only
            </div>
          )}
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm font-medium flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Progress Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex justify-between text-sm font-medium mb-2">
            <span className="text-gray-500">Overall Progress</span>
            <span className={progress === 100 ? 'text-emerald-600' : 'text-gray-900'}>{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        {/* Sections Tabs */}
        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
          {sections.map((sec, idx) => (
            <button
              key={sec}
              onClick={() => setCurrentSectionIndex(idx)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border ${
                idx === currentSectionIndex 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>

        {/* Questions Area */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-100 p-5">
            <h2 className="text-lg font-bold text-gray-900">Section {currentSectionIndex + 1}: {currentSection}</h2>
          </div>
          
          <div className="p-6 space-y-8">
            {sectionQuestions.map((q, index) => (
              <div key={q.id} className="space-y-3">
                <label className="block text-gray-900 font-medium">
                  {index + 1}. {q.question_text}
                  {q.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                
                {q.question_type === 'text' && (
                  <input 
                    type="text" 
                    disabled={isReadonly}
                    value={answers[q.id] || ''}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Enter answer..."
                  />
                )}
                
                {q.question_type === 'number' && (
                  <input 
                    type="number" 
                    disabled={isReadonly}
                    value={answers[q.id] || ''}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-50 disabled:text-gray-500 max-w-xs"
                    placeholder="0"
                  />
                )}
                
                {q.question_type === 'radio' && q.options && (
                  <div className="space-y-2">
                    {(q.options as string[]).map(opt => (
                      <label key={opt} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                        <input 
                          type="radio" 
                          disabled={isReadonly}
                          name={`q_${q.id}`} 
                          value={opt}
                          checked={answers[q.id] === opt}
                          onChange={() => handleAnswerChange(q.id, opt)}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                        />
                        <span className="text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}
                
                {q.question_type === 'select' && q.options && (
                  <select 
                    disabled={isReadonly}
                    value={answers[q.id] || ''}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    <option value="" disabled>Select an option...</option>
                    {(q.options as string[]).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
                
                {/* Checkbox and Date can be added similarly if needed */}
              </div>
            ))}
          </div>
          
          {/* Bottom Navigation */}
          <div className="border-t border-gray-100 p-5 bg-gray-50 flex items-center justify-between">
            <button 
              onClick={() => setCurrentSectionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentSectionIndex === 0}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ChevronLeft size={18} /> Previous
            </button>
            
            <button 
              onClick={() => setCurrentSectionIndex(prev => Math.min(sections.length - 1, prev + 1))}
              disabled={currentSectionIndex === sections.length - 1}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Next <ChevronRight size={18} />
            </button>
          </div>
        </div>

      </div>

      {/* Action Bar (Fixed to bottom) */}
      {!isReadonly && (
        <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-white border-t border-gray-200 p-4 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <button 
              onClick={() => saveAnswers(false)}
              disabled={saving || submitting}
              className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 flex-1 sm:flex-none"
            >
              {saving ? <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div> : <Save size={18} />}
              <span className="hidden sm:inline">Save Draft</span>
              <span className="sm:hidden">Save</span>
            </button>
            
            <button 
              onClick={() => saveAnswers(true)}
              disabled={saving || submitting}
              className="px-6 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 flex-1 sm:flex-none"
            >
              {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <CheckCircle size={18} />}
              Submit Survey
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
