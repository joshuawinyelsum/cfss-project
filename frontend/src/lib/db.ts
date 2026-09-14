import Dexie, { type EntityTable } from 'dexie';

export interface LocalSurvey {
  student_id: number;
  id: string; // Generated client-side (UUID)
  survey_type: string;
  community_id: number;
  entity_id: string | null;
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
    // Version 3 added student_id
    this.version(3).stores({
      surveys: 'id, student_id, survey_type, status, sync_status, updated_at'
    });
    
    // Version 4 renames house_number to entity_id for conceptual clarity
    this.version(4).stores({
      surveys: 'id, student_id, survey_type, status, sync_status, updated_at'
    }).upgrade(tx => {
      return tx.table('surveys').toCollection().modify(survey => {
        if (survey.house_number !== undefined) {
          survey.entity_id = survey.house_number;
          delete survey.house_number;
        }
      });
    });
  }
}

export const db = new CFSSDatabase();
