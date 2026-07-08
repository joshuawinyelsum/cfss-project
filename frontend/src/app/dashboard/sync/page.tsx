"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { db, LocalSurvey } from '@/lib/db';
import { syncEngine } from '@/lib/sync';
import Link from 'next/link';
import { RefreshCw, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

export default function SyncPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  
  const [stats, setStats] = useState({ total: 0, pending: 0, synced: 0, failed: 0 });
  const [pendingItems, setPendingItems] = useState<LocalSurvey[]>([]);
  const [historyItems, setHistoryItems] = useState<LocalSurvey[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const loadSyncData = async () => {
    try {
      const all = await db.surveys.toArray();
      
      const pending = all.filter(s => s.sync_status === 'pending' || s.sync_status === 'syncing');
      const failed = all.filter(s => s.sync_status === 'failed');
      const synced = all.filter(s => s.sync_status === 'synced');
      
      setStats({
        total: all.length,
        pending: pending.length,
        failed: failed.length,
        synced: synced.length
      });
      
      // Sort newest first
      setPendingItems([...pending, ...failed].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
      setHistoryItems(synced.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 50));
      setIsOnline(navigator.onLine);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!token || user?.role !== 'student') {
      router.push('/login');
      return;
    }
    
    loadSyncData();
    
    window.addEventListener('sync-completed', loadSyncData);
    window.addEventListener('sync-queued', loadSyncData);
    window.addEventListener('online', loadSyncData);
    window.addEventListener('offline', loadSyncData);
    
    // Periodically update to catch background changes just in case
    const interval = setInterval(loadSyncData, 5000);
    
    return () => {
      window.removeEventListener('sync-completed', loadSyncData);
      window.removeEventListener('sync-queued', loadSyncData);
      window.removeEventListener('online', loadSyncData);
      window.removeEventListener('offline', loadSyncData);
      clearInterval(interval);
    };
  }, [user, token, router]);

  const handleManualSync = async () => {
    if (!token || !navigator.onLine) return;
    setIsSyncing(true);
    await syncEngine.processQueue(token);
    setIsSyncing(false);
    loadSyncData();
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sync Status</h1>
          <p className="text-gray-500 mt-1">
            {!isOnline 
              ? "You are currently offline. Surveys will be saved locally." 
              : "You are online. Pending surveys will upload automatically."}
          </p>
        </div>
        <button 
          onClick={handleManualSync}
          disabled={!isOnline || isSyncing || (stats.pending === 0 && stats.failed === 0)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0a4628] text-white rounded-lg hover:bg-[#0d5a34] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Locally</p>
          <h3 className="text-2xl font-bold text-gray-900">{stats.total}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-blue-100 bg-blue-50/30 shadow-sm flex flex-col">
          <p className="text-sm font-medium text-blue-600 mb-1">Pending Sync</p>
          <h3 className="text-2xl font-bold text-blue-700">{stats.pending}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-100 bg-emerald-50/30 shadow-sm flex flex-col">
          <p className="text-sm font-medium text-emerald-600 mb-1">Synced</p>
          <h3 className="text-2xl font-bold text-emerald-700">{stats.synced}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-red-100 bg-red-50/30 shadow-sm flex flex-col">
          <p className="text-sm font-medium text-red-600 mb-1">Failed</p>
          <h3 className="text-2xl font-bold text-red-700">{stats.failed}</h3>
        </div>
      </div>

      {/* Pending Sync List */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Pending Sync Queue
          </h2>
          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{pendingItems.length}</span>
        </div>
        
        <div className="divide-y divide-gray-100">
          {pendingItems.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No surveys waiting to sync.
            </div>
          ) : (
            pendingItems.map(item => (
              <div key={item.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900">{item.survey_type.toUpperCase()} Survey</span>
                    {item.sync_status === 'failed' && (
                      <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Failed</span>
                    )}
                    {item.sync_status === 'syncing' && (
                      <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Syncing</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    House Number: <span className="font-medium text-gray-700">{item.house_number || 'Pending Assignment'}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Saved: {new Date(item.updated_at).toLocaleString()}
                  </p>
                  {item.sync_error && (
                    <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {item.sync_error}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Sync History */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            Recent Sync History
          </h2>
        </div>
        
        <div className="divide-y divide-gray-100">
          {historyItems.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No recent sync history.
            </div>
          ) : (
            historyItems.map(item => (
              <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{item.survey_type.toUpperCase()} Survey</p>
                  <p className="text-xs text-gray-500">House: {item.house_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-emerald-600 font-medium flex items-center justify-end gap-1">
                    <CheckCircle className="w-3 h-3" /> Synced successfully
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(item.updated_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

    </div>
  );
}
