import re
from sqlalchemy import event
from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime, UniqueConstraint, Float
from sqlalchemy.dialects.postgresql import JSONB
import uuid
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String, nullable=False)
    faculty = Column(String, nullable=True)
    program = Column(String, nullable=True)
    gender = Column(String, nullable=True)       # Male | Female | Other — sourced from whitelist
    phone_number = Column(String, nullable=True) # Canonical contact number — sourced from whitelist
    level = Column(Integer, nullable=False)
    role = Column(String, nullable=False, default="student")
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    trace_id = Column(String, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    community_id = Column(Integer, ForeignKey("communities.id"), index=True, nullable=True) # Nullable for Admin only

    community = relationship("Community")


class Community(Base):
    __tablename__ = "communities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    district = Column(String, nullable=False, default="Unknown")
    region = Column(String, nullable=False, default="Unknown")
    capacity = Column(Integer, nullable=False)
    current_count = Column(Integer, nullable=False, default=0)
    group_number = Column(Integer, unique=True, nullable=False)

    # Spatial metadata
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    spatial_metadata = Column(JSONB, nullable=True) # boundary, area, centroid metadata

class WhitelistV2(Base):
    __tablename__ = "whitelists"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    status = Column(String, nullable=False, default="ARCHIVED") # ACTIVE | ARCHIVED | DELETED
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    uploaded_by = Column(String, nullable=True)

class WhitelistEntry(Base):
    __tablename__ = "whitelist_entries"

    id = Column(Integer, primary_key=True, index=True)
    whitelist_id = Column(Integer, ForeignKey("whitelists.id"), index=True, nullable=False)
    student_id = Column(String, index=True, nullable=True)
    full_name = Column(String, nullable=True)
    email = Column(String, index=True, nullable=True)
    faculty = Column(String, nullable=True)
    program = Column(String, nullable=True)
    gender = Column(String, nullable=True)       # Male | Female | Other
    phone_number = Column(String, nullable=True) # Required for new uploads
    level = Column(Integer, nullable=True)
    metadata_json = Column(JSONB, nullable=True)


class Survey(Base):
    __tablename__ = "surveys"

    id = Column(Integer, primary_key=True, index=True)
    unique_submission_id = Column(String, unique=True, index=True, nullable=False) # UUID for deduplication
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    community_id = Column(Integer, ForeignKey("communities.id"), index=True, nullable=False)
    type = Column(String, index=True, nullable=False) # 'household', 'education', 'health', 'governance'
    status = Column(String, nullable=False, default="submitted")
    data = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SystemSettings(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    registration_open = Column(Boolean, default=False)
    max_students_per_community = Column(Integer, default=10)
    auto_assign_enabled = Column(Boolean, default=True)
    assignment_strategy = Column(String, default="balanced")
    survey_enabled = Column(Boolean, default=False)
    survey_deadline = Column(DateTime(timezone=True), nullable=True)
    allow_multiple_submissions = Column(Boolean, default=False)
    default_page_size = Column(Integer, default=100)

class IdempotencyKey(Base):
    __tablename__ = "idempotency_keys"

    key = Column(String, primary_key=True)
    status = Column(String, nullable=False) # PROCESSING | SUCCESS | FAILED
    locked_until = Column(DateTime(timezone=True), nullable=True)
    lock_owner_id = Column(String, nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    response_payload = Column(JSONB, nullable=True)
    trace_id = Column(String, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    trace_id = Column(String, index=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, nullable=False)
    user_id = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    metadata_payload = Column(JSONB, nullable=True)
    trace_id = Column(String, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class SurveyCounter(Base):
    __tablename__ = "survey_counters"
    __table_args__ = (UniqueConstraint('community_id', 'survey_type', name='uq_survey_counters_comm_type'),)

    id = Column(Integer, primary_key=True, index=True)
    community_id = Column(Integer, ForeignKey("communities.id"), nullable=False, index=True)
    survey_type = Column(String, nullable=False, index=True)
    last_count = Column(Integer, default=0, nullable=False)

class SurveyRecord(Base):
    __tablename__ = "survey_records"
    __table_args__ = (UniqueConstraint('community_id', 'survey_type', 'entity_id', name='uq_survey_record_entity'),)

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    community_id = Column(Integer, ForeignKey("communities.id"), nullable=False, index=True)
    created_by_student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    survey_type = Column(String, nullable=False, index=True) # HOUSEHOLD, EDUCATION, HEALTH, GOVERNANCE
    entity_id = Column(String, nullable=False, index=True)
    field_feature_id = Column(String, ForeignKey("field_features.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(String, nullable=False, default="DRAFT") # DRAFT, SUBMITTED, DELETED
    sync_status = Column(String, nullable=False, default="synced") # pending, syncing, synced, failed
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    sync_error = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

class AdminNotification(Base):
    __tablename__ = "admin_notifications"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False, index=True) # sync_success, survey_submit
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SurveyQuestion(Base):
    __tablename__ = "survey_questions"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    survey_type = Column(String, nullable=False, index=True)
    section = Column(String, nullable=False)
    question_text = Column(String, nullable=False)
    question_type = Column(String, nullable=False) # text, number, select, radio, checkbox, date
    options = Column(JSONB, nullable=True)
    required = Column(Boolean, default=False)
    order_number = Column(Integer, nullable=False, default=0)

class SurveyAnswer(Base):
    __tablename__ = "survey_answers"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    survey_record_id = Column(String, ForeignKey("survey_records.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(String, ForeignKey("survey_questions.id"), nullable=False)
    answer = Column(JSONB, nullable=True)


@event.listens_for(User, "before_insert")
@event.listens_for(User, "before_update")
def normalize_user_fields(mapper, connection, target):
    if target.student_id:
        target.student_id = target.student_id.strip().upper()
    if target.program:
        target.program = re.sub(r'\s+', ' ', target.program.strip().lower())

class StudentPreference(Base):
    __tablename__ = "student_preferences"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    theme = Column(String, default="light")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
import datetime

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class FieldFeature(Base):
    __tablename__ = "field_features"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    community_id = Column(Integer, ForeignKey("communities.id", ondelete="CASCADE"), nullable=False, index=True)
    feature_type = Column(String, nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    accuracy_meters = Column(Float, nullable=True)
    captured_by_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    metadata_json = Column(JSONB, nullable=True)
    captured_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
