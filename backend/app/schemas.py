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
    program: Optional[str] = None
    level: int
    role: str
    community_id: Optional[str] = None
    community_name: Optional[str] = None
    group_label: Optional[str] = None
    group_number: Optional[int] = None
    district: Optional[str] = None
    region: Optional[str] = None
    
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

class SettingsUpdate(SettingsBase):
    admin_password: str
    registration_password: Optional[str] = None

class RegistrationToggleRequest(BaseModel):
    registration_enabled: bool
    admin_password: str

class SettingsResponse(SettingsBase):
    pass

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
    student_email: str
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
    student_id: str
    full_name: str
    program: str
    community: Optional[str] = None
    group_number: Optional[int] = None
    registered_at: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ThemeUpdate(BaseModel):
    theme: str
