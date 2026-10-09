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
    , AuthSession, TaskSubmission, MentorEvaluation, CollegeInternshipReview
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
    , MentorEvaluationRequest, StudentCollegeAffiliationRequest
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
def current_user(user: User = Depends(require_user), db: Session = Depends(get_db)):
    college_name = db.query(User.full_name).filter(User.id == user.college_id, User.role == "college").scalar() if user.college_id else None
    return {"user_id": user.id, "full_name": user.full_name, "email": user.email, "role": user.role,
            "company_verification_status": user.company_verification_status if user.role == "company" else None,
            "college_id": user.college_id, "college_code": user.college_code, "company_code": user.company_code, "roll_number": user.roll_number,
            "department": user.department, "course": user.course, "year": user.year, "semester": user.semester,
            "college_verification_status": user.college_verification_status, "college_name": college_name}


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
            college_columns = {
                "college_id": "INT NULL",
                "college_code": "VARCHAR(40) NULL",
                "company_code": "VARCHAR(40) NULL",
                "roll_number": "VARCHAR(80) NULL",
                "department": "VARCHAR(150) NULL",
                "course": "VARCHAR(150) NULL",
                "year": "VARCHAR(40) NULL",
                "semester": "VARCHAR(40) NULL",
                "college_verification_status": "VARCHAR(30) NOT NULL DEFAULT 'not_requested'",
                "college_verified_by": "INT NULL",
                "college_verified_at": "DATETIME NULL",
                "college_rejection_reason": "TEXT NULL",
            }
            for column, definition in college_columns.items():
                if column not in user_columns:
                    connection.exec_driver_sql(f"ALTER TABLE users ADD COLUMN {column} {definition}")
            connection.exec_driver_sql("UPDATE users SET college_code=CONCAT('IP-COL-', LPAD(id, 5, '0')) WHERE role='college' AND college_code IS NULL")
            user_indexes = inspect(engine).get_indexes("users")
            if not any("college_id" in (idx.get("column_names") or []) for idx in user_indexes):
                connection.exec_driver_sql("CREATE INDEX ix_users_college_id ON users (college_id)")
            if not any(idx.get("unique") and idx.get("column_names") == ["college_code"] for idx in user_indexes):
                unique_constraints = inspect(engine).get_unique_constraints("users")
                if not any(constraint.get("column_names") == ["college_code"] for constraint in unique_constraints):
                    connection.exec_driver_sql("CREATE UNIQUE INDEX ix_users_college_code ON users (college_code)")
            user_indexes = inspect(engine).get_indexes("users")
            if not any(idx.get("unique") and idx.get("column_names") == ["company_code"] for idx in user_indexes):
                unique_constraints = inspect(engine).get_unique_constraints("users")
                if not any(constraint.get("column_names") == ["company_code"] for constraint in unique_constraints):
                    connection.exec_driver_sql("CREATE UNIQUE INDEX ix_users_company_code ON users (company_code)")
            user_indexes = inspect(engine).get_indexes("users")
            if not any(idx.get("unique") and idx.get("column_names") == ["college_id", "roll_number"] for idx in user_indexes):
                unique_constraints = inspect(engine).get_unique_constraints("users")
                if not any(constraint.get("column_names") == ["college_id", "roll_number"] for constraint in unique_constraints):
                    connection.exec_driver_sql("CREATE UNIQUE INDEX uq_student_college_roll ON users (college_id, roll_number)")
            connection.exec_driver_sql("ALTER TABLE tasks MODIFY status VARCHAR(30) NOT NULL DEFAULT 'assigned'")
            task_columns = {column["name"] for column in inspect(engine).get_columns("tasks")}
            if "started_at" not in task_columns:
                connection.exec_driver_sql("ALTER TABLE tasks ADD COLUMN started_at DATETIME NULL")
            connection.exec_driver_sql("UPDATE tasks SET status='assigned' WHERE status='pending'")
            # Legacy completion was student-declared; it must not count as verified approval.
            connection.exec_driver_sql("UPDATE tasks SET status='in_progress' WHERE status='completed'")
            connection.exec_driver_sql("UPDATE users SET company_verification_status='verified' WHERE company_verified=1 AND company_verification_status='pending'")
            review_columns = {column["name"] for column in inspect(engine).get_columns("college_internship_reviews")}
            if "evaluation_requested" not in review_columns:
                connection.exec_driver_sql("ALTER TABLE college_internship_reviews ADD COLUMN evaluation_requested BOOLEAN NOT NULL DEFAULT 0")
            if "evaluation_reviewed_by" not in review_columns:
                connection.exec_driver_sql("ALTER TABLE college_internship_reviews ADD COLUMN evaluation_reviewed_by INT NULL")
            if "evaluation_reviewed_at" not in review_columns:
                connection.exec_driver_sql("ALTER TABLE college_internship_reviews ADD COLUMN evaluation_reviewed_at DATETIME NULL")
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
    db: Session = Depends(get_db), user: User = Depends(require_user)
):
    query = db.query(User).order_by(User.id.asc())
    if user.role == "college":
        query = query.filter(User.role == "student", User.college_id == user.id)
    elif user.role == "student":
        query = query.filter(User.id == user.id)
    elif user.role != "admin":
        query = query.filter(User.id == user.id)
    users = query.all()

    return [
        {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "college_id": user.college_id,
            "college_code": user.college_code,
            "roll_number": user.roll_number,
            "department": user.department,
            "course": user.course,
            "year": user.year,
            "semester": user.semester,
            "college_verification_status": user.college_verification_status,
            "created_at": user.created_at
        }
        for user in users
    ]


@app.get("/api/colleges")
def list_registered_colleges(db: Session = Depends(get_db)):
    return [{"id": row.id, "full_name": row.full_name, "college_code": row.college_code}
            for row in db.query(User).filter(User.role == "college").order_by(User.full_name).all()]


@app.put("/api/student/college-affiliation")
def update_student_college_affiliation(request: StudentCollegeAffiliationRequest,
                                       db: Session = Depends(get_db), user: User = Depends(require_user)):
    require_role(user, "student")
    values = [request.roll_number, request.department, request.course, request.year, request.semester]
    if any(not value.strip() for value in values):
        raise HTTPException(status_code=400, detail="Complete all academic details before submitting for verification")
    college = db.query(User).filter(User.id == request.college_id, User.role == "college").first()
    if not college:
        raise HTTPException(status_code=400, detail="Select a registered college")
    duplicate = db.query(User).filter(User.college_id == college.id, User.roll_number == request.roll_number, User.id != user.id).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="This roll number is already associated with the selected college")
    changed = (user.college_id != college.id or user.roll_number != request.roll_number or user.department != request.department or
               user.course != request.course or user.year != request.year or user.semester != request.semester)
    user.college_id = college.id
    user.roll_number = request.roll_number.strip()
    user.department = request.department.strip()
    user.course = request.course.strip()
    user.year = request.year.strip()
    user.semester = request.semester.strip()
    if changed or user.college_verification_status != "verified":
        user.college_verification_status = "pending"
        user.college_verified_by = None
        user.college_verified_at = None
        user.college_rejection_reason = None
    db.commit()
    return {"message": "Academic details submitted for college verification", "college_id": college.id,
            "college_code": college.college_code, "college_name": college.full_name,
            "college_verification_status": user.college_verification_status}


def college_student_query(db: Session, college: User):
    require_role(college, "college")
    return db.query(User).filter(User.role == "student", User.college_id == college.id)


@app.get("/api/college/overview")
def college_overview(db: Session = Depends(get_db), user: User = Depends(require_user)):
    require_role(user, "college")
    students = college_student_query(db, user).all()
    student_ids = [student.id for student in students]
    all_applications = db.query(Application).filter(Application.student_id.in_(student_ids)).all() if student_ids else []
    applications = [app for app in all_applications if app.status == "accepted"]
    internship_ids = list({app.internship_id for app in applications})
    internships = db.query(Internship).filter(Internship.id.in_(internship_ids)).all() if internship_ids else []
    certs = db.query(Certificate).filter(Certificate.student_id.in_(student_ids)).all() if student_ids else []
    requests = sum(student.college_verification_status == "pending" for student in students)
    ongoing = sum(item.status in ("active", "ongoing") for item in internships)
    completed = sum(item.status == "completed" for item in internships)
    review_rows = db.query(CollegeInternshipReview).filter(CollegeInternshipReview.college_id == user.id).all()
    reviews = {(review.internship_id, review.student_id): review.status for review in review_rows}
    pending_reviews = sum(reviews.get((app.internship_id, app.student_id), "pending") == "pending" for app in applications)
    recent = [{"type": "student", "label": f"{student.full_name} is awaiting college verification", "at": student.created_at}
              for student in students if student.college_verification_status == "pending"]
    recent.extend({"type": "application", "label": f"New internship application from {app.student.full_name}", "at": app.applied_at} for app in all_applications)
    recent.extend({"type": "certificate", "label": f"Certificate issued to {cert.student.full_name}", "at": cert.issue_date} for cert in certs)
    evaluations = db.query(MentorEvaluation).filter(MentorEvaluation.student_id.in_(student_ids)).all() if student_ids else []
    recent.extend({"type": "evaluation", "label": f"Mentor evaluation submitted for {evaluation.student.full_name}", "at": evaluation.submitted_at} for evaluation in evaluations)
    recent.extend({"type": "internship", "label": f"Internship completed: {item.title}", "at": item.end_date}
                  for item in internships if item.status == "completed")
    recent.extend({"type": "internship", "label": f"College verified internship #{review.internship_id}", "at": review.reviewed_at}
                  for review in review_rows if review.status == "verified")
    recent = sorted(recent, key=lambda item: str(item.get("at") or ""), reverse=True)[:8]
    return {"total_students": len(students), "verified_students": sum(s.college_verification_status == "verified" for s in students),
            "pending_student_verification": requests, "total_internships": len(internships), "ongoing_internships": ongoing,
            "completed_internships": completed, "pending_internship_verification": pending_reviews,
            "certificates_issued": len(certs), "recent_activity": recent}


@app.get("/api/college/students")
def college_students(db: Session = Depends(get_db), user: User = Depends(require_user)):
    students = college_student_query(db, user).order_by(User.full_name).all()
    return [{"id": s.id, "full_name": s.full_name, "email": s.email, "college_id": s.college_id,
             "college": user.full_name, "college_code": user.college_code, "roll_number": s.roll_number,
             "department": s.department, "course": s.course, "year": s.year, "semester": s.semester,
             "college_verification_status": s.college_verification_status, "created_at": s.created_at}
            for s in students]


@app.put("/api/college/students/{student_id}/verification")
def review_student_verification(student_id: int, status: str, reason: str | None = None,
                                db: Session = Depends(get_db), user: User = Depends(require_user)):
    require_role(user, "college")
    student = college_student_query(db, user).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student request not found")
    if status not in ("verified", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be verified or rejected")
    student.college_verification_status = status
    student.college_verified_by = user.id
    student.college_verified_at = datetime.utcnow()
    student.college_rejection_reason = reason if status == "rejected" else None
    db.commit()
    return {"id": student.id, "college_verification_status": status}


@app.get("/api/college/students/{student_id}")
def college_student_detail(student_id: int, db: Session = Depends(get_db), user: User = Depends(require_user)):
    student = college_student_query(db, user).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found for this college")
    applications = db.query(Application).filter_by(student_id=student.id).order_by(Application.id.desc()).all()
    history = []
    for app_record in applications:
        item = app_record.internship
        evaluation = db.query(MentorEvaluation).filter_by(internship_id=item.id, student_id=student.id).first()
        review = db.query(CollegeInternshipReview).filter_by(internship_id=item.id, student_id=student.id, college_id=user.id).first()
        certificate = db.query(Certificate).filter_by(internship_id=item.id, student_id=student.id).first()
        history.append({"internship_id": item.id, "company": item.company_name, "role": item.title,
                        "start_date": item.start_date, "end_date": item.end_date, "status": item.status,
                        "application_status": app_record.status,
                        "mentor_evaluation": evaluation.evaluation if evaluation else None,
                        "mentor": evaluation.mentor.full_name if evaluation else None,
                        "mentor_rating": evaluation.rating if evaluation else None,
                        "mentor_approval": evaluation.approval_status if evaluation else "missing",
                        "college_verification": review.status if review else "pending",
                        "certificate_number": certificate.certificate_number if certificate else None,
                        "certificate_issue_date": certificate.issue_date if certificate else None})
    return {"id": student.id, "full_name": student.full_name, "email": student.email,
            "college": user.full_name, "college_code": user.college_code, "roll_number": student.roll_number,
            "department": student.department, "course": student.course, "year": student.year,
            "semester": student.semester, "college_verification_status": student.college_verification_status,
            "college_verified_at": student.college_verified_at, "college_rejection_reason": student.college_rejection_reason,
            "internship_history": history}


@app.get("/api/college/records/{record_type}")
def college_records(record_type: str, db: Session = Depends(get_db), user: User = Depends(require_user)):
    require_role(user, "college")
    students = college_student_query(db, user).all()
    student_by_id = {student.id: student for student in students}
    student_ids = list(student_by_id)
    applications = db.query(Application).filter(Application.student_id.in_(student_ids)).all() if student_ids else []
    internship_ids = list({item.internship_id for item in applications})
    internships = db.query(Internship).filter(Internship.id.in_(internship_ids)).all() if internship_ids else []
    internship_by_id = {item.id: item for item in internships}
    if record_type == "requests":
        return [{"id": s.id, "full_name": s.full_name, "email": s.email, "college": user.full_name, "college_code": user.college_code, "roll_number": s.roll_number,
                 "department": s.department, "course": s.course, "year": s.year, "semester": s.semester,
                 "college_verification_status": s.college_verification_status}
                for s in students]
    if record_type == "students":
        return [{"id": s.id, "full_name": s.full_name, "email": s.email, "college": user.full_name, "college_code": user.college_code, "roll_number": s.roll_number,
                 "department": s.department, "course": s.course, "year": s.year, "semester": s.semester,
                 "college_verification_status": s.college_verification_status} for s in students]
    if record_type == "applications":
        return [{"id": a.id, "student_id": a.student_id, "student_name": student_by_id[a.student_id].full_name,
                 "roll_number": student_by_id[a.student_id].roll_number, "company": internship_by_id[a.internship_id].company_name,
                 "internship": internship_by_id[a.internship_id].title, "applied_at": a.applied_at,
                 "status": "completed" if a.status == "accepted" and internship_by_id[a.internship_id].status == "completed" else a.status}
                for a in applications if a.internship_id in internship_by_id]
    if record_type == "internships":
        rows = []
        for a in applications:
            if a.status != "accepted":
                continue
            item = internship_by_id.get(a.internship_id)
            student = student_by_id.get(a.student_id)
            if not item or not student: continue
            review = db.query(CollegeInternshipReview).filter_by(internship_id=item.id, student_id=student.id, college_id=user.id).first()
            evaluation = db.query(MentorEvaluation).filter_by(internship_id=item.id, student_id=student.id).first()
            rows.append({"id": item.id, "student_id": student.id, "student_name": student.full_name, "roll_number": student.roll_number,
                         "department": student.department, "course": student.course, "year": student.year,
                         "company": item.company_name, "role": item.title, "start_date": item.start_date, "end_date": item.end_date,
                         "status": item.status, "student_verification": student.college_verification_status,
                         "mentor_approval": evaluation.approval_status if evaluation else "missing",
                         "college_verification": review.status if review else "pending", "certificate_available": bool(db.query(Certificate).filter_by(student_id=student.id, internship_id=item.id).first())})
        return rows
    if record_type == "evaluations":
        rows = []
        for application in applications:
            if application.status != "accepted" or application.student_id not in student_by_id:
                continue
            evaluation = db.query(MentorEvaluation).filter_by(internship_id=application.internship_id, student_id=application.student_id).first()
            request = db.query(CollegeInternshipReview).filter_by(internship_id=application.internship_id, student_id=application.student_id, college_id=user.id).first()
            if not evaluation and (not request or not request.evaluation_requested):
                rows.append({"id": f"{application.internship_id}-{application.student_id}", "student_id": application.student_id,
                    "internship_id": application.internship_id, "student_name": application.student.full_name,
                    "roll_number": application.student.roll_number, "company": application.internship.company_name,
                    "internship": application.internship.title, "mentor": application.internship.company_name,
                    "evaluation": None, "rating": None, "tasks_completed": None, "tasks_total": None,
                    "approval_status": "not_requested", "submitted_at": None})
                continue
            rows.append({"id": evaluation.id if evaluation else f"{application.internship_id}-{application.student_id}",
                "student_id": application.student_id, "internship_id": application.internship_id,
                "student_name": application.student.full_name, "roll_number": application.student.roll_number,
                "company": application.internship.company_name, "internship": application.internship.title,
                "mentor": evaluation.mentor.full_name if evaluation else application.internship.company_name,
                "evaluation": evaluation.evaluation if evaluation else None, "rating": evaluation.rating if evaluation else None,
                "tasks_completed": evaluation.tasks_completed if evaluation else None, "tasks_total": evaluation.tasks_total if evaluation else None,
                "approval_status": ("requested" if request and request.evaluation_requested else (evaluation.approval_status if request and request.evaluation_reviewed_by else "pending")) if evaluation else "requested",
                "submitted_at": evaluation.submitted_at if evaluation else None})
        return rows
    if record_type == "certificates":
        rows = db.query(Certificate).filter(Certificate.student_id.in_(student_ids)).order_by(Certificate.id.desc()).all() if student_ids else []
        return [{"id": c.id, "student_id": c.student_id, "student_name": student_by_id[c.student_id].full_name,
                 "roll_number": student_by_id[c.student_id].roll_number, "company": c.internship.company_name,
                 "internship_id": c.internship_id, "internship": c.internship.title, "certificate_number": c.certificate_number, "issue_date": c.issue_date,
                 "status": "Issued", "evaluation_approved": bool(db.query(MentorEvaluation).filter_by(student_id=c.student_id, internship_id=c.internship_id, approval_status="approved").first() and db.query(CollegeInternshipReview).filter_by(student_id=c.student_id, internship_id=c.internship_id, college_id=user.id).filter(CollegeInternshipReview.evaluation_reviewed_by.isnot(None)).first())} for c in rows]
    raise HTTPException(status_code=404, detail="Unknown college record type")


@app.post("/api/college/internships/{internship_id}/evaluation-request")
def request_mentor_evaluation(internship_id: int, student_id: int, db: Session = Depends(get_db), user: User = Depends(require_user)):
    require_role(user, "college")
    application = db.query(Application).join(User, Application.student_id == User.id).filter(
        Application.internship_id == internship_id, Application.student_id == student_id,
        Application.status == "accepted", User.college_id == user.id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Accepted internship not found for this college")
    certificate = db.query(Certificate).filter_by(internship_id=internship_id, student_id=student_id).first()
    if not certificate:
        raise HTTPException(status_code=409, detail="The company must issue the certificate before the college requests its mentor evaluation")
    review = db.query(CollegeInternshipReview).filter_by(internship_id=internship_id, student_id=student_id, college_id=user.id).first()
    if not review:
        review = CollegeInternshipReview(internship_id=internship_id, student_id=student_id, college_id=user.id, evaluation_requested=True)
        db.add(review)
    else:
        review.evaluation_requested = True
        review.evaluation_reviewed_by = None
        review.evaluation_reviewed_at = None
    db.commit()
    return {"status": "evaluation_requested"}


@app.put("/api/college/internships/{internship_id}/evaluation-decision")
def decide_mentor_evaluation(internship_id: int, student_id: int, status: str, db: Session = Depends(get_db), user: User = Depends(require_user)):
    require_role(user, "college")
    if status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be approved or rejected")
    application = db.query(Application).join(User, Application.student_id == User.id).filter(
        Application.internship_id == internship_id, Application.student_id == student_id,
        Application.status == "accepted", User.college_id == user.id).first()
    evaluation = db.query(MentorEvaluation).filter_by(internship_id=internship_id, student_id=student_id).first()
    if not application or not evaluation:
        raise HTTPException(status_code=404, detail="Submitted mentor evaluation not found")
    evaluation.approval_status = status
    review = db.query(CollegeInternshipReview).filter_by(internship_id=internship_id, student_id=student_id, college_id=user.id).first()
    if not review:
        review = CollegeInternshipReview(internship_id=internship_id, student_id=student_id, college_id=user.id)
        db.add(review)
    review.evaluation_requested = False
    review.evaluation_reviewed_by = user.id
    review.evaluation_reviewed_at = datetime.utcnow()
    db.commit()
    return {"internship_id": internship_id, "student_id": student_id, "approval_status": status}


@app.put("/api/college/internships/{internship_id}/verification")
def review_college_internship(internship_id: int, student_id: int, status: str, reason: str | None = None,
                              db: Session = Depends(get_db), user: User = Depends(require_user)):
    require_role(user, "college")
    if status not in ("verified", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be verified or rejected")
    application = db.query(Application).join(User, Application.student_id == User.id).filter(
        Application.internship_id == internship_id, Application.student_id == student_id,
        Application.status == "accepted", User.college_id == user.id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Internship not found for this college")
    student = application.student
    evidence = db.query(TaskSubmission).join(Task).filter(Task.internship_id == internship_id,
        TaskSubmission.student_id == student.id, TaskSubmission.evidence_file_path.isnot(None)).first()
    evaluation = db.query(MentorEvaluation).filter_by(internship_id=internship_id, student_id=student.id, approval_status="approved").first()
    certificate = db.query(Certificate).filter_by(internship_id=internship_id, student_id=student.id).first()
    internship = application.internship
    if status == "verified" and (student.college_verification_status != "verified" or internship.status != "completed" or not evidence or not evaluation or not certificate):
        raise HTTPException(status_code=400, detail="Verification requires a verified student, completed internship, evidence, approved mentor evaluation, and certificate")
    review = db.query(CollegeInternshipReview).filter_by(internship_id=internship_id, student_id=student.id, college_id=user.id).first()
    if not review:
        review = CollegeInternshipReview(internship_id=internship_id, student_id=student.id, college_id=user.id)
        db.add(review)
    review.status = status
    review.reviewed_by = user.id
    review.reviewed_at = datetime.utcnow()
    review.rejection_reason = reason if status == "rejected" else None
    db.commit()
    return {"internship_id": internship_id, "status": status}


@app.put("/api/company/internships/{internship_id}/evaluation")
def submit_mentor_evaluation(internship_id: int, request: MentorEvaluationRequest,
                             db: Session = Depends(get_db), user: User = Depends(require_user)):
    require_role(user, "company")
    internship = db.query(Internship).filter(Internship.id == internship_id, Internship.created_by == user.id).first()
    if not internship:
        raise HTTPException(status_code=404, detail="Internship not found for this company")
    if user.company_verification_status != "verified":
        raise HTTPException(status_code=403, detail="Company verification is required to submit mentor evaluations")
    application = db.query(Application).filter_by(internship_id=internship_id, student_id=request.student_id, status="accepted").first()
    if not application:
        raise HTTPException(status_code=400, detail="Evaluation is limited to an accepted student")
    evaluation_request = db.query(CollegeInternshipReview).filter_by(internship_id=internship_id, student_id=request.student_id, college_id=application.student.college_id, evaluation_requested=True).first()
    if not evaluation_request:
        raise HTTPException(status_code=409, detail="Submit the mentor evaluation after the college requests it")
    if request.rating is not None and not 1 <= request.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    assigned_tasks = db.query(Task).filter_by(internship_id=internship_id, student_id=request.student_id).all()
    approved_tasks = sum(task.status == "approved" for task in assigned_tasks)
    if request.mark_completed and (not assigned_tasks or approved_tasks != len(assigned_tasks)):
        raise HTTPException(status_code=400, detail="All assigned tasks must be approved before marking the internship complete")
    record = db.query(MentorEvaluation).filter_by(internship_id=internship_id, student_id=request.student_id).first()
    if not record:
        record = MentorEvaluation(internship_id=internship_id, student_id=request.student_id, mentor_id=user.id,
                                  evaluation=request.evaluation, rating=request.rating,
                                  tasks_completed=approved_tasks, tasks_total=len(assigned_tasks),
                                  approval_status=request.approval_status)
        db.add(record)
    else:
        record.evaluation = request.evaluation
        record.rating = request.rating
        record.tasks_completed = approved_tasks
        record.tasks_total = len(assigned_tasks)
        record.approval_status = "pending"
        record.submitted_at = datetime.utcnow()
    record.approval_status = "pending"
    evaluation_request.evaluation_requested = False
    if request.mark_completed:
        internship.status = "completed"
    db.commit()
    return {"id": record.id, "internship_id": internship_id, "approval_status": record.approval_status}


# =========================================================
# AUTHENTICATION
# =========================================================


# ---------------------------------------------------------
# REGISTER
# ---------------------------------------------------------

@app.get("/api/company/workspace")
def company_workspace(db: Session = Depends(get_db), user: User = Depends(require_user)):
    require_role(user, "company")
    internships = db.query(Internship).filter_by(created_by=user.id).order_by(Internship.id.desc()).all()
    ids = [row.id for row in internships]
    applications = db.query(Application).filter(Application.internship_id.in_(ids)).order_by(Application.id.desc()).all() if ids else []
    def student_data(student):
        college = db.query(User).filter_by(id=student.college_id, role="college").first() if student.college_id else None
        return {"student_id": student.id, "student_name": student.full_name, "email": student.email, "roll_number": student.roll_number,
                "college": college.full_name if college else None, "department": student.department, "course": student.course,
                "year": student.year, "semester": student.semester, "college_verification_status": student.college_verification_status}
    apps = [{"id": row.id, "status": row.status, "applied_at": row.applied_at, "internship_id": row.internship_id,
             "internship_title": row.internship.title, **student_data(row.student),
             "evaluation_requested": bool(row.student.college_id and db.query(CollegeInternshipReview).filter_by(internship_id=row.internship_id, student_id=row.student_id, college_id=row.student.college_id, evaluation_requested=True).first()),
             "certificate_eligible": bool((assigned := db.query(Task).filter_by(internship_id=row.internship_id, student_id=row.student_id).all()) and all(task.status == "approved" for task in assigned))} for row in applications]
    evaluations = db.query(MentorEvaluation).filter(MentorEvaluation.internship_id.in_(ids)).all() if ids else []
    certificates = db.query(Certificate).filter(Certificate.internship_id.in_(ids)).all() if ids else []
    return {"internships": [{"id": row.id, "title": row.title, "description": row.description, "company_name": row.company_name,
             "location": row.location, "start_date": row.start_date, "end_date": row.end_date, "status": row.status, "created_by": row.created_by} for row in internships],
        "applications": apps, "interns": [row for row in apps if row["status"] == "accepted"],
        "evaluations": [{"id": row.id, "internship_id": row.internship_id, "student_id": row.student_id, "student_name": row.student.full_name,
             "internship_title": row.internship.title, "evaluation": row.evaluation, "rating": row.rating, "approval_status": row.approval_status,
             "submitted_at": row.submitted_at} for row in evaluations],
        "certificates": [{"id": row.id, "student_id": row.student_id, "student_name": row.student.full_name, "internship_id": row.internship_id,
             "internship_title": row.internship.title, "certificate_title": row.certificate_title, "certificate_number": row.certificate_number,
             "issue_date": row.issue_date} for row in certificates]}

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

    if request.role in ("college", "company"):
        raw_code = request.college_code if request.role == "college" else request.company_code
        label = "College code" if request.role == "college" else "Company code"
        if not raw_code or not raw_code.strip():
            raise HTTPException(status_code=400, detail=f"{label} is required")
        normalized_code = raw_code.strip().upper()
        code_query = db.query(User).filter(User.college_code == normalized_code) if request.role == "college" else db.query(User).filter(User.company_code == normalized_code)
        if code_query.first():
            raise HTTPException(status_code=400, detail=f"{label} is already registered")
        if request.role == "college": request.college_code = normalized_code
        else: request.company_code = normalized_code

    selected_college = None
    if request.role == "student" and request.college_id:
        selected_college = db.query(User).filter(User.id == request.college_id, User.role == "college").first()
        if not selected_college:
            raise HTTPException(status_code=400, detail="Select a registered college")
        required_academic = [request.roll_number, request.department, request.course, request.year, request.semester]
        if any(not value or not value.strip() for value in required_academic):
            raise HTTPException(status_code=400, detail="Roll number, department, course, year, and semester are required for college verification")
        if db.query(User).filter(User.college_id == selected_college.id, User.roll_number == request.roll_number).first():
            raise HTTPException(status_code=400, detail="This roll number is already associated with the selected college")
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

    if request.role == "college":
        new_user.college_code = request.college_code
        db.commit()
    elif request.role == "company":
        new_user.company_code = request.company_code
        db.commit()
    elif request.role == "student":
        new_user.college_id = selected_college.id if selected_college else None
        new_user.roll_number = request.roll_number.strip() if request.roll_number else None
        new_user.department = request.department.strip() if request.department else None
        new_user.course = request.course.strip() if request.course else None
        new_user.year = request.year.strip() if request.year else None
        new_user.semester = request.semester.strip() if request.semester else None
        new_user.college_verification_status = "pending" if selected_college else "not_requested"
        db.commit()

    return {
        "message": "Registration successful",
        "user_id": new_user.id,
        "full_name": new_user.full_name,
        "email": new_user.email,
        "role": new_user.role,
        "college_code": new_user.college_code,
        "company_code": new_user.company_code,
        "college_name": selected_college.full_name if selected_college else None,
        "college_verification_status": new_user.college_verification_status,
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

    college_name = db.query(User.full_name).filter(User.id == user.college_id, User.role == "college").scalar() if user.college_id else None
    return {
        "message": "Login successful",
        "user_id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "company_verification_status": user.company_verification_status if user.role == "company" else None
        , "college_id": user.college_id, "college_code": user.college_code, "company_code": user.company_code, "roll_number": user.roll_number,
        "department": user.department, "course": user.course, "year": user.year, "semester": user.semester,
        "college_verification_status": user.college_verification_status, "college_name": college_name
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

    if user.role == "company" and (internship.created_by != user.id or request.created_by != user.id or user.company_verification_status != "verified"):
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
    accepted = db.query(Application).filter_by(student_id=request.student_id, internship_id=request.internship_id, status="accepted").first()
    if not accepted:
        raise HTTPException(status_code=403, detail="Tasks can only be assigned to a student accepted for this internship")
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
    if decision == "approved":
        siblings = db.query(Task).filter_by(internship_id=submission.task.internship_id, student_id=submission.student_id).all()
        if siblings and all(task.status == "approved" for task in siblings):
            submission.task.internship.status = "completed"
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
    student_id: int = Form(...),
    internship_id: int = Form(...),
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
    accepted = db.query(Application).filter_by(student_id=student_id, internship_id=internship_id, status="accepted").first()
    assigned_tasks = db.query(Task).filter_by(internship_id=internship_id, student_id=student_id).all()
    if not accepted or not assigned_tasks or any(task.status != "approved" for task in assigned_tasks):
        raise HTTPException(status_code=403, detail="Certificates can be issued after all assigned tasks are approved")
    internship.status = "completed"

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
    internship_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_user)
):
    certificate = db.query(Certificate).filter_by(student_id=student_id, internship_id=internship_id).first()
    student = db.query(User).filter_by(id=student_id, role="student").first()
    internship = db.query(Internship).filter_by(id=internship_id).first()
    if not certificate or not student or not internship:
        raise HTTPException(status_code=404, detail="Certificate not found")
    allowed = (user.role == "student" and user.id == student_id) or user.role == "admin"
    allowed = allowed or (user.role == "college" and student.college_id == user.id)
    if user.role == "college" and allowed:
        approved_evaluation = db.query(MentorEvaluation).filter_by(student_id=student_id, internship_id=internship_id, approval_status="approved").first()
        college_review = db.query(CollegeInternshipReview).filter_by(student_id=student_id, internship_id=internship_id, college_id=user.id).filter(CollegeInternshipReview.evaluation_reviewed_by.isnot(None)).first()
        allowed = bool(approved_evaluation and college_review)
    if user.role == "company":
        allowed = internship.created_by == user.id and bool(db.query(Application).filter_by(student_id=student_id, internship_id=internship_id, status="accepted").first())
    if not allowed:
        raise HTTPException(status_code=403, detail="Not authorized to view this certificate")
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


@app.get("/api/college/certificates/file/{student_id}/{internship_id}")
def get_college_certificate_file(student_id: int, internship_id: int, db: Session = Depends(get_db), user: User = Depends(require_user)):
    require_role(user, "college")
    student = db.query(User).filter(User.id == student_id, User.role == "student", User.college_id == user.id).first()
    if not student or not db.query(Certificate).filter_by(student_id=student_id, internship_id=internship_id).first():
        raise HTTPException(status_code=404, detail="Certificate not found for this college")
    evaluation = db.query(MentorEvaluation).filter_by(student_id=student_id, internship_id=internship_id, approval_status="approved").first()
    college_review = db.query(CollegeInternshipReview).filter_by(student_id=student_id, internship_id=internship_id, college_id=user.id).filter(CollegeInternshipReview.evaluation_reviewed_by.isnot(None)).first()
    if not evaluation or not college_review:
        raise HTTPException(status_code=403, detail="The college must approve the mentor evaluation before downloading this certificate")
    return get_certificate_file(student_id, internship_id, db, user)


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
    db: Session = Depends(get_db),
    user: User = Depends(require_user)
):
    if user.id != request.sender_id:
        raise HTTPException(status_code=403, detail="Sender must be the authenticated user")

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

    allowed_pair = db.query(Application).join(Internship).filter(Application.status == "accepted", ((Application.student_id == sender.id) & (Internship.created_by == receiver.id)) | ((Application.student_id == receiver.id) & (Internship.created_by == sender.id))).first()
    if not allowed_pair:
        raise HTTPException(status_code=403, detail="Messages are limited to accepted company interns")

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
    db: Session = Depends(get_db),
    user: User = Depends(require_user)
):
    if user.id != user_id:
        raise HTTPException(status_code=403, detail="You can only view your own messages")

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
    db: Session = Depends(get_db),
    user: User = Depends(require_user)
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

    if message.receiver_id != user.id:
        raise HTTPException(status_code=403, detail="Only the message recipient can mark it read")

    message.is_read = True

    db.commit()

    db.refresh(message)

    return message
