"use client";
import Link from 'next/link';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { syncEngine } from '@/lib/sync';
import { db } from '@/lib/db';
import { RefreshCw, CheckCircle, XCircle, Clock, AlertCircle, Search, ArrowRight, X , ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

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
    <div className="max-w-4xl mx-auto space-y-8 pb-12 mt-4">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Sync & Activity</h1>
          <p className="text-muted mt-1">Manage your offline synchronization and view recent activity.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-surface p-3 rounded-xl border border-border">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Status</span>
            <div className="flex items-center gap-2 mt-0.5">
               <span className={`w-2.5 h-2.5 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : navigator.onLine ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
               <span className="text-sm font-bold text-primary">{isSyncing ? 'Syncing...' : navigator.onLine ? 'Online' : 'Offline'}</span>
            </div>
          </div>
          <div className="h-8 w-px bg-border mx-2"></div>
          <Button 
            onClick={handleSyncAll} 
            disabled={isSyncing || !navigator.onLine || (stats.pending === 0 && stats.failed === 0)}
            className="flex items-center gap-2 bg-[#093C22] hover:bg-[#0c512e] text-white"
          >
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            Sync Now
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 border-0 shadow-sm">
          <div className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Pending</div>
          <div className="text-3xl font-bold text-primary">{stats.pending}</div>
        </Card>
        <Card className="p-4 border-0 shadow-sm">
          <div className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Failed</div>
          <div className="text-3xl font-bold text-primary">{stats.failed}</div>
        </Card>
        <Card className="p-4 border-0 shadow-sm">
          <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Synced</div>
          <div className="text-3xl font-bold text-primary">{stats.synced}</div>
        </Card>
      </div>

      <div className="space-y-8">
        {failedItems.length > 0 && (
          <section>
             <h2 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-3 flex items-center gap-2"><XCircle size={16}/> Failed Synchronization</h2>
             <Card className="overflow-hidden divide-y divide-border border-red-100">
               {failedItems.map((item) => (
                 <div key={item.id} onClick={() => setSelectedItem(item)} className="p-4 flex items-center justify-between hover:bg-red-50 cursor-pointer transition-colors bg-white">
                   <div>
                     <h3 className="text-sm font-bold text-primary capitalize">{item.survey_type.toLowerCase()} Survey</h3>
                     <p className="text-xs text-secondary mt-1">ID: <span className="font-mono">{item.id.slice(0,8)}</span></p>
                   </div>
                   <div className="flex items-center gap-4">
                     <span className="text-xs font-bold px-2 py-1 bg-red-100 text-red-700 rounded-md border border-red-200">Failed</span>
                     <ArrowRight size={16} className="text-muted" />
                   </div>
                 </div>
               ))}
             </Card>
          </section>
        )}

        {pendingItems.length > 0 && (
          <section>
             <h2 className="text-sm font-bold text-amber-600 uppercase tracking-wider mb-3 flex items-center gap-2"><Clock size={16}/> Pending Operations</h2>
             <Card className="overflow-hidden divide-y divide-border border-amber-100">
               {pendingItems.map((item) => (
                 <div key={item.id} onClick={() => setSelectedItem(item)} className="p-4 flex items-center justify-between hover:bg-amber-50 cursor-pointer transition-colors bg-white">
                   <div>
                     <h3 className="text-sm font-bold text-primary capitalize">{item.survey_type.toLowerCase()} Survey</h3>
                     <p className="text-xs text-secondary mt-1">ID: <span className="font-mono">{item.id.slice(0,8)}</span></p>
                   </div>
                   <div className="flex items-center gap-4">
                     <span className="text-xs font-bold px-2 py-1 bg-amber-100 text-amber-700 rounded-md border border-amber-200">Pending</span>
                     <ArrowRight size={16} className="text-muted" />
                   </div>
                 </div>
               ))}
             </Card>
          </section>
        )}

        {historyItems.length > 0 && (
          <section>
             <h2 className="text-sm font-bold text-emerald-700 uppercase tracking-wider mb-3 flex items-center gap-2"><CheckCircle size={16}/> Recent Activity</h2>
             <Card className="overflow-hidden divide-y divide-border">
               {historyItems.map((item) => (
                 <div key={item.id} onClick={() => setSelectedItem(item)} className="p-4 flex items-center justify-between hover:bg-page cursor-pointer transition-colors bg-white">
                   <div>
                     <h3 className="text-sm font-bold text-primary capitalize">{item.survey_type.toLowerCase()} Survey</h3>
                     <p className="text-xs text-secondary mt-1">ID: <span className="font-mono">{item.id.slice(0,8)}</span></p>
                   </div>
                   <div className="flex items-center gap-4">
                     <span className="text-xs font-medium text-muted">{new Date(item.updated_at).toLocaleString()}</span>
                     <ArrowRight size={16} className="text-gray-300" />
                   </div>
                 </div>
               ))}
             </Card>
          </section>
        )}

        {failedItems.length === 0 && pendingItems.length === 0 && historyItems.length === 0 && (
          <div className="bg-page rounded-xl border border-border border-dashed p-12 text-center flex flex-col items-center">
            <CheckCircle size={32} className="text-emerald-500 mb-3 opacity-50" />
            <h3 className="text-lg font-bold text-primary mb-1">You are all caught up!</h3>
            <p className="text-muted font-medium text-sm">No recent activity or pending synchronizations.</p>
          </div>
        )}
      </div>
      
      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-md overflow-hidden flex flex-col border-0">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-page">
              <h2 className="font-bold text-primary">Record Details</h2>
              <button onClick={() => setSelectedItem(null)} className="p-2 -mr-2 text-muted hover:text-primary transition-colors">
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
                     <span className="text-xs font-bold px-2 py-1 bg-red-100 text-red-700 rounded-md border border-red-200">Failed</span>
                  ) : selectedItem.sync_status === 'pending' ? (
                     <span className="text-xs font-bold px-2 py-1 bg-amber-100 text-amber-700 rounded-md border border-amber-200">Pending Sync</span>
                  ) : (
                     <span className="text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md border border-emerald-200">Synced</span>
                  )}
                </div>
                
                <div className="text-muted font-medium mt-2">Updated:</div>
                <div className="col-span-2 mt-2 text-primary">{new Date(selectedItem.updated_at).toLocaleString()}</div>
              </div>

              {selectedItem.sync_error && (
                <Alert variant="destructive" title="Error Information">
                  <p className="text-sm font-mono break-all mt-1">{selectedItem.sync_error}</p>
                </Alert>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-border bg-page flex justify-end gap-3">
              <Button 
                variant="outline"
                onClick={() => setSelectedItem(null)}
              >
                Close
              </Button>
              
              {(selectedItem.sync_status === 'pending' || selectedItem.sync_status === 'failed') && (
                <Button 
                  variant="default"
                  onClick={() => handleSyncSingle(selectedItem)}
                  disabled={isSyncing}
                  className="flex items-center gap-2 bg-[#093C22] hover:bg-[#0c512e] text-white"
                >
                  <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
                  {isSyncing ? "Syncing..." : (selectedItem.sync_status === 'failed' ? "Retry Sync" : "Sync Now")}
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

