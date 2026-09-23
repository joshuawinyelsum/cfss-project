import { api } from './api';
import { db, SyncOperation } from './db';
import { useAuthStore } from './store';

export const syncEngine = {
  isSyncing: false,

  async processQueue(token: string) {
    if (!navigator.onLine || this.isSyncing) return;
    this.isSyncing = true;
    const userId = useAuthStore.getState().user?.id;

    if (!userId) {
      this.isSyncing = false;
      return;
    }

    try {
      const userOperations = await db.sync_operations.where('student_id').equals(userId).toArray();
      const queueItems = userOperations
        .filter(op => op.status === 'PENDING' || op.status === 'FAILED')
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      if (queueItems.length === 0) {
        this.isSyncing = false;
        return;
      }

      for (const item of queueItems) {
        await db.sync_operations.update(item.id, { status: 'SYNCING' });
        // Also reflect syncing state on survey if it exists
        if (item.operation_type !== 'DELETE') {
            await db.surveys.update(item.entity_id, { sync_status: 'syncing' });
        }
      }

      const operationsPayload = queueItems.map(item => ({
        operation_id: item.id,
        operation_type: item.operation_type,
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        payload: item.payload,
        created_at: item.created_at
      }));

      const res = await api.post('/api/sync/operations', { operations: operationsPayload }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const results = res.data.results;
      for (const result of results) {
        const op = queueItems.find(q => q.id === result.operation_id);
        if (!op) continue;

        if (result.success) {
          await db.sync_operations.delete(op.id);

          if (op.operation_type === 'DELETE') {
            await db.surveys.delete(op.entity_id);
          } else {
            const survey = await db.surveys.get(op.entity_id);
            if (survey) {
              // If not overwritten by another pending op
              if (survey.sync_status === 'syncing') {
                await db.surveys.update(op.entity_id, {
                  sync_status: 'synced',
                  sync_error: undefined,
                  entity_id: result.house_number || survey.entity_id
                });
              } else {
                await db.surveys.update(op.entity_id, {
                  entity_id: result.house_number || survey.entity_id
                });
              }
            }
          }
        } else {
          const isFatal = result.error?.includes('400') || result.error?.includes('403') || result.error?.includes('Cannot revert') || result.error?.includes('Cannot update a deleted');
          
          if (isFatal) {
             // We drop the operation to avoid infinite retry loop
             await db.sync_operations.delete(op.id);
             if (op.operation_type !== 'DELETE') {
                 await db.surveys.update(op.entity_id, { sync_status: 'failed', sync_error: "Fatal: " + result.error });
             }
          } else {
             // Recoverable (Network/500/timeout)
             await db.sync_operations.update(op.id, {
               status: 'FAILED',
               last_error: result.error,
               retry_count: (op.retry_count || 0) + 1
             });
             if (op.operation_type !== 'DELETE') {
                 await db.surveys.update(op.entity_id, { sync_status: 'failed', sync_error: result.error });
             }
          }
        }
      }
    } catch (error: unknown) {
      console.error("Sync Engine Error:", error);
      
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) {
        useAuthStore.getState().logout();
      }

      const userOperations = await db.sync_operations.where('student_id').equals(userId).toArray();
      const syncingItems = userOperations.filter(s => s.status === 'SYNCING');
      for (const item of syncingItems) {
        await db.sync_operations.update(item.id, {
          status: 'FAILED',
          last_error: axiosErr.response?.status === 401 ? "Session expired." : "Network error"
        });
        if (item.operation_type !== 'DELETE') {
           await db.surveys.update(item.entity_id, { sync_status: 'failed' });
        }
      }
    } finally {
      this.isSyncing = false;
      window.dispatchEvent(new Event('sync-completed'));

      if (userId) {
        const userOperationsAfter = await db.sync_operations.where('student_id').equals(userId).toArray();
        const hasPending = userOperationsAfter.some(s => s.status === 'PENDING');
        if (hasPending && navigator.onLine) {
          this.processQueue(token);
        }
      }
    }
  },

  async queueOperation(operationType: 'CREATE' | 'UPDATE' | 'DELETE', entityId: string, payload: Record<string, unknown> | null, token: string) {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    // A delete is terminal for this local record. Do not let a late form save
    // recreate it while its deletion is waiting to be acknowledged.
    const existingOps = await db.sync_operations.where('entity_id').equals(entityId).toArray();
    if (operationType !== 'DELETE' && existingOps.some(op => op.operation_type === 'DELETE')) {
        return;
    }

    if (operationType !== 'DELETE' && payload) {
        payload.sync_status = 'pending';
        payload.updated_at = new Date().toISOString();
        await db.surveys.put(payload as unknown as import('./db').LocalSurvey);
    }

    // Coalescing logic
    const pendingOps = existingOps.filter(op => op.status === 'PENDING' || op.status === 'FAILED');

    if (operationType === 'DELETE') {
       // If there's a pending CREATE that never reached the server, just delete locally
       const hasCreate = pendingOps.some(o => o.operation_type === 'CREATE');
       
       for (const op of pendingOps) {
           await db.sync_operations.delete(op.id);
       }
       
       if (hasCreate) {
           await db.surveys.delete(entityId);
           window.dispatchEvent(new Event('sync-queued'));
           return; // Stop here, no need to tell the server
       } else {
           // Mark local survey as pending delete so UI can hide it
           await db.surveys.update(entityId, { sync_status: 'pending', status: 'DELETED' });
       }
    } else if (operationType === 'UPDATE') {
       const hasCreate = pendingOps.find(o => o.operation_type === 'CREATE');
       if (hasCreate) {
           // Coalesce into the existing CREATE
           await db.sync_operations.update(hasCreate.id, { payload: payload === null ? undefined : payload, status: 'PENDING' });
           for (const op of pendingOps) {
               if (op.id !== hasCreate.id) await db.sync_operations.delete(op.id);
           }
           window.dispatchEvent(new Event('sync-queued'));
           if (navigator.onLine) this.processQueue(token);
           return;
       }
       
       const hasUpdate = pendingOps.find(o => o.operation_type === 'UPDATE');
       if (hasUpdate) {
           // Coalesce into existing UPDATE
           await db.sync_operations.update(hasUpdate.id, { payload: payload === null ? undefined : payload, status: 'PENDING' });
           window.dispatchEvent(new Event('sync-queued'));
           if (navigator.onLine) this.processQueue(token);
           return;
       }
    }

    // If no coalescing, add new operation
    const op: SyncOperation = {
        id: crypto.randomUUID(),
        student_id: userId,
        operation_type: operationType,
        entity_type: 'SURVEY',
        entity_id: entityId,
        payload: payload === null ? undefined : payload,
        status: 'PENDING',
        retry_count: 0,
        created_at: new Date().toISOString()
    };
    
    await db.sync_operations.put(op);
    window.dispatchEvent(new Event('sync-queued'));

    if (navigator.onLine) {
      this.processQueue(token);
    }
  }
};
