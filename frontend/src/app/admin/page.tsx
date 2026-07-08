"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { downloadExport } from '@/lib/export';

export default function AdminDashboard() {
  const { user, token, logout } = useAuthStore();
  const router = useRouter();

  const [communities, setCommunities] = useState<any[]>([]);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [settings, setSettings] = useState({ registration_open: false });
  const [newCommName, setNewCommName] = useState('');
  const [newCommCap, setNewCommCap] = useState(10);
  const [students, setStudents] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);
  const [syncStats, setSyncStats] = useState({ total: 0, synced: 0, pending: 0, failed: 0 });

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/admin/login');
      return;
    }
    
    // Polling setup for live updates
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [user, router, token]);

  const fetchData = async () => {
    if (!token) return;
    try {
      const opts = { headers: { Authorization: `Bearer ${token}` } };
      const [commRes, survRes, setRes, studRes, syncRes] = await Promise.all([
        api.get('/api/admin/communities', opts),
        api.get('/api/admin/surveys', opts),
        api.get('/api/admin/settings', opts),
        api.get('/api/admin/students', opts),
        api.get('/api/admin/sync/overview', opts)
      ]);
      setCommunities(commRes.data);
      setSurveys(survRes.data);
      setSettings(setRes.data);
      setStudents(studRes.data);
      setSyncStats(syncRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleRegistration = async () => {
    try {
      const newVal = !settings.registration_open;
      await api.put('/api/admin/settings', 
        { registration_open: newVal },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSettings({ ...settings, registration_open: newVal });
    } catch (e) {
      console.error(e);
      alert("Failed to update settings");
    }
  };

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/communities', 
        { name: newCommName, capacity: newCommCap },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewCommName('');
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportStudents = async () => {
    try {
      setExporting(true);
      await downloadExport('/admin/export/students', 'students_export.csv', token!);
    } catch (e) {
      alert("Export failed. Check server.");
    } finally {
      setExporting(false);
    }
  };

  const handleExportSurveys = async () => {
    try {
      setExporting(true);
      await downloadExport('/admin/export/surveys', 'surveys_export.csv', token!);
    } catch (e) {
      alert("Export failed. Check server.");
    } finally {
      setExporting(false);
    }
  };

  // Whitelist upload handled in separate page

  if (!user) return null;

  return (
    <div className="space-y-8">
      
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-5">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 mb-1">Total Students</p>
            <p className="text-3xl font-bold text-slate-900">{students.length}</p>
            <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
              12 this week
            </p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-5">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl">
             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 mb-1">Total Surveys</p>
            <p className="text-3xl font-bold text-slate-900">{surveys.length}</p>
            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
              28 this week
            </p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-5">
          <div className="p-4 bg-purple-50 text-purple-600 rounded-xl">
             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m3-4h1m-1 4h1m-5 8h5" /></svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 mb-1">Total Communities</p>
            <p className="text-3xl font-bold text-slate-900">{communities.length}</p>
            <p className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-1">
              0 change this week
            </p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-5">
          <div className={`p-4 rounded-xl ${settings.registration_open ? 'bg-amber-50 text-amber-500' : 'bg-red-50 text-red-500'}`}>
             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 mb-1">Registration Status</p>
            <p className={`text-2xl font-bold ${settings.registration_open ? 'text-green-600' : 'text-red-600'}`}>
              {settings.registration_open ? 'OPEN' : 'CLOSED'}
            </p>
            <p className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-1">
              Since May 10, 2024
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: 70% / 30% */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN (70%) */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* System Sync Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                System Sync Overview
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-sm font-medium text-slate-500 mb-1">Total Surveys</p>
                  <p className="text-2xl font-bold text-slate-900">{syncStats.total}</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                  <p className="text-sm font-medium text-emerald-600 mb-1">Synced</p>
                  <p className="text-2xl font-bold text-emerald-700">{syncStats.synced}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-sm font-medium text-blue-600 mb-1">Pending Sync</p>
                  <p className="text-2xl font-bold text-blue-700">{syncStats.pending}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                  <p className="text-sm font-medium text-red-600 mb-1">Failed Syncs</p>
                  <p className="text-2xl font-bold text-red-700">{syncStats.failed}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Communities Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                Communities & Groups
              </h2>
              <button onClick={() => {}} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-colors">
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                 Create Community
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-slate-500 border-b border-slate-200 bg-slate-50/50">
                  <tr>
                    <th className="py-4 px-6 font-semibold">Community Name</th>
                    <th className="py-4 px-6 font-semibold">Group</th>
                    <th className="py-4 px-6 font-semibold text-center">Capacity</th>
                    <th className="py-4 px-6 font-semibold text-center">Students</th>
                    <th className="py-4 px-6 font-semibold w-1/4">Progress</th>
                    <th className="py-4 px-6 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {communities.map(c => {
                    const progress = Math.min(100, Math.round((c.current_count / c.max_capacity) * 100)) || 0;
                    const barColor = progress > 90 ? 'bg-red-500' : progress > 60 ? 'bg-emerald-500' : 'bg-emerald-500';
                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-6 font-medium text-slate-900">{c.name}</td>
                        <td className="py-4 px-6 text-slate-600">{c.group_label}</td>
                        <td className="py-4 px-6 text-center text-slate-600">{c.max_capacity}</td>
                        <td className="py-4 px-6 text-center font-medium text-slate-700">{c.current_count}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div className={`${barColor} h-2 rounded-full`} style={{width: `${progress}%`}}></div>
                            </div>
                            <span className="text-xs font-medium text-slate-500 w-9">{progress}%</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button className="text-slate-400 hover:text-slate-700">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="py-3 text-center border-t border-slate-100">
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1">
                  View all communities <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          </div>

          {/* Recent Surveys Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                Recent Surveys
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-4 px-6 font-semibold">Student Name</th>
                    <th className="py-4 px-6 font-semibold">Community</th>
                    <th className="py-4 px-6 font-semibold">Survey Type</th>
                    <th className="py-4 px-6 font-semibold">Date</th>
                    <th className="py-4 px-6 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {surveys.slice(0, 5).map(s => {
                    const student = students.find(st => st.id === s.user_id);
                    const community = communities.find(c => c.id === s.community_id);
                    const isSubmitted = s.status?.toLowerCase() === 'submitted';
                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                             <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-200 shrink-0">
                               {student?.name?.substring(0,2).toUpperCase() || 'NA'}
                             </div>
                             <div>
                               <p className="font-semibold text-slate-900 leading-tight">{student?.name || 'Unknown'}</p>
                               <p className="text-xs text-slate-500">{student?.student_id}</p>
                             </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                           <p className="text-slate-900 font-medium">{community?.name || 'Unknown'}</p>
                           <p className="text-xs text-slate-500">{community?.group_label}</p>
                        </td>
                        <td className="py-4 px-6 text-slate-600">{s.type}</td>
                        <td className="py-4 px-6 text-slate-500 text-xs">
                           {new Date(s.created_at).toLocaleString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                           })}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wide ${isSubmitted ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-orange-50 text-orange-500 border-orange-200'}`}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="py-3 text-center border-t border-slate-100">
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1">
                  View all surveys <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          </div>
          
          {/* Students Overview Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                Students Overview
              </h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input type="text" placeholder="Search by name or student ID..." className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <select className="border border-slate-200 rounded-lg text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option>All Programs</option>
                  <option>Computer Science</option>
                  <option>Information Technology</option>
                  <option>Engineering</option>
                </select>
                <button onClick={handleExportStudents} disabled={exporting} className="text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  {exporting ? "Exporting..." : "Export CSV"}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-4 px-6 font-semibold">Name</th>
                    <th className="py-4 px-6 font-semibold">Student ID</th>
                    <th className="py-4 px-6 font-semibold">Program</th>
                    <th className="py-4 px-6 font-semibold">Level</th>
                    <th className="py-4 px-6 font-semibold">Community</th>
                    <th className="py-4 px-6 font-semibold">Group</th>
                    <th className="py-4 px-6 font-semibold">Registered On</th>
                    <th className="py-4 px-6 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.slice(0, 5).map(student => {
                    const community = communities.find(c => c.id === student.community_id);
                    return (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-6 font-medium text-slate-900">{student.name}</td>
                        <td className="py-4 px-6 text-slate-500 font-medium">{student.student_id}</td>
                        <td className="py-4 px-6 text-slate-600">{student.program || 'Unknown'}</td>
                        <td className="py-4 px-6 text-slate-600">{student.level}</td>
                        <td className="py-4 px-6 text-slate-600">{community?.name || 'N/A'}</td>
                        <td className="py-4 px-6 text-slate-600">{community?.group_label || 'N/A'}</td>
                        <td className="py-4 px-6 text-slate-500 text-xs">May 10, 2024</td>
                        <td className="py-4 px-6">
                          <span className="px-2 py-1 rounded text-xs font-semibold text-emerald-600">Active</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="py-4 px-6 flex justify-between items-center border-t border-slate-100 text-sm text-slate-500">
                <span>Showing 1 to {Math.min(5, students.length)} of {students.length} students</span>
                <div className="flex gap-1 items-center">
                  <button className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded text-slate-400 hover:bg-slate-50">&lt;</button>
                  <button className="w-8 h-8 flex items-center justify-center border border-blue-600 bg-blue-600 text-white rounded">1</button>
                  <button className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded hover:bg-slate-50">2</button>
                  <button className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded hover:bg-slate-50">3</button>
                  <span className="px-1">...</span>
                  <button className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded hover:bg-slate-50">26</button>
                  <button className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded text-slate-600 hover:bg-slate-50">&gt;</button>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN (30%) */}
        <div className="space-y-8">
          
          {/* Registration Control */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              Registration Control
            </h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                 <span className="text-sm font-semibold text-slate-700">Current Status</span>
                 <div className={`px-4 py-1.5 rounded-lg text-center font-bold text-sm ${settings.registration_open ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                   {settings.registration_open ? 'OPEN' : 'CLOSED'}
                 </div>
              </div>

              <div className="flex items-center justify-between">
                 <span className="text-sm text-slate-600">Registration is currently open for students.</span>
                 <button 
                   onClick={handleToggleRegistration} 
                   className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none shrink-0 ${settings.registration_open ? 'bg-emerald-500' : 'bg-slate-300'}`}
                 >
                   <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform ${settings.registration_open ? 'translate-x-7' : 'translate-x-1'}`} />
                 </button>
              </div>

              <hr className="border-slate-100" />
              
              <div>
                 <span className="text-sm font-semibold text-slate-800">Registration Control</span>
                 <div className="flex items-start gap-3 border border-slate-200 rounded-lg p-3 mt-3 shadow-sm bg-slate-50">
                    <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">Open Registration</p>
                      <p className="text-[11px] text-slate-500">Opened on: May 10, 2024 08:00 AM</p>
                    </div>
                 </div>
              </div>
            </div>
          </div>

          {/* Whitelist Management */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Whitelist Management
            </h2>
            <p className="text-sm text-slate-600 mb-4">Go to the detailed whitelist management page to upload new whitelists and view history.</p>
            <a href="/admin/whitelist" className="w-full inline-flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 rounded-lg shadow-sm transition-colors">
              Manage Whitelists
            </a>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Quick Actions
            </h2>
            
            <div className="space-y-3">
              <button onClick={handleExportStudents} disabled={exporting} className="w-full flex items-center gap-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-3 px-4 rounded-xl transition-colors border border-emerald-200 shadow-sm text-sm">
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                 Export Students (CSV)
              </button>
              <button onClick={handleExportSurveys} disabled={exporting} className="w-full flex items-center gap-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-3 px-4 rounded-xl transition-colors border border-blue-200 shadow-sm text-sm">
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                 Export Surveys (CSV)
              </button>
              <button className="w-full flex items-center gap-3 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold py-3 px-4 rounded-xl transition-colors border border-purple-200 shadow-sm text-sm">
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                 Export Reports (PDF)
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
