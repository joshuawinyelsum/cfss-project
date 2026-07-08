"use client";

import { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface SurveyStats {
  total_surveys: number;
  by_community: {
    community_name: string;
    count: number;
  }[];
}

interface SurveyList {
  id: string;
  student_email: string;
  community_name: string;
  group_number: number;
  submitted_at: string;
  status: string;
  type: string;
}

interface SurveyDetail extends SurveyList {
  responses: Record<string, any>;
}

export default function AdminSurveysPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  const [surveys, setSurveys] = useState<SurveyList[]>([]);
  const [stats, setStats] = useState<SurveyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState<string>('All');
  const [selectedGroup, setSelectedGroup] = useState<string>('All');

  // Modal state
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyDetail | null>(null);
  const [surveyDetailsLoading, setSurveyDetailsLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/admin/login');
      return;
    }
    fetchData();
  }, [user, router, token]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const opts = { headers: { Authorization: `Bearer ${token}` } };
      const [surveysRes, statsRes] = await Promise.all([
        api.get('/api/admin/surveys', opts),
        api.get('/api/admin/surveys/stats', opts)
      ]);
      setSurveys(surveysRes.data);
      setStats(statsRes.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch surveys. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (surveyId: string) => {
    setSurveyDetailsLoading(true);
    setSelectedSurvey(null);
    try {
      const res = await api.get(`/api/admin/surveys/${surveyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedSurvey(res.data);
    } catch (err: any) {
      alert("Failed to fetch full survey details.");
    } finally {
      setSurveyDetailsLoading(false);
    }
  };

  // Filter options
  const uniqueCommunities = useMemo(() => {
    const comms = new Set(surveys.map(s => s.community_name).filter(Boolean));
    return Array.from(comms).sort();
  }, [surveys]);

  const uniqueGroups = useMemo(() => {
    const groups = new Set(surveys.map(s => s.group_number).filter(g => g !== null && g !== undefined));
    return Array.from(groups).sort((a, b) => a - b);
  }, [surveys]);

  // Apply filters
  const filteredSurveys = useMemo(() => {
    return surveys.filter(survey => {
      if (selectedCommunity !== 'All' && survey.community_name !== selectedCommunity) {
        return false;
      }
      if (selectedGroup !== 'All' && survey.group_number.toString() !== selectedGroup) {
        return false;
      }
      if (debouncedSearch && (!survey.student_email || !survey.student_email.toLowerCase().includes(debouncedSearch.toLowerCase()))) {
        return false;
      }
      return true;
    });
  }, [surveys, selectedCommunity, selectedGroup, debouncedSearch]);

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  if (!user || user.role !== 'admin') {
    return null; 
  }

  return (
    <div className="space-y-6 relative">
      {/* Stats Cards */}
      {!loading && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-sm font-medium text-slate-500 mb-1">Total Surveys</h3>
            <p className="text-3xl font-bold text-slate-900">{stats.total_surveys}</p>
          </div>
          {/* We only show top 3 community counts to save space */}
          {stats.by_community.slice(0, 3).map((comm, idx) => (
            <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col hidden sm:flex">
              <h3 className="text-sm font-medium text-slate-500 mb-1 truncate" title={comm.community_name}>
                {comm.community_name}
              </h3>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-slate-900">{comm.count}</p>
                <span className="text-sm text-slate-400 mb-1">surveys</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Surveys</h1>
          <p className="text-sm text-slate-500 mt-1">Review all student submitted surveys</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto flex-wrap xl:flex-nowrap">
          {/* Search */}
          <div className="relative w-full sm:w-64 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm disabled:opacity-50"
              placeholder="Search by student email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Group Filter */}
          <select
            className="block w-full sm:w-auto xl:w-40 pl-3 pr-10 py-2 border border-slate-300 bg-white rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm disabled:opacity-50"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            disabled={loading}
          >
            <option value="All">All Groups</option>
            {uniqueGroups.map(grp => (
              <option key={grp} value={grp.toString()}>Group {grp}</option>
            ))}
          </select>

          {/* Community Filter */}
          <select
            className="block w-full sm:w-auto xl:w-56 pl-3 pr-10 py-2 border border-slate-300 bg-white rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm disabled:opacity-50"
            value={selectedCommunity}
            onChange={(e) => setSelectedCommunity(e.target.value)}
            disabled={loading}
          >
            <option value="All">All Communities</option>
            {uniqueCommunities.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-red-700 font-medium text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredSurveys.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-slate-900 mb-1">No surveys found</h3>
          <p className="text-slate-500">
            {surveys.length === 0 
              ? "No surveys have been submitted to the system yet." 
              : "No surveys match your current search and filter criteria."}
          </p>
          {(searchTerm || selectedCommunity !== 'All' || selectedGroup !== 'All') && (
            <button 
              onClick={() => { setSearchTerm(''); setSelectedCommunity('All'); setSelectedGroup('All'); }}
              className="mt-4 text-blue-600 hover:text-blue-800 font-medium text-sm"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Student Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Survey Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Community & Group
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredSurveys.map((survey) => (
                  <tr 
                    key={survey.id} 
                    onClick={() => handleRowClick(survey.id)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-slate-900">{survey.student_email || "Anonymous"}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-md bg-purple-100 text-purple-800 capitalize">
                        {survey.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 font-medium">{survey.community_name}</div>
                      <div className="text-xs text-slate-500">Group {survey.group_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatDate(survey.submitted_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        survey.status === 'completed' || survey.status === 'submitted' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {survey.status.charAt(0).toUpperCase() + survey.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Survey Details Modal */}
      {(selectedSurvey || surveyDetailsLoading) && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-slate-900 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setSelectedSurvey(null)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full">
              {surveyDetailsLoading ? (
                <div className="p-12 flex flex-col justify-center items-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-sm text-slate-500">Loading survey responses...</p>
                </div>
              ) : selectedSurvey ? (
                <>
                  <div className="bg-white px-6 pt-6 pb-4 sm:p-6 sm:pb-4 border-b border-slate-200 flex justify-between items-center">
                    <div>
                      <h3 className="text-xl leading-6 font-bold text-slate-900" id="modal-title">
                        Survey Details
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                        {selectedSurvey.type} Survey
                      </p>
                    </div>
                    <button onClick={() => setSelectedSurvey(null)} className="text-slate-400 hover:text-slate-500">
                      <span className="sr-only">Close</span>
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase">Student</p>
                        <p className="text-sm font-semibold text-slate-900">{selectedSurvey.student_email || "Anonymous"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase">Submitted</p>
                        <p className="text-sm font-semibold text-slate-900">{formatDate(selectedSurvey.submitted_at)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase">Community</p>
                        <p className="text-sm font-semibold text-slate-900">{selectedSurvey.community_name}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase">Group</p>
                        <p className="text-sm font-semibold text-slate-900">Group {selectedSurvey.group_number}</p>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <h4 className="text-sm font-bold text-slate-900 mb-4">Responses</h4>
                    
                    {selectedSurvey.responses && Object.keys(selectedSurvey.responses).length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(selectedSurvey.responses).map(([question, answer], idx) => {
                          const renderAnswer = (ans: any) => {
                            if (Array.isArray(ans)) {
                              return (
                                <ul className="list-disc pl-5 space-y-1">
                                  {ans.map((item, i) => (
                                    <li key={i} className="break-words">{String(item)}</li>
                                  ))}
                                </ul>
                              );
                            } else if (typeof ans === 'object' && ans !== null) {
                              return (
                                <div className="space-y-1">
                                  {Object.entries(ans).map(([k, v]) => (
                                    <div key={k} className="flex gap-2 text-sm break-words">
                                      <span className="font-medium text-slate-700 capitalize shrink-0">{k.replace(/_/g, ' ')}:</span>
                                      <span className="text-slate-600 break-words">{String(v)}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            return <span className="break-words whitespace-pre-wrap">{String(ans)}</span>;
                          };

                          return (
                            <div key={idx} className="bg-white border border-slate-200 rounded-lg p-4">
                              <p className="text-sm font-semibold text-slate-800 mb-2">{question}</p>
                              <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded border border-slate-100 overflow-x-auto">
                                {renderAnswer(answer)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-sm text-slate-500">No responses recorded for this survey.</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-slate-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-slate-200">
                    <button 
                      type="button" 
                      className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-slate-900 text-base font-medium text-white hover:bg-slate-800 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                      onClick={() => setSelectedSurvey(null)}
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
