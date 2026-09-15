import { api } from './api';
import { db, LocalSurvey } from './db';
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
      // Get all pending or failed surveys for the current user
      const userSurveys = await db.surveys.where('student_id').equals(userId).toArray();
      const queueItems = userSurveys.filter(s => s.sync_status === 'pending' || s.sync_status === 'failed');

      if (queueItems.length === 0) {
        this.isSyncing = false;
        return;
      }

      // Mark as syncing locally so UI updates
      for (const item of queueItems) {
        await db.surveys.update(item.id, { sync_status: 'syncing' });
      }

      // Map to payload format
      const surveysPayload = queueItems.map(item => ({
        survey_id: item.id,
        survey_type: item.survey_type,
        community_id: item.community_id,
        house_number: item.entity_id, // keep payload key as house_number for backward compatibility with older servers
        answers: item.answers,
        status: item.status,
        submitted_at: item.submitted_at,
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

      // Send to backend
      const res = await api.post('/api/sync/surveys', { surveys: surveysPayload }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update local db with results
      const results = res.data.results;
      for (const result of results) {
        const currentRecord = await db.surveys.get(result.client_id);
        if (!currentRecord) continue;

        if (result.success) {
          // Check if it was modified (e.g. submitted) while this sync was in flight
          if (currentRecord.sync_status === 'syncing') {
            await db.surveys.update(result.client_id, {
              sync_status: 'synced',
              sync_error: undefined,
              entity_id: result.house_number // Update with server generated entity_id
            });
          } else {
            // It was queued again (pending) while we were syncing. Just update entity_id.
            await db.surveys.update(result.client_id, {
              entity_id: result.house_number
            });
          }
        } else {
          // If it failed, only revert to failed if it wasn't re-queued
          if (currentRecord.sync_status === 'syncing') {
            await db.surveys.update(result.client_id, {
              sync_status: 'failed',
              sync_error: result.error
            });
          }
        }
      }
    } catch (error: any) {
      console.error("Sync Engine Error:", error);
      
      // If unauthorized, do not delete data, just fail the sync to force re-auth
      if (error.response?.status === 401) {
        useAuthStore.getState().logout();
      }

      // Revert syncing items back to failed
      const userSurveys = await db.surveys.where('student_id').equals(userId).toArray();
      const syncingItems = userSurveys.filter(s => s.sync_status === 'syncing');
      for (const item of syncingItems) {
        await db.surveys.update(item.id, {
          sync_status: 'failed',
          sync_error: error.response?.status === 401 ? "Session expired. Please log in again." : (error.message || "Network error during sync")
        });
      }
    } finally {
      this.isSyncing = false;
      // Emit event so UI can re-render
      window.dispatchEvent(new Event('sync-completed'));

      // Check if any items were queued while this sync was running
      if (userId) {
        const userSurveysAfter = await db.surveys.where('student_id').equals(userId).toArray();
        const hasPending = userSurveysAfter.some(s => s.sync_status === 'pending');
        if (hasPending && navigator.onLine) {
          this.processQueue(token);
        }
      }
    }
  },

  async queueSurvey(survey: LocalSurvey, token: string) {
    const userId = useAuthStore.getState().user?.id;
    if (userId && survey.student_id !== userId) {
      console.error("Attempted to queue survey belonging to a different user.");
      return;
    }

    // Save or update in IndexedDB
    survey.sync_status = 'pending';
    survey.updated_at = new Date().toISOString();
    
    // put() inserts or fully replaces - .update() rejects a whole LocalSurvey
    // because Dexie expects a partial update spec, not the complete record.
    await db.surveys.put(survey);

    // Emit event so UI updates immediately
    window.dispatchEvent(new Event('sync-queued'));

    // Trigger background sync if online
    if (navigator.onLine) {
      this.processQueue(token);
    }
  }
};
