from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    UploadFile,
    File
    , Form, Header
)

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from sqlalchemy.orm import Session

from database import engine, Base, get_db

from models import (
    User,
    Internship,
    PasswordResetToken,
    Application,
    Task,
    Certificate,
    Message
    , AuthSession, TaskSubmission
)

from schemas import (
    RegisterRequest,
    LoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    InternshipCreateRequest,
    InternshipResponse,
    ApplicationCreateRequest,
    ApplicationResponse,
    TaskCreateRequest,
    TaskResponse,
    TaskStatusUpdateRequest,
    CertificateCreateRequest,
    CertificateResponse,
    MessageCreateRequest,
    MessageResponse
)

from pwdlib import PasswordHash

from datetime import datetime, timedelta
from hashlib import sha256
from pathlib import Path
from urllib.parse import urlparse

import secrets
import os
import shutil
import smtplib

from email.message import EmailMessage

from dotenv import load_dotenv


# =========================================================
# LOAD ENVIRONMENT VARIABLES
# =========================================================

load_dotenv()


# =========================================================
# PASSWORD HASHING
# =========================================================

password_hash = PasswordHash.recommended()

def create_session(db: Session, user: User) -> str:
    token = secrets.token_urlsafe(48)
    db.add(AuthSession(user_id=user.id, token=token, expires_at=datetime.utcnow() + timedelta(days=30)))
    db.commit()
    return token

def require_user(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> User:
    token = authorization.removeprefix("Bearer ").strip() if authorization else ""
    session = db.query(AuthSession).filter(AuthSession.token == token, AuthSession.expires_at > datetime.utcnow()).first()
    if not session:
        raise HTTPException(status_code=401, detail="Login required")
    return session.user

def require_role(user: User, role: str):
    if user.role != role:
        raise HTTPException(status_code=403, detail="Not authorized")
    return user

# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(
    title="InternProof API",
    description="Backend API for InternProof Internship Management System",
    version="1.0.0"
)

@app.get("/api/auth/me")
def current_user(user: User = Depends(require_user)):
    return {"user_id": user.id, "full_name": user.full_name, "email": user.email, "role": user.role,
            "company_verification_status": user.company_verification_status if user.role == "company" else None}


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# =========================================================
# CREATE DATABASE TABLES
# =========================================================

Base.metadata.create_all(bind=engine)

# Upgrade the legacy task enum and users table for existing installations.
try:
    with engine.begin() as connection:
        if engine.dialect.name == "mysql":
            from sqlalchemy import inspect
            user_columns = {column["name"] for column in inspect(engine).get_columns("users")}
            if "company_verified" not in user_columns:
                connection.exec_driver_sql("ALTER TABLE users ADD COLUMN company_verified BOOLEAN NOT NULL DEFAULT 0")
            if "company_verification_status" not in user_columns:
                connection.exec_driver_sql("ALTER TABLE users ADD COLUMN company_verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'")
            if "company_verified_by" not in user_columns:
                connection.exec_driver_sql("ALTER TABLE users ADD COLUMN company_verified_by INT NULL")
            if "company_verified_at" not in user_columns:
                connection.exec_driver_sql("ALTER TABLE users ADD COLUMN company_verified_at DATETIME NULL")
            connection.exec_driver_sql("ALTER TABLE tasks MODIFY status VARCHAR(30) NOT NULL DEFAULT 'assigned'")
            task_columns = {column["name"] for column in inspect(engine).get_columns("tasks")}
            if "started_at" not in task_columns:
                connection.exec_driver_sql("ALTER TABLE tasks ADD COLUMN started_at DATETIME NULL")
            connection.exec_driver_sql("UPDATE tasks SET status='assigned' WHERE status='pending'")
            # Legacy completion was student-declared; it must not count as verified approval.
            connection.exec_driver_sql("UPDATE tasks SET status='in_progress' WHERE status='completed'")
            connection.exec_driver_sql("UPDATE users SET company_verification_status='verified' WHERE company_verified=1 AND company_verification_status='pending'")
except Exception as migration_error:
    # Existing column/table installations are expected; fail only if the schema
    # cannot be queried at all. Individual duplicate-column errors are harmless.
    print("Task workflow migration note:", migration_error)


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():
    return {
        "message": "Welcome to InternProof API",
        "status": "running"
    }


# =========================================================
# ADMIN - GET ALL USERS
# =========================================================

@app.get("/api/users")
def get_all_users(
    db: Session = Depends(get_db)
):
    users = (
        db.query(User)
        .order_by(User.id.asc())
        .all()
    )

    return [
        {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at
        }
        for user in users
    ]


# =========================================================
# AUTHENTICATION
# =========================================================


# ---------------------------------------------------------
# REGISTER
# ---------------------------------------------------------

@app.post("/api/auth/register")
def register(
    request: RegisterRequest,
    db: Session = Depends(get_db)
):
    existing_user = (
        db.query(User)
        .filter(
            User.email == request.email
        )
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    hashed_password = password_hash.hash(
        request.password
    )

    new_user = User(
        full_name=request.full_name,
        email=request.email,
        password_hash=hashed_password,
        role=request.role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "Registration successful",
        "user_id": new_user.id,
        "full_name": new_user.full_name,
        "email": new_user.email,
        "role": new_user.role
    }


# ---------------------------------------------------------
# LOGIN
# ---------------------------------------------------------

@app.post("/api/auth/login")
def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(
            User.email == request.email
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    try:
        password_correct = password_hash.verify(
            request.password,
            user.password_hash
        )
    except Exception:
        password_correct = False

    if not password_correct:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    return {
        "message": "Login successful",
        "user_id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "company_verification_status": user.company_verification_status if user.role == "company" else None
        , "token": create_session(db, user)
    }


# ---------------------------------------------------------
# FORGOT PASSWORD
# ---------------------------------------------------------

@app.post("/api/auth/forgot-password")
def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(
            User.email == request.email
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="No account found with this email"
        )

    reset_token = secrets.token_urlsafe(32)

    expires_at = (
        datetime.utcnow()
        + timedelta(minutes=15)
    )

    token_record = PasswordResetToken(
        user_id=user.id,
        token=reset_token,
        expires_at=expires_at
    )

    db.add(token_record)
    db.commit()

    frontend_url = os.getenv(
        "FRONTEND_URL",
        "http://localhost:5173"
    )

    reset_url = (
        f"{frontend_url}/reset-password"
        f"?token={reset_token}"
    )

    mail_username = os.getenv(
        "MAIL_USERNAME"
    )

    mail_password = os.getenv(
        "MAIL_PASSWORD"
    )

    if not mail_username or not mail_password:
        raise HTTPException(
            status_code=500,
            detail="Email configuration is missing"
        )

    message = EmailMessage()

    message["Subject"] = (
        "InternProof Password Reset"
    )

    message["From"] = mail_username
    message["To"] = user.email

    message.set_content(
        f"""
Hello {user.full_name},

You requested to reset your InternProof password.

Click the link below to reset your password:

{reset_url}

This link will expire in 15 minutes.

If you did not request this password reset, please ignore this email.

Regards,
InternProof Team
"""
    )

    try:
        with smtplib.SMTP(
            "smtp.gmail.com",
            587
        ) as server:

            server.starttls()

            server.login(
                mail_username,
                mail_password
            )

            server.send_message(
                message
            )

    except Exception as error:

        print(
            "Email sending error:"
        )

        print(error)

        raise HTTPException(
            status_code=500,
            detail="Unable to send password reset email"
        )

    return {
        "message": (
            "Password reset link sent "
            "to your email"
        )
    }


# ---------------------------------------------------------
# RESET PASSWORD
# ---------------------------------------------------------

@app.post("/api/auth/reset-password")
def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    token_record = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.token
            == request.token
        )
        .first()
    )

    if not token_record:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset link"
        )

    if datetime.utcnow() > token_record.expires_at:

        db.delete(token_record)
        db.commit()

        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset link"
        )

    user = (
        db.query(User)
        .filter(
            User.id == token_record.user_id
        )
        .first()
    )

    if not user:

        db.delete(token_record)
        db.commit()

        raise HTTPException(
            status_code=400,
            detail="Invalid reset request"
        )

    user.password_hash = (
        password_hash.hash(
            request.new_password
        )
    )

    db.delete(token_record)

    db.commit()

    return {
        "message": (
            "Password reset successfully. "
            "You can now login with your new password."
        )
    }


# =========================================================
# INTERNSHIPS
# =========================================================


# ---------------------------------------------------------
# CREATE INTERNSHIP
# ---------------------------------------------------------

@app.post(
    "/api/internships",
    response_model=InternshipResponse
)
def create_internship(
    request: InternshipCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_user)
):
    require_role(user, "company")
    if user.id != request.created_by:
        raise HTTPException(status_code=403, detail="You can only post internships for your account")
    if user.company_verification_status != "verified":
        raise HTTPException(status_code=403, detail="Company verification is required before posting internships")
    creator = (
        db.query(User)
        .filter(
            User.id == request.created_by
        )
        .first()
    )

    if not creator:
        raise HTTPException(
            status_code=404,
            detail="User who created the internship was not found"
        )

    new_internship = Internship(
        title=request.title,
        description=request.description,
        company_name=request.company_name,
        location=request.location,
        start_date=request.start_date,
        end_date=request.end_date,
        created_by=request.created_by,
        status=request.status
    )

    db.add(new_internship)
    db.commit()
    db.refresh(new_internship)

    return new_internship


# ---------------------------------------------------------
# GET ALL INTERNSHIPS
# ---------------------------------------------------------

@app.get(
    "/api/internships",
    response_model=list[InternshipResponse]
)
def get_internships(
    db: Session = Depends(get_db)
):
    internships = (
        db.query(Internship)
        .order_by(
            Internship.id.desc()
        )
        .all()
    )

    return internships


# ---------------------------------------------------------
# GET SINGLE INTERNSHIP
# ---------------------------------------------------------

@app.get(
    "/api/internships/{internship_id}",
    response_model=InternshipResponse
)
def get_internship(
    internship_id: int,
    db: Session = Depends(get_db)
):
    internship = (
        db.query(Internship)
        .filter(
            Internship.id == internship_id
        )
        .first()
    )

    if not internship:
        raise HTTPException(
            status_code=404,
            detail="Internship not found"
        )

    return internship


# ---------------------------------------------------------
# UPDATE INTERNSHIP
# ---------------------------------------------------------

@app.put(
    "/api/internships/{internship_id}",
    response_model=InternshipResponse
)
def update_internship(
    internship_id: int,
    request: InternshipCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_user)
):
    if user.role not in ("company", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    internship = (
        db.query(Internship)
        .filter(
            Internship.id == internship_id
        )
        .first()
    )

    if not internship:
        raise HTTPException(
            status_code=404,
            detail="Internship not found"
        )

    if user.role == "company" and (internship.created_by != user.id or user.company_verification_status != "verified"):
        raise HTTPException(status_code=403, detail="Verified company ownership is required")

    internship.title = request.title
    internship.description = request.description
    internship.company_name = request.company_name
    internship.location = request.location
    internship.start_date = request.start_date
    internship.end_date = request.end_date
    internship.created_by = request.created_by
    internship.status = request.status

    db.commit()
    db.refresh(internship)

    return internship


# ---------------------------------------------------------
# DELETE INTERNSHIP
# ---------------------------------------------------------

@app.delete(
    "/api/internships/{internship_id}"
)
def delete_internship(
    internship_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_user)
):
    if user.role not in ("company", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    internship = (
        db.query(Internship)
        .filter(
            Internship.id == internship_id
        )
        .first()
    )

    if not internship:
        raise HTTPException(
            status_code=404,
            detail="Internship not found"
        )

    if user.role == "company" and (internship.created_by != user.id or user.company_verification_status != "verified"):
        raise HTTPException(status_code=403, detail="Verified company ownership is required")

    db.delete(internship)
    db.commit()

    return {
        "message": (
            "Internship deleted successfully"
        )
    }


# =========================================================
# APPLICATIONS
# =========================================================


# ---------------------------------------------------------
# CREATE APPLICATION
# ---------------------------------------------------------

@app.post(
    "/api/applications",
    response_model=ApplicationResponse
)
def create_application(
    request: ApplicationCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_user)
):
    require_role(user, "student")
    if user.id != request.student_id:
        raise HTTPException(status_code=403, detail="You can only apply for yourself")
    student = (
        db.query(User)
        .filter(
            User.id == request.student_id,
            User.role == "student"
        )
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    internship = (
        db.query(Internship)
        .filter(
            Internship.id == request.internship_id
        )
        .first()
    )

    if not internship:
        raise HTTPException(
            status_code=404,
            detail="Internship not found"
        )

    existing_application = (
        db.query(Application)
        .filter(
            Application.student_id
            == request.student_id,
            Application.internship_id
            == request.internship_id
        )
        .first()
    )

    if existing_application:
        raise HTTPException(
            status_code=400,
            detail=(
                "You have already applied "
                "for this internship"
            )
        )

    new_application = Application(
        student_id=request.student_id,
        internship_id=request.internship_id,
        status="pending"
    )

    db.add(new_application)
    db.commit()
    db.refresh(new_application)

    return new_application


# ---------------------------------------------------------
# GET STUDENT APPLICATIONS
# ---------------------------------------------------------

@app.get(
    "/api/applications/student/{student_id}",
    response_model=list[ApplicationResponse]
)
def get_student_applications(
    student_id: int,
    db: Session = Depends(get_db)
):
    applications = (
        db.query(Application)
        .filter(
            Application.student_id
            == student_id
        )
        .order_by(
            Application.id.desc()
        )
        .all()
    )

    return applications


# ---------------------------------------------------------
# GET INTERNSHIP APPLICATIONS
# ---------------------------------------------------------

@app.get(
    "/api/applications/internship/{internship_id}",
    response_model=list[ApplicationResponse]
)
def get_internship_applications(
    internship_id: int,
    db: Session = Depends(get_db)
):
    applications = (
        db.query(Application)
        .filter(
            Application.internship_id
            == internship_id
        )
        .order_by(
            Application.id.desc()
        )
        .all()
    )

    return applications


# ---------------------------------------------------------
# UPDATE APPLICATION STATUS
# ---------------------------------------------------------

@app.put(
    "/api/applications/{application_id}/status",
    response_model=ApplicationResponse
)
def update_application_status(
    application_id: int,
    status: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_user)
):
    require_role(user, "company")
    if status not in [
        "pending",
        "accepted",
        "rejected"
    ]:
        raise HTTPException(
            status_code=400,
            detail="Invalid application status"
        )

    application = (
        db.query(Application)
        .filter(
            Application.id
            == application_id
        )
        .first()
    )

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found"
        )

    if application.internship.creator.id != user.id:
        raise HTTPException(status_code=403, detail="This application does not belong to your company")
    if status == "accepted" and user.company_verification_status != "verified":
        raise HTTPException(status_code=403, detail="Company verification is required before accepting students")

    application.status = status

    db.commit()
    db.refresh(application)

    return application


# =========================================================
# TASKS
# =========================================================


# ---------------------------------------------------------
# CREATE TASK
# ---------------------------------------------------------

@app.post(
    "/api/tasks",
    response_model=TaskResponse
)
def create_task(
    request: TaskCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_user)
):
    require_role(user, "company")
    student = (
        db.query(User)
        .filter(
            User.id == request.student_id,
            User.role == "student"
        )
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    internship = (
        db.query(Internship)
        .filter(
            Internship.id
            == request.internship_id
        )
        .first()
    )

    if not internship:
        raise HTTPException(
            status_code=404,
            detail="Internship not found"
        )

    if internship.created_by != user.id:
        raise HTTPException(status_code=403, detail="This internship does not belong to your company")
    if user.company_verification_status != "verified":
        raise HTTPException(status_code=403, detail="Company verification is required before assigning tasks")

    new_task = Task(
        title=request.title,
        description=request.description,
        due_date=request.due_date,
        status="assigned",
        student_id=request.student_id,
        internship_id=request.internship_id
    )

    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    return new_task


# ---------------------------------------------------------
# GET STUDENT TASKS
# ---------------------------------------------------------

@app.get(
    "/api/tasks/student/{student_id}",
    response_model=list[TaskResponse]
)
def get_student_tasks(
    student_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_user)
):
    if user.role == "student" and user.id != student_id:
        raise HTTPException(status_code=403, detail="You can only view your own tasks")
    if user.role == "company":
        owns_tasks = db.query(Task).join(Internship).filter(Task.student_id == student_id, Internship.created_by == user.id).first()
        if not owns_tasks:
            raise HTTPException(status_code=403, detail="Not authorized to view these tasks")
    elif user.role not in ("student", "college", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    student = (
        db.query(User)
        .filter(
            User.id == student_id,
            User.role == "student"
        )
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    tasks = (
        db.query(Task)
        .filter(
            Task.student_id
            == student_id
        )
        .order_by(
            Task.id.desc()
        )
        .all()
    )

    return tasks


# ---------------------------------------------------------
# UPDATE TASK STATUS
# ---------------------------------------------------------

@app.put(
    "/api/tasks/{task_id}/status",
    response_model=TaskResponse
)
def update_task_status(
    task_id: int,
    request: TaskStatusUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_user)
):
    raise HTTPException(status_code=403, detail="Tasks can only be verified through company review")
    task = (
        db.query(Task)
        .filter(
            Task.id == task_id
        )
        .first()
    )

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    task.status = request.status

    db.commit()
    db.refresh(task)

    return task


# =========================================================
# CERTIFICATES
# =========================================================

EVIDENCE_FOLDER = Path(__file__).resolve().parent / "private_evidence"
MAX_EVIDENCE_BYTES = 10 * 1024 * 1024
ALLOWED_EVIDENCE_EXTENSIONS = {".zip", ".pdf", ".docx", ".pptx", ".png", ".jpg", ".jpeg"}

def submission_data(submission: TaskSubmission):
    return {"id": submission.id, "task_id": submission.task_id, "student_id": submission.student_id,
        "submission_description": submission.submission_description, "evidence_file_name": submission.evidence_file_name,
        "evidence_file_hash": submission.evidence_file_hash, "evidence_file_size": submission.evidence_file_size,
        "github_url": submission.github_url, "live_url": submission.live_url, "submitted_at": submission.submitted_at,
        "status": submission.status, "reviewed_by": submission.reviewed_by, "reviewed_at": submission.reviewed_at,
        "review_comment": submission.review_comment}

def safe_optional_url(value: str | None, label: str):
    if not value or not value.strip():
        return None
    parsed = urlparse(value.strip())
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise HTTPException(status_code=422, detail=f"{label} must be a valid HTTP or HTTPS URL")
    return value.strip()

@app.post("/api/tasks/{task_id}/start")
def start_task(task_id: int, db: Session = Depends(get_db), user: User = Depends(require_user)):
    require_role(user, "student")
    task = db.query(Task).filter(Task.id == task_id, Task.student_id == user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status != "assigned":
        raise HTTPException(status_code=409, detail="Only assigned tasks can be started")
    task.status = "in_progress"
    task.started_at = datetime.utcnow()
    db.commit(); db.refresh(task)
    return task

@app.post("/api/tasks/{task_id}/submissions")
async def submit_task(task_id: int, description: str = Form(...), evidence_file: UploadFile | None = File(default=None),
                      github_url: str | None = Form(default=None), live_url: str | None = Form(default=None),
                      db: Session = Depends(get_db), user: User = Depends(require_user)):
    require_role(user, "student")
    task = db.query(Task).filter(Task.id == task_id, Task.student_id == user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status not in ("in_progress", "changes_required"):
        raise HTTPException(status_code=409, detail="Start the task or address requested changes before submitting")
    description = description.strip()
    github_url = safe_optional_url(github_url, "GitHub URL")
    live_url = safe_optional_url(live_url, "Live project URL")
    if len(description) < 10:
        raise HTTPException(status_code=422, detail="Submission description must contain at least 10 characters")
    if not evidence_file and not github_url and not live_url:
        raise HTTPException(status_code=422, detail="Provide an evidence file, GitHub URL, or live project URL")
    saved_path = None; original_name = None; file_hash = None; file_size = None
    if evidence_file:
        original_name = Path(evidence_file.filename or "").name
        extension = Path(original_name).suffix.lower()
        if extension not in ALLOWED_EVIDENCE_EXTENSIONS:
            raise HTTPException(status_code=422, detail="Unsupported evidence file type")
        payload = await evidence_file.read(MAX_EVIDENCE_BYTES + 1)
        if not payload or len(payload) > MAX_EVIDENCE_BYTES:
            raise HTTPException(status_code=413, detail="Evidence files must be between 1 byte and 10 MB")
        EVIDENCE_FOLDER.mkdir(parents=True, exist_ok=True)
        stored_name = secrets.token_hex(24) + extension
        target = EVIDENCE_FOLDER / stored_name
        target.write_bytes(payload)
        saved_path = str(target); file_size = len(payload); file_hash = sha256(payload).hexdigest()
    previous = db.query(TaskSubmission).filter(TaskSubmission.task_id == task.id).order_by(TaskSubmission.id.desc()).first()
    new_submission = TaskSubmission(task_id=task.id, student_id=user.id, submission_description=description,
        evidence_file_path=saved_path, evidence_file_name=original_name, evidence_file_hash=file_hash,
        evidence_file_size=file_size, github_url=github_url, live_url=live_url, status="under_review")
    db.add(new_submission); task.status = "under_review"; db.commit(); db.refresh(new_submission)
    return submission_data(new_submission)

@app.get("/api/tasks/{task_id}/submissions")
def get_task_submissions(task_id: int, db: Session = Depends(get_db), user: User = Depends(require_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if user.role == "student" and user.id != task.student_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if user.role == "company":
        if user.company_verification_status != "verified" or task.internship.creator.id != user.id:
            raise HTTPException(status_code=403, detail="Not authorized to review this task")
    elif user.role != "student":
        raise HTTPException(status_code=403, detail="Not authorized")
    return [submission_data(row) for row in db.query(TaskSubmission).filter(TaskSubmission.task_id == task_id).order_by(TaskSubmission.id.desc()).all()]

@app.get("/api/task-submissions/company")
def get_company_tasks(db: Session = Depends(get_db), user: User = Depends(require_user)):
    require_role(user, "company")
    tasks = db.query(Task).join(Internship).filter(Internship.created_by == user.id).order_by(Task.id.desc()).all()
    result = []
    for task in tasks:
        history = db.query(TaskSubmission).filter(TaskSubmission.task_id == task.id).order_by(TaskSubmission.id.desc()).all()
        latest = history[0] if history else None
        result.append({"task": {"id": task.id, "title": task.title, "description": task.description, "due_date": task.due_date,
            "status": task.status, "student_id": task.student_id, "internship_id": task.internship_id},
            "student_name": task.student.full_name, "internship_title": task.internship.title,
            "submission": submission_data(latest) if latest else None,
            "history": [submission_data(row) for row in history]})
    return result

@app.post("/api/task-submissions/{submission_id}/review")
def review_submission(submission_id: int, decision: str = Form(...), comment: str = Form(default=""),
                      db: Session = Depends(get_db), user: User = Depends(require_user)):
    require_role(user, "company")
    if user.company_verification_status != "verified":
        raise HTTPException(status_code=403, detail="Company verification is required before reviewing submissions")
    submission = db.query(TaskSubmission).filter(TaskSubmission.id == submission_id).first()
    if not submission or submission.task.internship.creator.id != user.id:
        raise HTTPException(status_code=404, detail="Submission not found")
    if submission.status != "under_review":
        raise HTTPException(status_code=409, detail="This submission has already been reviewed")
    if decision not in ("approved", "changes_required"):
        raise HTTPException(status_code=422, detail="Invalid review decision")
    if decision == "changes_required" and len(comment.strip()) < 5:
        raise HTTPException(status_code=422, detail="Please provide clear feedback requesting changes")
    submission.status = decision; submission.reviewed_by = user.id; submission.reviewed_at = datetime.utcnow()
    submission.review_comment = comment.strip() or None
    submission.task.status = decision
    db.commit(); db.refresh(submission)
    return submission_data(submission)

@app.get("/api/evidence/{submission_id}")
def download_evidence(submission_id: int, db: Session = Depends(get_db), user: User = Depends(require_user)):
    submission = db.query(TaskSubmission).filter(TaskSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Evidence not found")
    allowed = user.role == "student" and user.id == submission.student_id
    allowed = allowed or (user.role == "company" and user.company_verification_status == "verified" and submission.task.internship.creator.id == user.id)
    if not allowed:
        raise HTTPException(status_code=403, detail="Not authorized")
    if not submission.evidence_file_path or not Path(submission.evidence_file_path).is_file():
        raise HTTPException(status_code=404, detail="No evidence file is attached")
    return FileResponse(submission.evidence_file_path, filename=submission.evidence_file_name or "evidence")

@app.get("/api/task-submissions/{submission_id}/verify-integrity")
def verify_evidence_integrity(submission_id: int, db: Session = Depends(get_db), user: User = Depends(require_user)):
    submission = db.query(TaskSubmission).filter(TaskSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    student_access = user.role == "student" and user.id == submission.student_id
    company_access = user.role == "company" and user.company_verification_status == "verified" and submission.task.internship.creator.id == user.id
    if not (student_access or company_access):
        raise HTTPException(status_code=403, detail="Not authorized")
    if not submission.evidence_file_path or not submission.evidence_file_hash:
        return {"available": False, "integrity_matches": None, "message": "This submission has no stored evidence file."}
    path = Path(submission.evidence_file_path)
    if not path.is_file():
        return {"available": False, "integrity_matches": False, "message": "The stored evidence file is missing."}
    digest = sha256(path.read_bytes()).hexdigest()
    return {"available": True, "integrity_matches": digest == submission.evidence_file_hash,
            "stored_hash": submission.evidence_file_hash, "current_hash": digest,
            "message": "A matching SHA-256 confirms the stored bytes match the submission fingerprint; it does not prove authorship."}

@app.get("/api/admin/companies")
def admin_companies(db: Session = Depends(get_db), user: User = Depends(require_user)):
    require_role(user, "admin")
    return [{"id": row.id, "full_name": row.full_name, "email": row.email, "company_verified": row.company_verified,
             "verification_status": row.company_verification_status, "verified_by": row.company_verified_by,
             "verified_at": row.company_verified_at}
            for row in db.query(User).filter(User.role == "company").order_by(User.id).all()]

@app.put("/api/admin/companies/{company_id}/verification")
def set_company_verification(company_id: int, status: str, db: Session = Depends(get_db), user: User = Depends(require_user)):
    require_role(user, "admin")
    company = db.query(User).filter(User.id == company_id, User.role == "company").first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    if status not in ("verified", "rejected"):
        raise HTTPException(status_code=422, detail="Status must be verified or rejected")
    company.company_verification_status = status
    company.company_verified = status == "verified"
    company.company_verified_by = user.id
    company.company_verified_at = datetime.utcnow()
    db.commit()
    return {"id": company.id, "verification_status": company.company_verification_status, "verified_by": company.company_verified_by, "verified_at": company.company_verified_at}


# ---------------------------------------------------------
# CREATE CERTIFICATE RECORD
# ---------------------------------------------------------

@app.post(
    "/api/certificates",
    response_model=CertificateResponse
)
def create_certificate(
    request: CertificateCreateRequest,
    db: Session = Depends(get_db)
):
    student = (
        db.query(User)
        .filter(
            User.id == request.student_id,
            User.role == "student"
        )
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    internship = (
        db.query(Internship)
        .filter(
            Internship.id
            == request.internship_id
        )
        .first()
    )

    if not internship:
        raise HTTPException(
            status_code=404,
            detail="Internship not found"
        )

    existing_certificate = (
        db.query(Certificate)
        .filter(
            Certificate.certificate_number
            == request.certificate_number
        )
        .first()
    )

    if existing_certificate:
        raise HTTPException(
            status_code=400,
            detail="Certificate number already exists"
        )

    new_certificate = Certificate(
        student_id=request.student_id,
        internship_id=request.internship_id,
        certificate_title=(
            request.certificate_title
        ),
        certificate_number=(
            request.certificate_number
        ),
        issue_date=request.issue_date,
        issued_by=request.issued_by
    )

    db.add(new_certificate)
    db.commit()
    db.refresh(new_certificate)

    return new_certificate


# ---------------------------------------------------------
# GET STUDENT CERTIFICATES
# ---------------------------------------------------------

@app.get(
    "/api/certificates/student/{student_id}",
    response_model=list[CertificateResponse]
)
def get_student_certificates(
    student_id: int,
    db: Session = Depends(get_db)
):
    student = (
        db.query(User)
        .filter(
            User.id == student_id,
            User.role == "student"
        )
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    certificates = (
        db.query(Certificate)
        .filter(
            Certificate.student_id
            == student_id
        )
        .order_by(
            Certificate.id.desc()
        )
        .all()
    )

    return certificates


# =========================================================
# PDF CERTIFICATE STORAGE
# =========================================================

CERTIFICATES_FOLDER = "certificates"

os.makedirs(
    CERTIFICATES_FOLDER,
    exist_ok=True
)


# ---------------------------------------------------------
# UPLOAD CERTIFICATE PDF
# ---------------------------------------------------------

@app.post(
    "/api/certificates/upload"
)
def upload_certificate(
    student_id: int,
    internship_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_user)
):
    require_role(user, "company")
    if user.company_verification_status != "verified":
        raise HTTPException(status_code=403, detail="Company verification is required before issuing certificates")
    # Check student
    student = (
        db.query(User)
        .filter(
            User.id == student_id,
            User.role == "student"
        )
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    # Check internship
    internship = (
        db.query(Internship)
        .filter(
            Internship.id == internship_id
        )
        .first()
    )

    if not internship:
        raise HTTPException(
            status_code=404,
            detail="Internship not found"
        )

    if internship.created_by != user.id:
        raise HTTPException(status_code=403, detail="This internship does not belong to your company")

    # Check file name
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Please select a certificate PDF."
        )

    # Only PDF files
    if not file.filename.lower().endswith(
        ".pdf"
    ):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed."
        )

    # File name
    file_name = (
        f"certificate_student_{student_id}_"
        f"internship_{internship_id}.pdf"
    )

    file_path = os.path.join(
        CERTIFICATES_FOLDER,
        file_name
    )

    try:

        with open(
            file_path,
            "wb"
        ) as buffer:

            shutil.copyfileobj(
                file.file,
                buffer
            )

    except Exception as error:

        print(
            "Certificate PDF upload error:"
        )

        print(error)

        raise HTTPException(
            status_code=500,
            detail="Unable to save certificate PDF."
        )

    # -----------------------------------------------------
    # CREATE OR UPDATE DATABASE CERTIFICATE RECORD
    # -----------------------------------------------------

    existing_certificate = (
        db.query(Certificate)
        .filter(
            Certificate.student_id
            == student_id,
            Certificate.internship_id
            == internship_id
        )
        .first()
    )

    certificate_number = (
        f"CERT-{student_id}-"
        f"{internship_id}-"
        f"{int(datetime.utcnow().timestamp())}"
    )

    issue_date = (
        datetime.utcnow().date()
    )

    issued_by = (
        internship.company_name
    )

    if existing_certificate:

        existing_certificate.certificate_title = (
            "Internship Certificate"
        )

        existing_certificate.certificate_number = (
            certificate_number
        )

        existing_certificate.issue_date = (
            issue_date
        )

        existing_certificate.issued_by = (
            issued_by
        )

        db.commit()

        db.refresh(
            existing_certificate
        )

        certificate_id = (
            existing_certificate.id
        )

    else:

        new_certificate = Certificate(
            student_id=student_id,
            internship_id=internship_id,
            certificate_title=(
                "Internship Certificate"
            ),
            certificate_number=(
                certificate_number
            ),
            issue_date=issue_date,
            issued_by=issued_by
        )

        db.add(
            new_certificate
        )

        db.commit()

        db.refresh(
            new_certificate
        )

        certificate_id = (
            new_certificate.id
        )

    return {
        "message": (
            "Certificate PDF uploaded successfully."
        ),
        "certificate_id": certificate_id,
        "student_id": student_id,
        "internship_id": internship_id,
        "file_name": file_name
    }


# ---------------------------------------------------------
# VIEW / DOWNLOAD CERTIFICATE PDF
# ---------------------------------------------------------

@app.get(
    "/api/certificates/file/{student_id}/{internship_id}"
)
def get_certificate_file(
    student_id: int,
    internship_id: int
):
    file_name = (
        f"certificate_student_{student_id}_"
        f"internship_{internship_id}.pdf"
    )

    file_path = os.path.join(
        CERTIFICATES_FOLDER,
        file_name
    )

    if not os.path.exists(
        file_path
    ):
        raise HTTPException(
            status_code=404,
            detail="Certificate PDF not found."
        )

    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=file_name
    )


# =========================================================
# MESSAGES / COMMUNICATION
# =========================================================


# ---------------------------------------------------------
# SEND MESSAGE
# ---------------------------------------------------------

@app.post(
    "/api/messages",
    response_model=MessageResponse
)
def send_message(
    request: MessageCreateRequest,
    db: Session = Depends(get_db)
):
    sender = (
        db.query(User)
        .filter(
            User.id
            == request.sender_id
        )
        .first()
    )

    if not sender:
        raise HTTPException(
            status_code=404,
            detail="Sender not found"
        )

    receiver = (
        db.query(User)
        .filter(
            User.id
            == request.receiver_id
        )
        .first()
    )

    if not receiver:
        raise HTTPException(
            status_code=404,
            detail="Receiver not found"
        )

    if (
        request.sender_id
        == request.receiver_id
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "You cannot send a "
                "message to yourself"
            )
        )

    if not request.message.strip():
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty"
        )

    new_message = Message(
        sender_id=request.sender_id,
        receiver_id=request.receiver_id,
        message=request.message.strip(),
        is_read=False
    )

    db.add(new_message)

    db.commit()

    db.refresh(new_message)

    return new_message


# ---------------------------------------------------------
# GET USER MESSAGES
# ---------------------------------------------------------

@app.get(
    "/api/messages/user/{user_id}",
    response_model=list[MessageResponse]
)
def get_user_messages(
    user_id: int,
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(
            User.id == user_id
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    messages = (
        db.query(Message)
        .filter(
            (
                Message.sender_id
                == user_id
            )
            |
            (
                Message.receiver_id
                == user_id
            )
        )
        .order_by(
            Message.id.asc()
        )
        .all()
    )

    return messages


# ---------------------------------------------------------
# MARK MESSAGE AS READ
# ---------------------------------------------------------

@app.put(
    "/api/messages/{message_id}/read",
    response_model=MessageResponse
)
def mark_message_as_read(
    message_id: int,
    db: Session = Depends(get_db)
):
    message = (
        db.query(Message)
        .filter(
            Message.id == message_id
        )
        .first()
    )

    if not message:
        raise HTTPException(
            status_code=404,
            detail="Message not found"
        )

    message.is_read = True

    db.commit()

    db.refresh(message)

    return message
