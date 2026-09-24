import Dexie, { type EntityTable } from 'dexie';

export interface LocalSurvey {
  student_id: number;
  id: string; // Generated client-side (UUID)
  survey_type: string;
  community_id: number;
  entity_id: string | null;
  field_feature_id?: string | null;
  answers: { question_id: string; answer: string | number | boolean | string[] | null }[];
  status: 'DRAFT' | 'SUBMITTED' | 'DELETED';
  sync_status: 'pending' | 'syncing' | 'synced' | 'failed';
  sync_error?: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
}

export interface LocalSurveyDefinition {
  type: string;
  questions: Record<string, unknown>[];
  updated_at: string;
}


export interface LocalFeature {
  id: string; // Generated client-side (UUID)
  student_id: number;
  community_id: number;
  feature_type: string;
  latitude: number;
  longitude: number;
  accuracy_meters?: number;
  metadata_json?: Record<string, unknown>;
  sync_status: 'pending' | 'syncing' | 'synced' | 'failed';
  sync_error?: string;
  captured_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LocalCommunity {
  id: number;
  name: string;
  latitude: number | null;
  longitude: number | null;
  spatial_metadata?: Record<string, unknown> | null;
  updated_at: string;
}
export interface SyncOperation {
  id: string; // uuid for the operation
  student_id: number;
  operation_type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity_type: 'SURVEY' | 'FEATURE';
  entity_id: string; // Entity UUID
  payload?: Record<string, unknown>;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  retry_count: number;
  last_error?: string;
  created_at: string;
}

class CFSSDatabase extends Dexie {
  surveys!: EntityTable<LocalSurvey, 'id'>;
  definitions!: EntityTable<LocalSurveyDefinition, 'type'>;
  features!: EntityTable<LocalFeature, 'id'>;
  communities!: EntityTable<LocalCommunity, 'id'>;
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

    // Version 7 adds spatial features for mapping
    this.version(7).stores({
      surveys: 'id, student_id, survey_type, status, sync_status, updated_at',
      definitions: 'type',
      features: 'id, student_id, feature_type, sync_status, updated_at',
      sync_operations: 'id, student_id, operation_type, entity_type, entity_id, status, created_at'
    });

        // Version 8 adds communities local store for offline spatial metadata
    this.version(8).stores({
      surveys: 'id, student_id, survey_type, status, sync_status, updated_at',
      definitions: 'type',
      features: 'id, student_id, feature_type, sync_status, updated_at',
      communities: 'id',
      sync_operations: 'id, student_id, operation_type, entity_type, entity_id, status, created_at'
    });

    // Version 9 adds community_id index to features for spatial map rendering
    this.version(9).stores({
      surveys: 'id, student_id, survey_type, status, sync_status, updated_at',
      definitions: 'type',
      features: 'id, student_id, community_id, feature_type, sync_status, updated_at',
      communities: 'id',
      sync_operations: 'id, student_id, operation_type, entity_type, entity_id, status, created_at'
    });
  }
}

export const db = new CFSSDatabase();
