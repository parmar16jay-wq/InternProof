from pydantic import BaseModel, EmailStr
from typing import Literal
from datetime import date, datetime


class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: Literal[
        "student",
        "company",
        "college"
    ]


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class InternshipCreateRequest(BaseModel):
    title: str
    description: str
    company_name: str
    location: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    created_by: int
    status: str = "active"


class InternshipResponse(BaseModel):
    id: int
    title: str
    description: str
    company_name: str
    location: str | None
    start_date: date | None
    end_date: date | None
    created_by: int
    status: str

    class Config:
        from_attributes = True


class ApplicationCreateRequest(BaseModel):
    student_id: int
    internship_id: int


class ApplicationResponse(BaseModel):
    id: int
    student_id: int
    internship_id: int
    status: str
    applied_at: datetime | None

    class Config:
        from_attributes = True


class TaskCreateRequest(BaseModel):
    title: str
    description: str
    due_date: date | None = None
    student_id: int
    internship_id: int


class TaskResponse(BaseModel):
    id: int
    title: str
    description: str
    due_date: date | None
    status: str
    student_id: int
    internship_id: int
    created_at: datetime | None

    class Config:
        from_attributes = True


class TaskStatusUpdateRequest(BaseModel):
    status: Literal[
        "pending",
        "completed"
    ]


class CertificateCreateRequest(BaseModel):
    student_id: int
    internship_id: int
    certificate_title: str
    certificate_number: str
    issue_date: date
    issued_by: str


class CertificateResponse(BaseModel):
    id: int
    student_id: int
    internship_id: int
    certificate_title: str
    certificate_number: str
    issue_date: date
    issued_by: str

    class Config:
        from_attributes = True

# =========================================================
# MESSAGE / COMMUNICATION SCHEMAS
# =========================================================

class MessageCreateRequest(BaseModel):
    sender_id: int
    receiver_id: int
    message: str


class MessageResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    message: str
    sent_at: datetime | None
    is_read: bool

    class Config:
        from_attributes = True