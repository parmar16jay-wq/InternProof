from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Enum,
    TIMESTAMP,
    Date,
    DateTime,
    Boolean,
    ForeignKey,
    UniqueConstraint,
)

from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from datetime import datetime

from database import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("college_id", "roll_number", name="uq_student_college_roll"),)

    id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True
    )

    full_name = Column(
        String(100),
        nullable=False
    )

    email = Column(
        String(150),
        unique=True,
        nullable=False,
        index=True
    )

    password_hash = Column(
        String(255),
        nullable=False
    )

    role = Column(
        Enum(
            "admin",
            "student",
            "company",
            "college"
        ),
        nullable=False
    )

    company_code = Column(String(40), unique=True, nullable=True, index=True)
    company_verified = Column(Boolean, nullable=False, default=False, server_default="0")
    company_verification_status = Column(String(20), nullable=False, default="pending", server_default="pending")
    company_verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    company_verified_at = Column(DateTime, nullable=True)

    # Student affiliation is tied to a registered college account. Selecting a
    # college creates a pending request; only that college can verify it.
    college_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    college_code = Column(String(40), unique=True, nullable=True, index=True)
    roll_number = Column(String(80), nullable=True, index=True)
    department = Column(String(150), nullable=True)
    course = Column(String(150), nullable=True)
    year = Column(String(40), nullable=True)
    semester = Column(String(40), nullable=True)
    college_verification_status = Column(String(30), nullable=False, default="not_requested", server_default="not_requested")
    college_verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    college_verified_at = Column(DateTime, nullable=True)
    college_rejection_reason = Column(Text, nullable=True)

    created_at = Column(
        TIMESTAMP,
        server_default=func.current_timestamp()
    )

    internships = relationship(
        "Internship",
        back_populates="creator"
    )

    password_reset_tokens = relationship(
        "PasswordResetToken",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    applications = relationship(
        "Application",
        back_populates="student",
        cascade="all, delete-orphan"
    )

    tasks = relationship(
        "Task",
        back_populates="student",
        cascade="all, delete-orphan"
    )

    auth_sessions = relationship("AuthSession", back_populates="user", cascade="all, delete-orphan")


class Internship(Base):
    __tablename__ = "internships"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True
    )

    title = Column(
        String(200),
        nullable=False
    )

    description = Column(
        Text,
        nullable=False
    )

    company_name = Column(
        String(200),
        nullable=False
    )

    location = Column(
        String(150),
        nullable=True
    )

    start_date = Column(
        Date,
        nullable=True
    )

    end_date = Column(
        Date,
        nullable=True
    )

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    status = Column(
        String(50),
        nullable=False,
        default="active"
    )

    creator = relationship(
        "User",
        back_populates="internships"
    )

    applications = relationship(
        "Application",
        back_populates="internship",
        cascade="all, delete-orphan"
    )

    tasks = relationship(
        "Task",
        back_populates="internship",
        cascade="all, delete-orphan"
    )


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    token = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )

    expires_at = Column(
        TIMESTAMP,
        nullable=False
    )

    created_at = Column(
        TIMESTAMP,
        server_default=func.current_timestamp()
    )

    user = relationship(
        "User",
        back_populates="password_reset_tokens"
    )


class Application(Base):
    __tablename__ = "applications"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True
    )

    student_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    internship_id = Column(
        Integer,
        ForeignKey("internships.id"),
        nullable=False
    )

    status = Column(
        Enum(
            "pending",
            "accepted",
            "rejected"
        ),
        nullable=False,
        default="pending"
    )

    applied_at = Column(
        TIMESTAMP,
        server_default=func.current_timestamp()
    )

    student = relationship(
        "User",
        back_populates="applications"
    )

    internship = relationship(
        "Internship",
        back_populates="applications"
    )


class Task(Base):
    __tablename__ = "tasks"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True
    )

    title = Column(
        String(200),
        nullable=False
    )

    description = Column(
        Text,
        nullable=False
    )

    due_date = Column(
        Date,
        nullable=True
    )

    status = Column(String(30), nullable=False, default="assigned")

    student_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    internship_id = Column(
        Integer,
        ForeignKey("internships.id"),
        nullable=False
    )

    created_at = Column(
        TIMESTAMP,
        server_default=func.current_timestamp()
    )

    started_at = Column(DateTime, nullable=True)

    student = relationship(
        "User",
        back_populates="tasks"
    )

    internship = relationship(
        "Internship",
        back_populates="tasks"
    )

    submissions = relationship("TaskSubmission", back_populates="task", cascade="all, delete-orphan", order_by="TaskSubmission.submitted_at")


class AuthSession(Base):
    __tablename__ = "auth_sessions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String(128), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.current_timestamp())
    user = relationship("User", back_populates="auth_sessions")


class TaskSubmission(Base):
    __tablename__ = "task_submissions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    submission_description = Column(Text, nullable=False)
    evidence_file_path = Column(String(500), nullable=True)
    evidence_file_name = Column(String(255), nullable=True)
    evidence_file_hash = Column(String(64), nullable=True)
    evidence_file_size = Column(Integer, nullable=True)
    github_url = Column(String(500), nullable=True)
    live_url = Column(String(500), nullable=True)
    submitted_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    status = Column(String(30), nullable=False, default="submitted")
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_comment = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.current_timestamp())
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    task = relationship("Task", back_populates="submissions")
    student = relationship("User", foreign_keys=[student_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True
    )

    student_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    internship_id = Column(
        Integer,
        ForeignKey("internships.id"),
        nullable=False
    )

    certificate_title = Column(
        String(200),
        nullable=False
    )

    certificate_number = Column(
        String(100),
        unique=True,
        nullable=False
    )

    issue_date = Column(
        Date,
        nullable=False
    )

    issued_by = Column(
        String(200),
        nullable=False
    )

    student = relationship(
        "User"
    )

    internship = relationship(
        "Internship"
    )


class MentorEvaluation(Base):
    __tablename__ = "mentor_evaluations"
    __table_args__ = (UniqueConstraint("internship_id", "student_id", name="uq_mentor_eval_internship_student"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    internship_id = Column(Integer, ForeignKey("internships.id"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    mentor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    evaluation = Column(Text, nullable=False)
    rating = Column(Integer, nullable=True)
    tasks_completed = Column(Integer, nullable=True)
    tasks_total = Column(Integer, nullable=True)
    approval_status = Column(String(20), nullable=False, default="pending")
    submitted_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    mentor = relationship("User", foreign_keys=[mentor_id])
    student = relationship("User", foreign_keys=[student_id])
    internship = relationship("Internship")


class CollegeInternshipReview(Base):
    __tablename__ = "college_internship_reviews"
    __table_args__ = (UniqueConstraint("internship_id", "student_id", name="uq_college_review_internship_student"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    internship_id = Column(Integer, ForeignKey("internships.id"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    college_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    status = Column(String(30), nullable=False, default="pending")
    evaluation_requested = Column(Boolean, nullable=False, default=False)
    evaluation_reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    evaluation_reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    internship = relationship("Internship")
    student = relationship("User", foreign_keys=[student_id])


class Message(Base):
    __tablename__ = "messages"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True
    )

    sender_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    receiver_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    message = Column(
        String(1000),
        nullable=False
    )

    sent_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    is_read = Column(
        Boolean,
        default=False
    )

    sender = relationship(
        "User",
        foreign_keys=[sender_id]
    )

    receiver = relationship(
        "User",
        foreign_keys=[receiver_id]
    )
