import Dexie, { type EntityTable } from 'dexie';

export interface LocalSurvey {
  student_id: number;
  id: string; // Generated client-side (UUID)
  survey_type: string;
  community_id: number;
  entity_id: string | null;
  answers: { question_id: string; answer: any }[];
  status: 'DRAFT' | 'SUBMITTED' | 'DELETED';
  sync_status: 'pending' | 'syncing' | 'synced' | 'failed';
  sync_error?: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
}

export interface LocalSurveyDefinition {
  type: string;
  questions: any[];
  updated_at: string;
}

export interface SyncOperation {
  id: string; // uuid for the operation
  student_id: number;
  operation_type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity_type: 'SURVEY';
  entity_id: string; // Survey UUID
  payload?: any;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  retry_count: number;
  last_error?: string;
  created_at: string;
}

class CFSSDatabase extends Dexie {
  surveys!: EntityTable<LocalSurvey, 'id'>;
  definitions!: EntityTable<LocalSurveyDefinition, 'type'>;
  sync_operations!: EntityTable<SyncOperation, 'id'>;

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

    // Version 5 adds definitions for offline survey schema access
    this.version(5).stores({
      surveys: 'id, student_id, survey_type, status, sync_status, updated_at',
      definitions: 'type'
    });

    // Version 6 adds explicit sync_operations queue
    this.version(6).stores({
      surveys: 'id, student_id, survey_type, status, sync_status, updated_at',
      definitions: 'type',
      sync_operations: 'id, student_id, operation_type, entity_id, status, created_at'
    });
  }
}

export const db = new CFSSDatabase();
