import Dexie, { type EntityTable } from 'dexie';

export interface LocalSurvey {
  id: string; // Generated client-side (UUID)
  survey_type: string;
  community_id: number;
  house_number: string | null;
  answers: { question_id: string; answer: any }[];
  status: 'DRAFT' | 'SUBMITTED';
  sync_status: 'pending' | 'syncing' | 'synced' | 'failed';
  sync_error?: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
}

class CFSSDatabase extends Dexie {
  surveys!: EntityTable<LocalSurvey, 'id'>;

  constructor() {
    super('CFSSDatabase');
    // Version 2 overhauls the schema for the new offline-first sync engine
    this.version(2).stores({
      surveys: 'id, survey_type, status, sync_status, updated_at'
    });
  }
}

export const db = new CFSSDatabase();
