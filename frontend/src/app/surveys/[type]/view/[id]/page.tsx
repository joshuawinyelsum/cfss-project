"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import DashboardLayout from '@/app/dashboard/layout';
import Link from 'next/link';
import { ArrowLeft, CheckCircle } from 'lucide-react';

export default function SurveyViewPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const typeStr = params.type as string;
  const recordId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [record, setRecord] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!token) return;
    
    const loadData = async () => {
      try {
        const res = await api.get(`/api/student/surveys/record/${recordId}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = res.data.record;
        
        // As per rule: A student must never see another student's survey data.
        // Though backend handles it on list endpoints, we should verify it here too if the backend record endpoint isn't strict enough
        if (data.created_by_student_id !== user?.id) {
          setError("You do not have permission to view this survey.");
          setLoading(false);
          return;
        }

        setRecord(data);
        setQuestions(res.data.questions);
        
        // Map answers
        const ansMap: Record<string, any> = {};
        res.data.answers.forEach((a: any) => {
          ansMap[a.question_id] = a.answer;
        });
        setAnswers(ansMap);
      } catch (e: any) {
        setError(e.response?.data?.detail || "Failed to load survey");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [token, recordId, user]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center p-12 text-gray-500">Loading survey details...</div>
      </DashboardLayout>
    );
  }

  if (error || !record) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 max-w-3xl mx-auto font-medium">
          {error || "Record not found"}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto pb-12">
        
        {/* Header Navigation */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard/surveys/submitted" className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors shrink-0">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 capitalize">View Survey</h1>
          </div>
          
          <div className="ml-auto bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 border border-emerald-100">
            <CheckCircle size={16} /> Read Only
          </div>
        </div>

        {/* Survey Metadata */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Survey Type</p>
              <p className="font-bold text-gray-900 capitalize">{record.survey_type.toLowerCase()} Survey</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">House Number</p>
              <p className="font-mono font-bold text-gray-900 bg-gray-50 inline-block px-2 py-0.5 rounded border border-gray-100">{record.house_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Community</p>
              <p className="font-bold text-gray-900">{user?.community}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Submission Date</p>
              <p className="font-bold text-gray-900">
                {new Date(record.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Responses */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-100 p-5">
            <h2 className="text-lg font-bold text-gray-900">Responses</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {questions.map((q, index) => {
              const answer = answers[q.id];
              return (
                <div key={q.id} className="p-5 hover:bg-gray-50/50 transition-colors">
                  <p className="text-sm font-medium text-gray-500 mb-2">{q.section}</p>
                  <p className="font-medium text-gray-900 mb-2">{index + 1}. {q.question_text}</p>
                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-gray-800">
                    {answer !== undefined && answer !== null && answer !== '' ? (
                      <span className="font-medium">{String(answer)}</span>
                    ) : (
                      <span className="text-gray-400 italic">No answer provided</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
