"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { api, getErrorMessage } from '@/lib/api';

interface Community {
  id: string;
  name: string;
  district: string;
  region: string;
  capacity: number;
  student_count: number;
  slots_remaining: number;
  group_number: number;
  group_label: string;
}

interface Student {
  id: string;
  student_id: string;
  name: string;
  email: string;
  program: string;
  level: number;
  community_id: string;
}

export default function CommunitiesPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  const [communities, setCommunities] = useState<Community[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  // Create form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newComm, setNewComm] = useState({ name: '', district: '', region: '', capacity: 10 });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [loading, setLoading] = useState(true);

  // Delete state
  const [deleteError, setDeleteError] = useState('');

  // Selected community state (for viewing students)
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/admin/login');
      return;
    }
    
    fetchData();
  }, [user, router, token]);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const opts = { headers: { Authorization: `Bearer ${token}` } };
      const [commRes, studRes] = await Promise.all([
        api.get('/api/admin/communities', opts),
        api.get('/api/admin/students', opts)
      ]);
      setCommunities(commRes.data);
      setStudents(studRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      await api.post('/api/admin/communities', newComm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewComm({ name: '', district: '', region: '', capacity: 10 });
      setShowCreateModal(false);
      // Data reliability requirement: fetch after create
      await fetchData();
    } catch (err: any) {
      setCreateError(getErrorMessage(err, "Failed to create community"));
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCommunity = async (e: React.MouseEvent, comm: Community) => {
    e.stopPropagation(); // Prevent opening the community details
    if (comm.student_count > 0) {
      alert("Cannot delete community with assigned students.");
      return;
    }
    if (!confirm(`Are you sure you want to delete the community "${comm.name}"?`)) {
      return;
    }
    try {
      await api.delete(`/api/admin/communities/${comm.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Refresh the list
      await fetchData();
      if (selectedCommunity?.id === comm.id) {
        setSelectedCommunity(null);
      }
    } catch (err: any) {
      alert(getErrorMessage(err, "Failed to delete community"));
    }
  };

  const communityStudents = selectedCommunity 
    ? students.filter(s => s.community_id === selectedCommunity.id)
    : [];

  return (
    <div className="space-y-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Communities & Groups</h1>
          <p className="text-sm text-slate-500 mt-1">Manage capacity and group assignments</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 px-5 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Create Community
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {communities.map(comm => {
          const isFull = comm.student_count >= comm.capacity;
          
          return (
            <div 
              key={comm.id}
              onClick={() => setSelectedCommunity(comm)}
              className={`bg-white rounded-xl shadow-sm border ${isFull ? 'border-red-200 hover:border-red-300' : 'border-slate-200 hover:border-blue-300'} p-5 cursor-pointer transition-all hover:shadow-md relative overflow-hidden group`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">{comm.name}</h3>
                  <p className="text-sm font-medium text-slate-500 mt-0.5">{comm.group_label}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {isFull && (
                    <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-1 rounded border border-red-100 uppercase tracking-wide">
                      Full
                    </span>
                  )}
                  <button 
                    onClick={(e) => handleDeleteCommunity(e, comm)}
                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Delete community"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {comm.district}, {comm.region}
                </div>
                
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Capacity</span>
                    <span className={`text-sm font-bold ${isFull ? 'text-red-600' : 'text-slate-700'}`}>
                      {comm.student_count} / {comm.capacity} {isFull && '(FULL)'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${isFull ? 'bg-red-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(100, (comm.student_count / comm.capacity) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {communities.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No Communities Found</h3>
          <p className="text-sm text-slate-500 mb-4">Get started by creating your first community</p>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="text-blue-600 font-semibold hover:underline"
          >
            Create Community
          </button>
        </div>
      )}
      </>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">Create New Community</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100">
                  {createError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Community Name</label>
                <input 
                  type="text" 
                  required
                  value={newComm.name}
                  onChange={e => setNewComm({...newComm, name: e.target.value})}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Asuboi Community"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">District</label>
                  <input 
                    type="text" 
                    required
                    value={newComm.district}
                    onChange={e => setNewComm({...newComm, district: e.target.value})}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Ayensuano"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Region</label>
                  <input 
                    type="text" 
                    required
                    value={newComm.region}
                    onChange={e => setNewComm({...newComm, region: e.target.value})}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Eastern"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Capacity</label>
                <input 
                  type="number" 
                  min="1"
                  required
                  value={newComm.capacity}
                  onChange={e => setNewComm({...newComm, capacity: parseInt(e.target.value) || 0})}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1.5">Maximum number of students allowed in this community.</p>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={creating}
                  className="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Community'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW COMMUNITY DETAILS MODAL */}
      {selectedCommunity && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/30 backdrop-blur-sm">
          <div className="bg-white h-full w-full max-w-md shadow-2xl flex flex-col animate-slide-in-right">
            
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-start bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedCommunity.name}</h2>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="bg-blue-100 text-blue-700 font-bold text-xs px-2.5 py-0.5 rounded uppercase tracking-wide">
                    {selectedCommunity.group_label}
                  </span>
                  <span className="text-sm font-medium text-slate-500">
                    {selectedCommunity.district}, {selectedCommunity.region}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedCommunity(null)} className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-1 shadow-sm border border-slate-200">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 border-b border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-slate-900">Capacity Status</h3>
                <span className="text-sm font-bold text-slate-700">{selectedCommunity.student_count} / {selectedCommunity.capacity}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-2">
                <div 
                  className={`h-full rounded-full transition-all ${selectedCommunity.student_count >= selectedCommunity.capacity ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, (selectedCommunity.student_count / selectedCommunity.capacity) * 100)}%` }}
                />
              </div>
              <p className="text-xs font-medium text-slate-500">{selectedCommunity.slots_remaining} slots remaining</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                Assigned Students ({communityStudents.length})
              </h3>
              
              {communityStudents.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No students assigned to this community yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {communityStudents.map(student => (
                    <div key={student.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                        {student.name.substring(0,2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-900 truncate">{student.name}</p>
                        <p className="text-xs text-slate-500 truncate">{student.student_id} • {student.program}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
}
