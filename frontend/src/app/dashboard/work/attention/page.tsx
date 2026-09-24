"use client";
import Link from 'next/link';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { syncEngine } from '@/lib/sync';
import { db } from '@/lib/db';
import { RefreshCw, CheckCircle, XCircle, Clock, AlertCircle, Search, ArrowRight, X , ArrowLeft } from 'lucide-react';

export default function SyncPage() {
  const { user, token } = useAuthStore();
  const [stats, setStats] = useState({ pending: 0, failed: 0, synced: 0 });
  const [failedItems, setFailedItems] = useState<any[]>([]);
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncText, setLastSyncText] = useState('Never');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadStats = async () => {
      try {
        const records = await db.surveys.where('student_id').equals(user.id as number).toArray();
        const pendingList = records.filter(r => r.sync_status === 'pending');
        const failedList = records.filter(r => r.sync_status === 'failed');
        const syncedList = records.filter(r => r.sync_status === 'synced');

        setPendingItems(pendingList.sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
        setFailedItems(failedList.sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
        setHistoryItems(syncedList.sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 10));

        setStats({
          pending: pendingList.length,
          failed: failedList.length,
          synced: syncedList.length
        });
        
        const lastSync = localStorage.getItem('cfss_last_sync');
        if (lastSync) {
          setLastSyncText(new Date(parseInt(lastSync)).toLocaleString());
        }
      } catch(e) {}
    };

    loadStats();
    window.addEventListener('sync-completed', loadStats);
    window.addEventListener('sync-queued', loadStats);
    return () => {
      window.removeEventListener('sync-completed', loadStats);
      window.removeEventListener('sync-queued', loadStats);
    };
  }, [user]);

  const handleSyncAll = async () => {
    if (isSyncing || !token) return;
    setIsSyncing(true);
    try {
      await syncEngine.processQueue(token);
      localStorage.setItem('cfss_last_sync', Date.now().toString());
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncSingle = async (item: any) => {
    if (!token) return;
    setIsSyncing(true);
    try {
      // Re-queue it if it was failed, just setting its sync_status to pending
      await db.surveys.update(item.id, { sync_status: 'pending' });
      await syncEngine.processQueue(token);
      localStorage.setItem('cfss_last_sync', Date.now().toString());
      setSelectedItem(null); // Close modal
    } finally {
      setIsSyncing(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      

      <div className="space-y-6 mt-8">
        {failedItems.length > 0 && (
          <section>
             <h2 className="text-sm font-bold text-status-error uppercase tracking-wider mb-3 flex items-center gap-2"><XCircle size={16}/> Failed Synchronization</h2>
             <div className="bg-surface border border-status-error/30 rounded-xl overflow-hidden shadow-sm divide-y divide-border">
               {failedItems.map((item) => (
                 <div key={item.id} onClick={() => setSelectedItem(item)} className="p-4 flex items-center justify-between hover:bg-red-50/50 cursor-pointer transition-colors">
                   <div>
                     <h3 className="text-sm font-bold text-primary capitalize">{item.survey_type.toLowerCase()} Survey</h3>
                     <p className="text-xs text-secondary mt-1">ID: <span className="font-mono">{item.id.slice(0,8)}</span></p>
                   </div>
                   <div className="flex items-center gap-4">
                     <span className="text-xs font-bold px-2 py-1 bg-status-error/10 text-status-error rounded-md border border-status-error/20">Sync Failed</span>
                     <ArrowRight size={16} className="text-muted" />
                   </div>
                 </div>
               ))}
             </div>
          </section>
        )}

        {failedItems.length === 0 && (
          <div className="bg-page rounded-xl border border-border border-dashed p-12 text-center flex flex-col items-center">
            <RefreshCw size={32} className="text-muted mb-3 opacity-30" />
            <p className="text-muted font-medium text-sm">No actionable items. You are all caught up!</p>
          </div>
        )}
      </div>
      
      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-page/50">
              <h2 className="font-bold text-primary">Record Details</h2>
              <button onClick={() => setSelectedItem(null)} className="p-2 -mr-2 text-muted hover:text-secondary rounded-full hover:bg-gray-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-muted font-medium">Type:</div>
                <div className="col-span-2 font-bold text-primary capitalize">{selectedItem.survey_type.toLowerCase()} Survey</div>
                
                <div className="text-muted font-medium">ID:</div>
                <div className="col-span-2 font-mono text-xs bg-page px-2 py-1 rounded inline-block text-secondary">{selectedItem.id}</div>
                
                <div className="text-muted font-medium mt-2">State:</div>
                <div className="col-span-2 mt-2 flex">
                  {selectedItem.sync_status === 'failed' ? (
                     <span className="text-xs font-bold px-2 py-1 bg-status-error/10 text-status-error rounded-md border border-status-error/20">Failed</span>
                  ) : selectedItem.sync_status === 'pending' ? (
                     <span className="text-xs font-bold px-2 py-1 bg-status-warning/10 text-status-warning rounded-md border border-status-warning/20">Pending Sync</span>
                  ) : (
                     <span className="text-xs font-bold px-2 py-1 bg-cfss-green-soft text-cfss-green rounded-md border border-cfss-green/20">Synced</span>
                  )}
                </div>
                
                <div className="text-muted font-medium mt-2">Updated:</div>
                <div className="col-span-2 mt-2 text-primary">{new Date(selectedItem.updated_at).toLocaleString()}</div>
              </div>

              {selectedItem.sync_error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg">
                  <h4 className="text-xs font-bold text-red-800 uppercase tracking-wide mb-1">Error Information</h4>
                  <p className="text-sm text-red-700 font-mono break-all">{selectedItem.sync_error}</p>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-border bg-page flex justify-end gap-3">
              <button 
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 font-medium text-secondary hover:text-primary hover:bg-gray-200 rounded-lg transition-colors text-sm"
              >
                Close
              </button>
              
              {(selectedItem.sync_status === 'pending' || selectedItem.sync_status === 'failed') && (
                <button 
                  onClick={() => handleSyncSingle(selectedItem)}
                  disabled={isSyncing}
                  className="flex items-center gap-2 px-5 py-2 font-bold text-white bg-cfss-green hover:bg-cfss-green-hover rounded-lg transition-colors text-sm disabled:opacity-50"
                >
                  <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
                  {isSyncing ? "Syncing..." : (selectedItem.sync_status === 'failed' ? "Retry Sync" : "Sync Now")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
