import { api } from './api';
import { db, LocalSurvey } from './db';

export const syncEngine = {
  isSyncing: false,

  async processQueue(token: string) {
    if (!navigator.onLine || this.isSyncing) return;
    this.isSyncing = true;

    try {
      // Get all pending or failed surveys
      const queueItems = await db.surveys
        .where('sync_status')
        .anyOf(['pending', 'failed'])
        .toArray();

      if (queueItems.length === 0) return;

      // Mark as syncing locally so UI updates
      for (const item of queueItems) {
        await db.surveys.update(item.id, { sync_status: 'syncing' });
      }

      // Map to payload format
      const surveysPayload = queueItems.map(item => ({
        survey_id: item.id,
        survey_type: item.survey_type,
        community_id: item.community_id,
        house_number: item.house_number,
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
        if (result.success) {
          await db.surveys.update(result.client_id, {
            sync_status: 'synced',
            sync_error: undefined,
            house_number: result.house_number // Update with server generated house number
          });
        } else {
          await db.surveys.update(result.client_id, {
            sync_status: 'failed',
            sync_error: result.error
          });
        }
      }
    } catch (error: any) {
      console.error("Sync Engine Error:", error);
      // Revert syncing items back to failed
      const syncingItems = await db.surveys.where('sync_status').equals('syncing').toArray();
      for (const item of syncingItems) {
        await db.surveys.update(item.id, {
          sync_status: 'failed',
          sync_error: error.message || "Network error during sync"
        });
      }
    } finally {
      this.isSyncing = false;
      // Emit event so UI can re-render
      window.dispatchEvent(new Event('sync-completed'));
    }
  },

  async queueSurvey(survey: LocalSurvey, token: string) {
    // Save or update in IndexedDB
    survey.sync_status = 'pending';
    survey.updated_at = new Date().toISOString();
    
    const existing = await db.surveys.get(survey.id);
    if (existing) {
      await db.surveys.update(survey.id, survey);
    } else {
      await db.surveys.add(survey);
    }

    // Emit event so UI updates immediately
    window.dispatchEvent(new Event('sync-queued'));

    // Trigger background sync if online
    if (navigator.onLine) {
      this.processQueue(token);
    }
  }
};
