import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function CompanyTasks({ evaluationsOnly = false }) {
  const [user, setUser] = useState(null);

  const [acceptedStudents, setAcceptedStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [companyTasks, setCompanyTasks] = useState([]);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [taskSearch, setTaskSearch] = useState("");

  // ============================================================
  // CHECK COMPANY LOGIN
  // ============================================================

  useEffect(() => {
    const storedUser = sessionStorage.getItem("user");

    if (!storedUser) {
      window.location.href = "/login";
      return;
    }

    try {
      const userData = JSON.parse(storedUser);

      if (userData.role !== "company") {
        window.location.href = "/login";
        return;
      }

      setUser(userData);

      loadAcceptedStudents(userData.user_id);
      loadCompanyTasks();
    } catch (error) {
      console.error("Invalid user data:", error);
      window.location.href = "/login";
    }
  }, []);

  const authHeaders = () => ({ Authorization: `Bearer ${JSON.parse(sessionStorage.getItem("user") || "{}").token || ""}` });
  const loadCompanyTasks = async () => {
    try {
      const response = await fetch("/api/task-submissions/company", { headers: authHeaders() });
      if (response.ok) setCompanyTasks(await response.json());
      else if (response.status === 401) setError("Your login session is missing or expired. Sign out, sign back in, then retry.");
      else if (response.status === 403) { const data = await response.json(); setError(data.detail || "Your company account is not authorized for task review."); }
      else if (response.status >= 500) setError(`The backend returned an error (${response.status}). Check the backend terminal for details.`);
    } catch (err) {
      setError("Cannot reach the backend through the frontend proxy. Confirm Uvicorn is running on port 8000 and restart Vite, then retry.");
    }
  };
  const retryLoading = () => { if (!user) return; loadAcceptedStudents(user.user_id); loadCompanyTasks(); };
  const reviewSubmission = async (submission, decision) => {
    let comment = "";
    if (decision === "approved" && !window.confirm("Approve this evidence? This adds the task to verified progress.")) return;
    if (decision === "changes_required") {
      comment = window.prompt("Explain the changes the student needs to make:") || "";
      if (comment.trim().length < 5) return;
    }
    setReviewBusy(true);
    try {
      const body = new FormData(); body.append("decision", decision); body.append("comment", comment);
      const response = await fetch(`/api/task-submissions/${submission.id}/review`, { method: "POST", headers: authHeaders(), body });
      const data = await response.json(); if (!response.ok) throw new Error(data.detail || "Unable to review submission.");
      await loadCompanyTasks();
    } catch (err) { setError(err.message); } finally { setReviewBusy(false); }
  };
  const downloadEvidence = async (submission) => {
    const response = await fetch(`/api/evidence/${submission.id}`, { headers: authHeaders() });
    if (!response.ok) { setError("Unable to download evidence."); return; }
    const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a");
    link.href = url; link.download = submission.evidence_file_name || "evidence"; link.click(); URL.revokeObjectURL(url);
  };
  const progressGroups = Object.values(companyTasks.reduce((groups, item) => {
    const key = `${item.task.student_id}-${item.task.internship_id}`;
    groups[key] ||= { student: item.student_name, internship: item.internship_title, total: 0, approved: 0 };
    groups[key].total += 1; if (item.task.status === "approved") groups[key].approved += 1; return groups;
  }, {}));
  const verifyEvidence = async (submission) => {
    const response = await fetch(`/api/task-submissions/${submission.id}/verify-integrity`, { headers: authHeaders() });
    const data = await response.json(); if (!response.ok) setError(data.detail || "Unable to verify file integrity."); else window.alert(data.message);
  };

  // ============================================================
  // LOAD ACCEPTED STUDENTS
  // ============================================================

  const loadAcceptedStudents = async (companyId) => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/company/workspace", { headers: authHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to load company interns.");
      const uniqueStudents = data.interns;

      setAcceptedStudents(uniqueStudents);

      // Automatically select first student
      if (uniqueStudents.length > 0) {
        setSelectedStudent(uniqueStudents[0]);
      } else {
        setSelectedStudent(null);
      }
    } catch (error) {
      console.error("Error loading accepted students:", error);

      setError(
        error instanceof TypeError
          ? "Cannot connect to the InternProof API at 127.0.0.1:8000. Start or restart the backend, then retry."
          : error.message ||
          "Unable to load accepted students."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // ASSIGN TASK
  // ============================================================

  const handleAssignTask = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedStudent) {
      setError("Please select a student.");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a task title.");
      return;
    }

    if (!description.trim()) {
      setError("Please enter a task description.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(
        "/api/tasks",
        {
          method: "POST",
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            due_date: dueDate || null,
            student_id: Number(
              selectedStudent.student_id
            ),
            internship_id: Number(
              selectedStudent.internship_id
            )
          }),
          headers: { "Content-Type": "application/json", ...authHeaders() }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          typeof data.detail === "string"
            ? data.detail
            : JSON.stringify(
                data.detail || data
              );

        throw new Error(
          errorMessage ||
            "Unable to assign task."
        );
      }

      setSuccess(
        "Task assigned successfully."
      );
      loadCompanyTasks();

      // Clear form
      setTitle("");
      setDescription("");
      setDueDate("");
    } catch (error) {
      console.error(
        "Error assigning task:",
        error
      );

      setError(
        error instanceof TypeError
          ? "Cannot connect to the InternProof API at 127.0.0.1:8000. Start or restart the backend, then retry."
          : error.message ||
          "Unable to assign task."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (!user || loading) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <h4>Loading...</h4>
        </div>
      </div>
    );
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="container py-5">

      {/* =========================
          HEADER
      ========================== */}

      <div className="d-flex justify-content-between align-items-start mb-4">

        <div>
          <h1 className="fw-bold mb-2">
            Tasks
          </h1>

          <p className="text-muted mb-0">
            Assign tasks to your accepted students.
          </p>
        </div>

        <Link
          to="/company/dashboard"
          className="btn btn-primary"
        >
          ← Back to Dashboard
        </Link>

      </div>


      {/* =========================
          SUCCESS MESSAGE
      ========================== */}

      {success && (
        <div
          className="alert alert-success"
          role="alert"
        >
          {success}
        </div>
      )}


      {/* =========================
          ERROR MESSAGE
      ========================== */}

      {error && (
        <div
          className="alert alert-danger d-flex justify-content-between align-items-center"
          role="alert"
        >
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={retryLoading}>Retry</button>
        </div>
      )}


      {/* =========================
          NO ACCEPTED STUDENTS
      ========================== */}

      {!evaluationsOnly && acceptedStudents.length === 0 ? (

        <div className="card shadow-sm border-0">

          <div className="card-body text-center py-5">

            <h4 className="fw-bold">
              No Accepted Students Yet
            </h4>

            <p className="text-muted mb-0">
              Tasks can be assigned after a student
              is accepted for an internship.
            </p>

          </div>

        </div>

      ) : !evaluationsOnly && (

        <div className="row g-4">

          {/* =========================
              ACCEPTED STUDENTS
          ========================== */}

          <div className="col-lg-4">

            <div className="card shadow-sm">

              <div className="card-body">

                <h4 className="fw-bold mb-3">Select an intern</h4>
                <input className="form-control mb-3" placeholder="Search name, roll number, college, internship?" value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} />

                {acceptedStudents.filter((student) => [student.student_name, student.roll_number, student.college, student.internship_title, student.email].join(" ").toLowerCase().includes(studentSearch.toLowerCase())).map(
                  (student) => {

                    const isSelected =
                      selectedStudent &&
                      Number(
                        selectedStudent.student_id
                      ) ===
                        Number(
                          student.student_id
                        ) &&
                      Number(
                        selectedStudent.internship_id
                      ) ===
                        Number(
                          student.internship_id
                        );

                    return (
                      <button
                        key={`${student.student_id}-${student.internship_id}`}
                        type="button"
                        className={`btn w-100 text-start mb-2 ${
                          isSelected
                            ? "btn-primary"
                            : "btn-light"
                        }`}
                        onClick={() =>
                          setSelectedStudent(
                            student
                          )
                        }
                      >

                        <div className="fw-bold">
                          Student ID:{" "}
                          {student.student_id}
                        </div>

                        <div>
                          {
                            student.internship_title
                          }
                        </div>

                      </button>
                    );
                  }
                )}

              </div>

            </div>

          </div>


          {/* =========================
              TASK FORM
          ========================== */}

          <div className="col-lg-8">

            <div className="card shadow-sm">

              <div className="card-body">

                <h4 className="fw-bold mb-4">
                  Assign Task
                </h4>

                {selectedStudent && (
                  <div className="alert alert-light border">

                    <strong>
                      Selected Student:
                    </strong>{" "}
                    {selectedStudent.student_name || `Student #${selectedStudent.student_id}`}

                    <br />

                    <strong>
                      Internship:
                    </strong>{" "}
                    {
                      selectedStudent.internship_title
                    }

                  </div>
                )}

                <form
                  onSubmit={handleAssignTask}
                >

                  {/* TASK TITLE */}

                  <div className="mb-3">

                    <label className="form-label fw-bold">
                      Task Title
                    </label>

                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter task title"
                      value={title}
                      onChange={(event) =>
                        setTitle(
                          event.target.value
                        )
                      }
                    />

                  </div>


                  {/* DESCRIPTION */}

                  <div className="mb-3">

                    <label className="form-label fw-bold">
                      Task Description
                    </label>

                    <textarea
                      className="form-control"
                      rows="5"
                      placeholder="Enter task description"
                      value={description}
                      onChange={(event) =>
                        setDescription(
                          event.target.value
                        )
                      }
                    />

                  </div>


                  {/* DUE DATE */}

                  <div className="mb-4">

                    <label className="form-label fw-bold">
                      Due Date
                    </label>

                    <input
                      type="date"
                      className="form-control"
                      value={dueDate}
                      onChange={(event) =>
                        setDueDate(
                          event.target.value
                        )
                      }
                    />

                  </div>


                  {/* SUBMIT */}

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >

                    {submitting
                      ? "Assigning..."
                      : "Assign Task"}

                  </button>

                </form>

              </div>

            </div>

          </div>

        </div>

      )}

      {!evaluationsOnly && companyTasks.length > 0 && <div className="card shadow-sm mt-5"><div className="card-body"><h4 className="fw-bold mb-3">Task Submissions & Review</h4><input className="form-control mb-3" placeholder="Search tasks, interns, internship, or status?" value={taskSearch} onChange={(event) => setTaskSearch(event.target.value)} /><div className="row g-3 mb-4">{progressGroups.map((group) => <div className="col-md-6" key={`${group.student}-${group.internship}`}><div className="bg-light rounded p-3"><strong>{group.student}</strong><div className="small text-muted">{group.internship}</div><div className="mt-2">Verified progress: {group.approved} / {group.total} ({Math.round(group.approved / group.total * 100)}%)</div></div></div>)}</div><div className="row g-3">{companyTasks.filter((item) => [item.task.title,item.task.description,item.student_name,item.internship_title,item.task.status].join(" ").toLowerCase().includes(taskSearch.toLowerCase())).map(({ task, submission, history = [], student_name, internship_title }) => <div className="col-lg-6" key={task.id}><div className="border rounded p-3 h-100"><div className="d-flex justify-content-between"><strong>{task.title}</strong><span className={`badge ${task.status === "approved" ? "bg-success" : task.status === "changes_required" ? "bg-warning text-dark" : "bg-info text-dark"}`}>{task.status.replaceAll("_", " ")}</span></div><div className="small text-muted">{student_name} · {internship_title} · Due {task.due_date || "No due date"}</div>{submission ? <><hr/><p className="mb-2"><strong>Submitted:</strong> {new Date(submission.submitted_at).toLocaleString()}</p><p>{submission.submission_description}</p>{submission.evidence_file_name && <><p className="small mb-1">{submission.evidence_file_name} · {Math.ceil(submission.evidence_file_size / 1024)} KB</p><p className="small text-break"><strong>SHA-256:</strong> {submission.evidence_file_hash}</p><button className="btn btn-sm btn-outline-primary mb-3 me-2" onClick={() => downloadEvidence(submission)}>Download evidence</button><button className="btn btn-sm btn-outline-secondary mb-3" onClick={() => verifyEvidence(submission)}>Verify file integrity</button></>}<p className="small text-muted">SHA-256 is an integrity fingerprint; it does not prove authorship.</p>{submission.github_url && <p><a href={submission.github_url} target="_blank" rel="noreferrer">GitHub repository</a></p>}{submission.live_url && <p><a href={submission.live_url} target="_blank" rel="noreferrer">Live project</a></p>}{submission.review_comment && <div className="alert alert-warning">Previous feedback: {submission.review_comment}</div>}{submission.reviewed_by && <p className="small text-muted">Reviewed by your company on {new Date(submission.reviewed_at).toLocaleString()}</p>}{submission.status === "under_review" && <div className="d-flex gap-2"><button className="btn btn-success btn-sm" disabled={reviewBusy} onClick={() => reviewSubmission(submission, "approved")}>Approve Task</button><button className="btn btn-outline-warning btn-sm" disabled={reviewBusy} onClick={() => reviewSubmission(submission, "changes_required")}>Request Changes</button></div>}</> : <p className="text-muted mb-0 mt-2">No submission yet.</p>}{history.length > 1 && <details className="mt-3"><summary>Submission history ({history.length})</summary>{history.map((record, i) => <div className="small border-top pt-2 mt-2" key={record.id}>Submission #{history.length - i} · {record.status.replaceAll("_", " ")} · {new Date(record.submitted_at).toLocaleString()}{record.review_comment && <div>{record.review_comment}</div>}</div>)}</details>}</div></div>)}</div></div></div>}

      <section className={`card shadow-sm ${evaluationsOnly ? "mt-0" : "mt-5"}`}><div className="card-body"><h4 className="fw-bold mb-2">Mentor Evaluations</h4><p className="text-muted">Submit an evaluation after reviewing the student’s internship work. The college retains final internship verification.</p>{acceptedStudents.length ? <><input className="form-control mb-3" placeholder="Search mentor evaluations by intern or internship" value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} /><div className="row g-3">{acceptedStudents.filter((item) => [item.student_name,item.roll_number,item.college,item.internship_title].join(" ").toLowerCase().includes(studentSearch.toLowerCase())).map((item) => <div className="col-lg-6" key={`${item.student_id}-${item.internship_id}`}><MentorEvaluationForm item={item} authHeaders={authHeaders} /></div>)}</div></> : <p className="mb-0">Evaluations become available when a student is accepted.</p>}</div></section>

    </div>
  );
}

function MentorEvaluationForm({ item, authHeaders }) {
  const [evaluation, setEvaluation] = useState("");
  const [rating, setRating] = useState("5");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/company/internships/${item.internship_id}/evaluation`, { method: "PUT", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ student_id: item.student_id, evaluation, rating: Number(rating) }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.detail || "Unable to submit evaluation.");
      setMessage("Evaluation submitted for college review.");
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  return <div className="border rounded p-3 h-100"><b>{item.internship_title}</b><div className="small text-muted mb-3">{item.student_name} · {item.college || "College"}</div>{item.evaluation_requested ? <form onSubmit={submit}><label className="form-label">Mentor evaluation for college review</label><textarea required minLength={10} className="form-control mb-3" rows="3" value={evaluation} onChange={(e) => setEvaluation(e.target.value)} /><label className="form-label">Rating</label><select className="form-select mb-3" value={rating} onChange={(e) => setRating(e.target.value)}>{[5,4,3,2,1].map((n) => <option key={n} value={n}>{n}/5</option>)}</select><button className="btn btn-primary btn-sm" disabled={busy}>{busy ? "Submitting…" : "Submit evaluation"}</button>{message && <div className="small mt-2" role="status">{message}</div>}</form> : <p className="text-muted mb-0">Waiting for the college to request a mentor evaluation.</p>}</div>;
}

export default CompanyTasks;

