from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime

class UserCreate(BaseModel):
    student_id: str
    password: str

class UserResponse(BaseModel):
    id: Union[str, int]
    student_id: str
    name: str
    email: Optional[str] = None
    faculty: Optional[str] = None
    program: Optional[str] = None
    gender: Optional[str] = None
    phone_number: Optional[str] = None
    level: Optional[int] = 100
    role: str
    community_id: Optional[str] = None
    community_name: Optional[str] = None
    group_label: Optional[str] = None
    group_number: Optional[int] = None
    district: Optional[str] = None
    region: Optional[str] = None
    
    class Config:
        from_attributes = True

class GroupMemberResponse(BaseModel):
    """Scoped response for student-facing group member list.
    Only exposes fields group peers are authorised to see.
    Phone numbers are visible to group members only — enforced at the API layer.
    """
    id: int
    student_id: str       # index number
    full_name: str        # maps from User.name
    faculty: Optional[str] = None
    program: Optional[str] = None  # department
    gender: Optional[str] = None
    phone_number: Optional[str] = None
    community_name: str
    group_number: int

    class Config:
        from_attributes = True



class WhitelistCreate(BaseModel):
    student_id: str
    name: str
    program: str
    batch_year: int
    level: int

class CommunityCreate(BaseModel):
    name: str
    district: str
    region: str
    capacity: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    spatial_metadata: Optional[Dict[str, Any]] = None

    @field_validator('spatial_metadata')
    @classmethod
    def validate_spatial_metadata(cls, v: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not v:
            return v
            
        if not isinstance(v, dict):
            raise ValueError("spatial_metadata must be a JSON object")
            
        if v.get("type") != "Feature":
            raise ValueError("spatial_metadata must be a GeoJSON Feature")
            
        geometry = v.get("geometry")
        if not geometry or not isinstance(geometry, dict):
            raise ValueError("GeoJSON Feature must contain a geometry object")
            
        geom_type = geometry.get("type")
        if geom_type not in ("Polygon", "MultiPolygon"):
            raise ValueError(f"Geometry type must be Polygon or MultiPolygon, got {geom_type}")
            
        coords = geometry.get("coordinates")
        if not coords or not isinstance(coords, list) or len(coords) == 0:
            raise ValueError("Geometry coordinates must be a non-empty array")
            
        # Basic validation for Polygon rings
        if geom_type == "Polygon":
            for ring in coords:
                if not isinstance(ring, list) or len(ring) < 4:
                    raise ValueError("Each LinearRing in a Polygon must have at least 4 positions")
                first_pos = ring[0]
                last_pos = ring[-1]
                if first_pos != last_pos:
                    raise ValueError("LinearRing is not closed (first and last positions do not match)")
                for pos in ring:
                    if not isinstance(pos, list) or len(pos) < 2:
                        raise ValueError("Positions must be arrays of [longitude, latitude]")
                    lng, lat = pos[0], pos[1]
                    if not (isinstance(lng, (int, float)) and -180 <= lng <= 180):
                        raise ValueError(f"Invalid longitude: {lng}")
                    if not (isinstance(lat, (int, float)) and -90 <= lat <= 90):
                        raise ValueError(f"Invalid latitude: {lat}")

        return v

class CommunityResponse(BaseModel):
    id: str
    name: str
    district: str
    region: str
    capacity: int
    student_count: int = 0
    slots_remaining: int = 0
    group_number: int
    group_label: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    spatial_metadata: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True

class SettingsBase(BaseModel):
    registration_open: bool
    max_students_per_community: int = Field(default=10, ge=1)
    auto_assign_enabled: bool = Field(default=True)
    assignment_strategy: str = Field(default="balanced")
    survey_enabled: bool = Field(default=False)
    survey_deadline: Optional[datetime] = None
    allow_multiple_submissions: bool = Field(default=False)
    default_page_size: int = Field(default=100, ge=1)
    strict_gps_enforcement: bool = Field(default=False)

class SettingsUpdate(SettingsBase):
    admin_password: str
    registration_password: Optional[str] = None

class RegistrationToggleRequest(BaseModel):
    registration_enabled: bool
    admin_password: str


class AdminChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class SettingsResponse(SettingsBase):
    class Config:
        from_attributes = True

class SurveySubmission(BaseModel):
    unique_submission_id: str
    type: str
    data: Dict[str, Any]

class SurveyResponse(BaseModel):
    id: str
    unique_submission_id: str
    user_id: str
    community_id: str
    type: str
    status: str
    data: Dict[str, Any]
    created_at: datetime
    
    class Config:
        from_attributes = True

class AdminSurveyListResponse(BaseModel):
    id: str
    user_id: int
    student_id: str
    student_name: str
    student_email: str
    community_id: int
    community_name: str
    group_number: int
    submitted_at: datetime
    status: str
    type: str

class AdminSurveyDetailResponse(AdminSurveyListResponse):
    responses: Dict[str, Any]
    
class AdminSurveyStatsCommunity(BaseModel):
    community_name: str
    count: int

class AdminSurveyStatsResponse(BaseModel):
    total_surveys: int
    by_community: List[AdminSurveyStatsCommunity]

class Token(BaseModel):
    access_token: str
    token_type: str

import re

class SystemUserRegister(BaseModel):
    studentId: str
    email: Optional[str] = None
    password: str

    @field_validator('studentId')
    @classmethod
    def validate_student_id(cls, v: str) -> str:
        if not re.match(r"^[A-Z]{3}/\d{4}/\d{4}$", v):
            raise ValueError("Student ID must be in the format ABC/1234/5678 (3 Uppercase Letters / 4 Digits / 4 Digits)")
        return v

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not re.match(r"^[\w\.-]+@[\w\.-]+\.\w+$", v):
            raise ValueError("Email must be a valid email address")
        return v

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.match(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$", v):
            raise ValueError('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
        return v

class SystemUserLogin(BaseModel):
    student_id: str
    password: str

class CheckIdRequest(BaseModel):
    studentId: str

    @field_validator('studentId')
    @classmethod
    def validate_student_id(cls, v: str) -> str:
        if not re.match(r"^[A-Z]{3}/\d{4}/\d{4}$", v):
            raise ValueError("Student ID must be in the format ABC/1234/5678 (3 Uppercase Letters / 4 Digits / 4 Digits)")
        return v

class StudentRegister(BaseModel):
    student_id: str
    password: str
    program: str

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v

class StudentLogin(BaseModel):
    student_id: str
    password: str

class StudentMeResponse(BaseModel):
    id: int
    student_id: str
    full_name: str
    email: Optional[str] = None
    faculty: Optional[str] = None
    gender: Optional[str] = None
    phone_number: Optional[str] = None
    program: str
    community: Optional[str] = None
    community_id: Optional[int] = None
    group_number: Optional[int] = None
    registered_at: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ThemeUpdate(BaseModel):
    theme: str

class SyncOperationItem(BaseModel):
    operation_id: str
    operation_type: str
    entity_type: str
    entity_id: str
    payload: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None

class SyncOperationsPayload(BaseModel):
    operations: List[SyncOperationItem]


class FieldFeatureBase(BaseModel):
    feature_type: str
    latitude: float
    longitude: float
    accuracy_meters: Optional[float] = None
    metadata_json: Optional[Dict[str, Any]] = None

class FieldFeatureCreate(FieldFeatureBase):
    id: str
    captured_at: Optional[datetime] = None

class FieldFeatureResponse(FieldFeatureBase):
    id: str
    community_id: int
    captured_by_id: int
    captured_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
