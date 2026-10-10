
// Helper for typesafe store access
const getStore = (type: string) => type === 'COMMUNITY' ? db.communities : (type === 'FEATURE' ? db.features : db.surveys);
const getId = (type: string, id: string) => type === 'COMMUNITY' ? parseInt(id) : id;
import { api } from './api';
import { db, SyncOperation } from './db';
import { useAuthStore } from './store';

export const syncEngine = {
  isSyncing: false,


  async prefetchTemplates(token: string) {
    if (!navigator.onLine) return;
    try {
      const types = ['HOUSEHOLD', 'EDUCATION', 'HEALTH', 'GOVERNANCE'];
      for (const typeStr of types) {
        try {
          const res = await api.get('/api/student/surveys/questions', {
            params: { type: typeStr },
            headers: { Authorization: `Bearer ${token}` }
          });
          const questionsData = res.data;
          const { normalizeSurveyType } = await import('@/lib/surveyType');
          const normalizedType = normalizeSurveyType(typeStr);
          await db.definitions.put({
            type: normalizedType,
            questions: questionsData,
            updated_at: new Date().toISOString()
          });
        } catch (err) {
          console.warn(`Failed to prefetch template ${typeStr}`, err);
        }
      }
    } catch (e) {
      console.error("Template prefetch error", e);
    }
  },

  async processQueue(token: string) {
    if (!navigator.onLine || this.isSyncing) return;
    this.isSyncing = true;
    const userId = useAuthStore.getState().user?.id;

    if (!userId) {
      this.isSyncing = false;
      return;
    }

    try {
      // First, recover any orphaned SYNCING items from a previous crash
      const allOps = await db.sync_operations.where('student_id').equals(userId).toArray();
      const orphanSyncing = allOps.filter(op => op.status === 'SYNCING');
      for (const orphan of orphanSyncing) {
         await db.sync_operations.update(orphan.id, { status: 'PENDING' });
      }

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
            const store = getStore(item.entity_type);
            await (store as any).update(getId(item.entity_type, item.entity_id), { sync_status: 'syncing' });
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
          await db.transaction('rw', [db.surveys, db.features, db.communities, db.sync_operations], async () => {
            await db.sync_operations.delete(op.id);

            if (op.operation_type === 'DELETE') {
              if (op.entity_type === 'FEATURE') {
                await db.features.delete(op.entity_id);
              } else {
                await db.surveys.delete(op.entity_id);
              }
            } else {
              const store = getStore(op.entity_type);
              const targetId = getId(op.entity_type, op.entity_id);
              const record = await (store as any).get(targetId);
              if (record) {
                const updates: any = {
                  entity_id: result.house_number || record.entity_id,
                  server_synced: true,
                  sync_status: 'synced',
                  sync_error: undefined
                };
                await (store as any).update(targetId, updates);
              }
            }
          });
        } else {
          const isFatal = result.error?.includes('400') || result.error?.includes('403') || result.error?.includes('Cannot revert') || result.error?.includes('Cannot update a deleted');
          
          if (isFatal) {
             // We drop the operation to avoid infinite retry loop
             await db.sync_operations.delete(op.id);
             if (op.operation_type !== 'DELETE') {
                 const store = getStore(op.entity_type);
                 await (store as any).update(getId(op.entity_type, op.entity_id), { sync_status: 'failed', sync_error: "Fatal: " + result.error });
             }
          } else {
             // Recoverable (Network/500/timeout)
             await db.sync_operations.update(op.id, {
               status: 'FAILED',
               last_error: result.error,
               retry_count: (op.retry_count || 0) + 1
             });
             if (op.operation_type !== 'DELETE') {
                 const store = getStore(op.entity_type);
                 await (store as any).update(getId(op.entity_type, op.entity_id), { sync_status: 'failed', sync_error: result.error });
             }
          }
        }
      }

      // Handle items that the server didn't respond to
      const respondedIds = new Set(results.map((r: any) => r.operation_id));
      for (const item of queueItems) {
        if (!respondedIds.has(item.id)) {
           await db.sync_operations.update(item.id, {
             status: 'FAILED',
             last_error: "Server did not respond for this operation",
             retry_count: (item.retry_count || 0) + 1
           });
           if (item.operation_type !== 'DELETE') {
               const store = getStore(item.entity_type);
               await (store as any).update(getId(item.entity_type, item.entity_id), { sync_status: 'failed', sync_error: "Server did not respond" });
           }
        }
      }
    } catch (error: unknown) {
      console.error("Sync Engine Error:", error);
      
      const axiosErr = error as { response?: { status?: number, data?: unknown }, message?: string };
      if (axiosErr.response?.status === 401) {
        useAuthStore.getState().logout();
      }

      const errorMsg = axiosErr.response?.status === 401
        ? "Session expired."
        : (axiosErr.response?.data ? JSON.stringify(axiosErr.response.data) : (axiosErr.message || "Network error. Will retry when connected."));

      const userOperations = await db.sync_operations.where('student_id').equals(userId).toArray();
      const syncingItems = userOperations.filter(s => s.status === 'SYNCING');
      for (const item of syncingItems) {
        await db.sync_operations.update(item.id, {
          status: 'FAILED',
          last_error: errorMsg,
          retry_count: (item.retry_count || 0) + 1
        });
        if (item.operation_type !== 'DELETE') {
           const store = getStore(item.entity_type);
           await (store as any).update(getId(item.entity_type, item.entity_id), { sync_status: 'failed', sync_error: errorMsg });
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

  async queueOperation(operationType: 'CREATE' | 'UPDATE' | 'DELETE', entityType: 'SURVEY' | 'FEATURE' | 'COMMUNITY', entityId: string, payload: Record<string, unknown> | null, token: string) {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    // Atomically execute local entity write and sync operation queueing in a Dexie transaction
    await db.transaction('rw', [db.surveys, db.features, db.communities, db.sync_operations], async () => {
      const store = getStore(entityType);
      const targetId = getId(entityType, entityId);
      const existingOps = await db.sync_operations.where('entity_id').equals(entityId).toArray();

      // If a DELETE is already queued for this record, do not allow subsequent writes to recreate or update it
      if (operationType !== 'DELETE' && existingOps.some(op => op.operation_type === 'DELETE')) {
        return;
      }

      const pendingOps = existingOps.filter(op => op.status === 'PENDING' || op.status === 'FAILED' || op.status === 'SYNCING');

      if (operationType === 'DELETE') {
        const hasCreate = pendingOps.some(o => o.operation_type === 'CREATE');
        for (const op of pendingOps) {
          await db.sync_operations.delete(op.id);
        }

        if (hasCreate) {
          // Never reached the server, delete locally only
          await (store as any).delete(targetId);
          return;
        } else {
          // Already synced on server: mark as soft-deleted locally and queue server DELETE
          await (store as any).update(targetId, {
            sync_status: 'pending',
            status: 'DELETED',
            updated_at: new Date().toISOString()
          });
          const delOp: SyncOperation = {
            id: crypto.randomUUID(),
            student_id: userId,
            operation_type: 'DELETE',
            entity_type: entityType,
            entity_id: entityId,
            status: 'PENDING',
            retry_count: 0,
            created_at: new Date().toISOString()
          };
          await db.sync_operations.put(delOp);
        }
      } else {
        // CREATE or UPDATE
        if (payload) {
          payload.sync_status = 'pending';
          payload.updated_at = new Date().toISOString();
          await (store as any).put(payload);
        }

        // Check coalescing:
        const hasCreate = pendingOps.find(o => o.operation_type === 'CREATE');
        if (hasCreate) {
          // If there is an existing CREATE in the queue, this entity has not reached the server yet.
          // Therefore, any subsequent save/update MUST remain a CREATE operation!
          await db.sync_operations.update(hasCreate.id, {
            payload: payload === null ? undefined : payload,
            status: 'PENDING',
            last_error: undefined
          });
          for (const op of pendingOps) {
            if (op.id !== hasCreate.id) {
              await db.sync_operations.delete(op.id);
            }
          }
        } else {
          const hasUpdate = pendingOps.find(o => o.operation_type === 'UPDATE');
          if (hasUpdate) {
            await db.sync_operations.update(hasUpdate.id, {
              operation_type: operationType,
              payload: payload === null ? undefined : payload,
              status: 'PENDING',
              last_error: undefined
            });
            for (const op of pendingOps) {
              if (op.id !== hasUpdate.id) {
                await db.sync_operations.delete(op.id);
              }
            }
          } else {
            // New queue operation
            const op: SyncOperation = {
              id: crypto.randomUUID(),
              student_id: userId,
              operation_type: operationType,
              entity_type: entityType,
              entity_id: entityId,
              payload: payload === null ? undefined : payload,
              status: 'PENDING',
              retry_count: 0,
              created_at: new Date().toISOString()
            };
            await db.sync_operations.put(op);
          }
        }
      }
    });

    window.dispatchEvent(new Event('sync-queued'));

    if (navigator.onLine) {
      this.processQueue(token);
    }
  }
};
